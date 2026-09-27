"""Boundary and image-context tests; no live provider calls or credentials."""
import base64,importlib.util,json,sys,time,unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch
import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'services/research-mentor'))
import mednote_access

def load(name,path):
    spec=importlib.util.spec_from_file_location(name,path);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
lecture=load('lecture_api',ROOT/'services/research-mentor/api/lecture.py')
proxy=load('mednote_proxy',ROOT/'server/study_proxy.py')

class IdentityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
    def token(self,**changes):
        now=int(time.time());claims=dict(iss=mednote_access.ISSUERS[0],aud='https://vercel.com/med-notes',exp=now+60,iat=now,nbf=now-1,sub='owner:med-notes:project:med-notes:environment:preview',project_id='prj_dT9NAYLBPnEoycEcHwubhYuqLTtn',owner_id='team_AFVDGm6j1rt0LhzRVtjltMgN',environment='preview');claims.update(changes)
        return jwt.encode(claims,self.key,algorithm='RS256')
    def check(self,token):
        with patch.object(mednote_access.CLIENTS[mednote_access.ISSUERS[0]],'get_signing_key_from_jwt',return_value=SimpleNamespace(key=self.key.public_key())):
            return mednote_access.mednote_request({'X-MedNote-Identity':token})
    def test_accepts_only_existing_preview(self):self.assertTrue(self.check(self.token()))
    def test_rejects_other_project_production_expiry_and_audience(self):
        for changes in [{'project_id':'another-project'},{'environment':'production'},{'exp':int(time.time())-1},{'aud':'someone-else'},{'owner_id':'another-team'}]:
            with self.subTest(changes=changes):self.assertFalse(self.check(self.token(**changes)))
    def test_rejects_missing_and_invalid_tokens(self):
        self.assertFalse(mednote_access.mednote_request({}));self.assertFalse(self.check('not-a-jwt'))
        token=self.token();parts=token.split('.');parts[1]=base64.urlsafe_b64encode(b'{"iss":"https://oidc.vercel.com/med-notes"}').decode().rstrip('=');self.assertFalse(self.check('.'.join(parts)))

class LessonTests(unittest.TestCase):
    def lesson(self):return dict(explanation='A visual explanation',high_yield=[],terms=[],clarifications=[],mechanism=[{'label':'Step one','source_quote':''}],questions=[],source_quotes=[])
    def test_visual_evidence_requires_an_image(self):
        self.assertEqual(lecture.validate(self.lesson(),'',True)['explanation'],'A visual explanation')
        with self.assertRaises(lecture.MentorError):lecture.validate(self.lesson(),'',False)
    def test_image_does_not_allow_fabricated_quotes(self):
        value=self.lesson();value['source_quotes']=['invented source']
        with self.assertRaises(lecture.MentorError):lecture.validate(value,'actual slide',True)
    def test_image_attached_as_binary_part_to_both_calls(self):
        captured=[]
        class Inner:
            def open(self,request,**kwargs):captured.append(json.loads(request.data));return 'response'
        from urllib.request import Request
        transport=lecture.SlideTransport(Inner(),'data:image/jpeg;base64,/9j/')
        for _ in range(2):
            request=Request('https://example.com',data=json.dumps({'contents':[{'role':'user','parts':[{'text':'question with history'}]}]}).encode())
            self.assertEqual(transport.open(request),'response')
        self.assertTrue(all(r['contents'][0]['parts'][1]=={'inlineData':{'mimeType':'image/jpeg','data':'/9j/'}} for r in captured))

class ProxyTests(unittest.TestCase):
    def fake(self,headers,body=b'{}'):
        from io import BytesIO
        h=object.__new__(proxy.StudyProxy);h.headers=headers;h.rfile=BytesIO(body);h.reply=lambda status,data:(status,data);return h
    def test_no_browser_invitation_is_required(self):
        h=self.fake({'Host':'preview.vercel.app','Origin':'https://preview.vercel.app','x-vercel-oidc-token':'workload','Content-Length':'2','Content-Type':'application/json'})
        class Response:
            def __enter__(self):return self
            def __exit__(self,*args):pass
            def read(self,*args):return b'{"answer":"ok"}'
        with patch.dict(proxy.os.environ,{'VERCEL_ENV':'preview'}),patch.object(proxy,'build_opener') as opener:
            opener.return_value.open.return_value=Response();self.assertEqual(h.do_POST()[0],200)
            request=opener.return_value.open.call_args.args[0];self.assertEqual(request.get_header('X-mednote-identity'),'workload');self.assertIsNone(request.get_header('Authorization'))
    def test_rejects_cross_origin_and_unidentified_runtime(self):
        self.assertEqual(self.fake({'Host':'preview.vercel.app','Origin':'https://other.example'}).do_POST()[0],403)
        with patch.dict(proxy.os.environ,{'VERCEL_ENV':'preview'}):self.assertEqual(self.fake({}).do_POST()[0],503)


class FailoverTests(unittest.TestCase):
    def provider(self):return SimpleNamespace(available=True,opener=None,config={'model':'test'},calls=[])
    def test_transient_restarts_workflow_with_fresh_provider(self):
        from study_routing import run_study
        primary=self.provider();alternate=self.provider();seen=[]
        def execute(p):
            seen.append(p)
            if p is primary:raise lecture.MentorError('PROVIDER_BUSY','busy',503)
            return {'answer':'reviewed'}
        result=run_study({},execute,primary_factory=lambda:primary,fallback_factory=lambda h,d:alternate)
        self.assertEqual(seen,[primary,alternate]);self.assertTrue(result['provider_routing']['failover_used'])
    def test_never_falls_back_after_scientific_or_json_rejection(self):
        from study_routing import run_study
        for code in ('LECTURE_REVIEW_FAILED','SCIENTIFIC_REVIEW_FAILED','PROVIDER_FAILURE'):
            def execute(p):raise lecture.MentorError(code,'rejected',422)
            with self.assertRaises(lecture.MentorError):
                run_study({},execute,primary_factory=self.provider,fallback_factory=lambda h,d:self.fail('must not route'))
    def test_caller_token_is_not_used_for_gateway_auth(self):
        from study_routing import gateway_provider
        with patch.dict('os.environ',{},clear=True),self.assertRaises(lecture.MentorError) as error:
            gateway_provider({'X-MedNote-Identity':'caller-token'},time.monotonic()+30)
        self.assertEqual(error.exception.code,'GATEWAY_ACCESS_REQUIRED')
    def test_first_inference_does_not_require_a_preexisting_credit_balance(self):
        import study_routing
        from io import BytesIO
        response={'choices':[{'finish_reason':'stop','message':{'content':'{"answer":"live"}'}}]}
        with patch.dict('os.environ',{},clear=True),patch.object(study_routing,'build_opener') as op:
            op.return_value.open.return_value=BytesIO(json.dumps(response).encode())
            provider=study_routing.gateway_provider({'x-vercel-oidc-token':'runtime-token'},time.monotonic()+30)
            op.return_value.open.assert_not_called()
            self.assertEqual(provider.complete('Return JSON',{'question':'test'}),{'answer':'live'})
            self.assertTrue(op.return_value.open.call_args.args[0].full_url.endswith('/chat/completions'))
    def test_actual_gateway_payment_rejection_stops_without_retry(self):
        import study_routing
        from urllib.error import HTTPError
        from urllib.request import Request
        from io import BytesIO
        inner=SimpleNamespace(open=lambda *a,**k: (_ for _ in ()).throw(HTTPError(study_routing.GATEWAY,402,'Payment required',{},BytesIO(b'{}'))))
        with self.assertRaises(lecture.MentorError) as error:
            study_routing.StudyTransport(inner,time.monotonic()+30,gateway=True).open(Request(study_routing.GATEWAY))
        self.assertEqual(error.exception.code,'GATEWAY_CREDITS_REQUIRED')
    def test_image_is_sent_to_gateway_generation_and_review(self):
        captured=[]
        class Inner:
            def open(self,r,**kwargs):captured.append(json.loads(r.data))
        from urllib.request import Request
        t=lecture.SlideTransport(Inner(),'data:image/jpeg;base64,/9j/')
        for phase in ('generation','review'):
            t.open(Request('https://example.com',data=json.dumps({'messages':[{'role':'user','content':phase}]}).encode()))
        self.assertTrue(all(x['messages'][0]['content'][1]['image_url']['url']=='data:image/jpeg;base64,/9j/' for x in captured))

if __name__=='__main__':unittest.main()
