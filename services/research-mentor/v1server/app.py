"""Local-owner WSGI application. Bind loopback only; not a public multi-user deployment."""
import hashlib,hmac,json,os,secrets,uuid,time,threading,shutil
from pathlib import Path
from http.cookies import SimpleCookie
from urllib.parse import urlparse
from wsgiref.simple_server import make_server,WSGIRequestHandler
from .contracts import MentorError,require,string,empty_state,validate_patch,VERSION
from .provider import Provider
from .state import Store,now
from .engine import Engine
from .modules import workflow_hash
from . import evidence

ROOT=Path(__file__).resolve().parents[1]

class Application:
    def __init__(self,runtime=None,provider_factory=None):
        self.runtime=Path(runtime or os.environ.get('RESEARCH_MENTOR_DATA',ROOT/'.runtime'))
        self.runtime.mkdir(parents=True,exist_ok=True,mode=0o700); self.runtime.chmod(0o700)
        self.store=Store(self.runtime/'research.sqlite3')
        self.secret=self.private_secret('session-signing.key')
        self.eval_token=self.private_secret('evaluation-token').decode()
        self.config_path=Path(os.environ.get('RESEARCH_MENTOR_CONFIG',self.runtime/'inference.json'))
        self.provider_factory=provider_factory or (lambda:Provider(self.config_path))
        self.testing=provider_factory is not None
        self.freeze_lock=threading.Lock()
        self.request_lock=threading.Lock()
        self.last_request={}

    def private_secret(self,name):
        p=self.runtime/name
        try:
            fd=os.open(p,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
            with os.fdopen(fd,'w') as f:f.write(secrets.token_urlsafe(40))
        except FileExistsError:pass
        return p.read_bytes()

    def signed_session(self):
        owner=secrets.token_hex(24); signature=hmac.new(self.secret,owner.encode(),hashlib.sha256).hexdigest()
        return owner+'.'+signature

    def session_owner(self,cookie):
        try:
            c=SimpleCookie(); c.load(cookie); value=c['rm_session'].value
            owner,sig=value.split('.')
            require(len(owner)==48 and hmac.compare_digest(hmac.new(self.secret,owner.encode(),hashlib.sha256).hexdigest(),sig),'Session invalid','UNAUTHORIZED',401)
            return owner
        except Exception: raise MentorError('UNAUTHORIZED','Open Research Mentor locally to start a session.',401)

    def csrf(self,owner):return hmac.new(self.secret,('csrf:'+owner).encode(),hashlib.sha256).hexdigest()

    def freeze(self,provider):
        if self.testing:return 'test_fixture_no_scientific_baseline'
        identity={'version':'REAL-ENGINE-BASELINE-V1','workflow_hash':workflow_hash(),**provider.identity()}
        target=self.runtime/'real-engine-baseline-v1'
        with self.freeze_lock:
            if target.exists():
                existing=json.loads((target/'manifest.json').read_text())
                require(existing['identity']==identity,'The frozen V1 configuration changed. Use an explicit experiment branch; do not overwrite V1.','BASELINE_CHANGED',409)
            else:
                temporary=self.runtime/('baseline-staging-'+uuid.uuid4().hex); temporary.mkdir(mode=0o700)
                # Baseline code and nonsecret provider identity frozen BEFORE first call.
                shutil.copytree(ROOT/'server',temporary/'server',ignore=shutil.ignore_patterns('__pycache__'))
                shutil.copytree(ROOT/'app',temporary/'app')
                (temporary/'manifest.json').write_text(json.dumps({'identity':identity,'frozen_at':now(),'evaluation_status':'not_yet_evaluated'},indent=2))
                temporary.rename(target)
        return identity['version']

    def connection_verified(self,provider):
        marker=self.runtime/'real-engine-baseline-v1'/'connection-verified.json'
        if self.testing or not provider.available or not marker.exists():return False
        try:
            result=json.loads(marker.read_text())
            return result['provider']==provider.identity() and result['workflow_hash']==workflow_hash()
        except (KeyError,ValueError):return False

    def record_connection(self,provider):
        if self.testing:return
        require(bool(provider.calls),'No real provider calls recorded','PROVIDER_FAILURE',502)
        target=self.runtime/'real-engine-baseline-v1'/'connection-verified.json'
        record={'verified_at':now(),'provider':provider.identity(),'workflow_hash':workflow_hash(),
                'calls':provider.calls,'status':'real_inference_and_scientific_review_completed',
                'scientific_benchmark_status':'not_graded'}
        try:
            with target.open('x') as f:json.dump(record,f,indent=2)
        except FileExistsError:pass

    def __call__(self,environ,start_response):
        extra=[]
        try:
            remote=environ.get('REMOTE_ADDR','')
            require(remote in ('127.0.0.1','::1'),'This build serves the local owner only; public deployment needs an authenticated hosting adapter.','LOCAL_ONLY',403)
            host=environ.get('HTTP_HOST','')
            require(urlparse('http://'+host).hostname in ('localhost','127.0.0.1','::1'),'Invalid Host','BAD_HOST',403)
            origin=environ.get('HTTP_ORIGIN')
            require(not origin or origin in ('http://'+host,'https://'+host),'Cross-origin requests are not accepted','BAD_ORIGIN',403)
            require(environ.get('HTTP_SEC_FETCH_SITE','none') in ('same-origin','none'),'Cross-site requests are not accepted','BAD_ORIGIN',403)
            method=environ['REQUEST_METHOD']; path=environ.get('PATH_INFO','/')
            if method=='GET' and path in ('/','/index.html','/client.js'):
                filename='client.js' if path=='/client.js' else 'index.html'
                if filename=='index.html':
                    try:self.session_owner(environ.get('HTTP_COOKIE',''))
                    except MentorError:extra.append(('Set-Cookie','rm_session='+self.signed_session()+'; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000'))
                return self.respond(start_response,200,(ROOT/'app'/filename).read_bytes(),'application/javascript' if filename.endswith('.js') else 'text/html; charset=utf-8',extra)
            if method=='GET' and path=='/api/health':
                p=self.provider_factory()
                return self.respond(start_response,200,{'application_version':VERSION,'inference_configured':p.available,'inference_tested':self.connection_verified(p),
                    'evidence_providers':['pubmed','crossref'],'evidence_live_status':'check using search; availability can change','scientific_validation':'pending'})
            owner=self.session_owner(environ.get('HTTP_COOKIE','')) if not environ.get('HTTP_AUTHORIZATION') else 'evaluation'
            if owner=='evaluation':
                require(hmac.compare_digest(environ.get('HTTP_AUTHORIZATION',''),'Bearer '+self.eval_token),'Invalid evaluation token','UNAUTHORIZED',401)
                require(path=='/api/mentor' and method=='POST','Evaluation token is limited to isolated inference','FORBIDDEN',403)
            if method=='GET' and path=='/api/session':return self.respond(start_response,200,{'csrf':self.csrf(owner),'projects':self.store.list(owner)})
            require(method=='POST','Route not found','NOT_FOUND',404)
            require(environ.get('CONTENT_TYPE','').split(';')[0]=='application/json','Use application/json','INVALID_CONTENT_TYPE',415)
            if owner!='evaluation': require(hmac.compare_digest(environ.get('HTTP_X_CSRF_TOKEN',''),self.csrf(owner)),'Invalid request token','CSRF_FAILED',403)
            try:length=int(environ.get('CONTENT_LENGTH','0'))
            except Exception:raise MentorError('INVALID_REQUEST','Invalid content length')
            require(0<length<=150000,'Request too large or empty','INVALID_REQUEST',413)
            try:body=json.loads(environ['wsgi.input'].read(length))
            except Exception:raise MentorError('INVALID_REQUEST','Request must contain valid JSON')
            require(isinstance(body,dict),'Request must be an object')
            response=self.route(path,body,owner)
            return self.respond(start_response,200,response)
        except MentorError as e:return self.respond(start_response,e.status,{'error':{'code':e.code,'message':e.message}})
        except Exception:return self.respond(start_response,500,{'error':{'code':'INTERNAL_ERROR','message':'The operation failed. No unreviewed answer was published.'}})

    def route(self,path,b,owner):
        if path=='/api/projects/create':return self.store.create(owner)
        if path=='/api/projects/get':return {**self.store.get(owner,b.get('project_id')),'papers':self.store.papers(owner,b.get('project_id')),'history':self.store.history(owner,b.get('project_id'))}
        if path=='/api/projects/update':return self.store.patch(owner,b.get('project_id'),b.get('expected_version'),b.get('patch'))
        if path=='/api/evidence/search':
            self.store.get(owner,b.get('project_id'))
            papers=evidence.search(b.get('query'),b.get('source','pubmed'),b.get('limit',3))
            for p in papers:self.store.save_paper(owner,b['project_id'],p)
            return {'papers':papers,'verification_scope':'bibliographic identity; study fields await appraisal'}
        if path=='/api/evidence/verify':
            self.store.get(owner,b.get('project_id'))
            p=evidence.pubmed(string(b.get('pmid'),'PMID',10)) if b.get('pmid') else evidence.crossref(string(b.get('doi'),'DOI',300))
            self.store.save_paper(owner,b['project_id'],p); return {'paper':p}
        require(path=='/api/mentor','Route not found','NOT_FOUND',404)
        text=string(b.get('input'),'input',18000); mode=b.get('mode','mentor')
        require(mode in ('mentor','translate','coach','appraise','claim'),'Unsupported mode')
        if owner!='evaluation':
            cached=self.store.cached_request(owner,b.get('request_id'),b)
            if cached:return cached
        p=self.provider_factory()
        require(p.available,'Set GEMINI_API_KEY in the server environment or private gemini.env. No model call was made.','INFERENCE_NOT_CONFIGURED',503)
        # Rate/concurrency limits prevent unbounded repeated billable calls.
        with self.request_lock:
            t=time.monotonic()
            require(t-self.last_request.get(owner,-100)>1,'Please wait before the next request','RATE_LIMITED',429)
            self.last_request[owner]=t
        baseline=self.freeze(p)
        if owner=='evaluation':
            require(b.get('evaluation') is True,'Evaluation requests must declare evaluation=true')
            state=empty_state(); state.update(validate_patch(b.get('research_state',{})))
            state['student_level']=b.get('student_level','medical_student')
            require(state['student_level'] in ('beginner','medical_student','advanced_student','researcher'),'Invalid student level')
            reply=Engine(p).answer(text,state,[],mode,[])
            self.record_connection(p)
            return {**reply,'baseline':baseline,'evaluation':True}
        project=self.store.get(owner,b.get('project_id'))
        require(type(b.get('expected_version')) is int and b['expected_version']==project['version'],'Research state changed; reload before asking','STATE_CONFLICT',409)
        ids=b.get('source_ids',[])
        require(isinstance(ids,list) and len(ids)<=5 and all(isinstance(x,str) for x in ids),'Choose up to five retrieved sources')
        papers=[self.store.paper(owner,project['id'],x) for x in ids]
        if mode=='claim':require(bool(papers),'Select a retrieved paper for claim verification','SOURCE_REQUIRED',422)
        request_id=b.get('request_id')
        cached=self.store.begin_request(owner,request_id,b)
        if cached:return cached
        try:
            response=Engine(p).answer(text,project['state'],self.store.history(owner,project['id']),mode,papers)
            self.record_connection(p)
            response['baseline']=baseline
            return self.store.finish(owner,request_id,project['id'],project['version'],text,response)
        except Exception:
            self.store.fail(owner,request_id); raise

    def respond(self,start,status,data,content_type='application/json',extra=None):
        body=data if isinstance(data,bytes) else json.dumps(data,ensure_ascii=False).encode()
        headers=[('Content-Type',content_type),('Content-Length',str(len(body))),('Cache-Control','no-store'),('X-Content-Type-Options','nosniff'),
                 ('Referrer-Policy','no-referrer'),('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")]+(extra or [])
        labels={200:'OK',400:'Bad Request',401:'Unauthorized',403:'Forbidden',404:'Not Found',409:'Conflict',413:'Payload Too Large',415:'Unsupported Media Type',422:'Unprocessable Content',429:'Too Many Requests',500:'Internal Server Error',502:'Bad Gateway',503:'Service Unavailable'}
        start(f'{status} {labels.get(status,"Error")}',headers);return [body]

class QuietHandler(WSGIRequestHandler):
    def log_message(self,*args): pass

def main():
    os.umask(0o077)
    app=Application(); port=int(os.environ.get('RESEARCH_MENTOR_PORT','8765'))
    print(f'Research Mentor local backend: http://127.0.0.1:{port} — inference '+('configured' if app.provider_factory().available else 'awaiting private configuration'),flush=True)
    with make_server('127.0.0.1',port,app,handler_class=QuietHandler) as server:server.serve_forever()

if __name__=='__main__':main()
