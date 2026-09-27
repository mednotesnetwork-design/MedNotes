"""Same-origin MedNote preview boundary. Uses Vercel workload identity, no invitation UI."""
import json,os,time,socket
from http.server import BaseHTTPRequestHandler
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError,URLError
from urllib.parse import urlparse
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
class StudyProxy(BaseHTTPRequestHandler):
    upstream='student'
    def reply(self,status,data):
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(json.dumps(data,ensure_ascii=False).encode())
    def use_fallback(self,body,deadline):
        from server.gateway_fallback import fallback, MentorError
        try:return self.reply(200,fallback(self.upstream,body,self.headers,deadline))
        except MentorError as e:return self.reply(e.status,{'error':e.code})
        except Exception:return self.reply(503,{'error':'SERVICE_UNAVAILABLE'})
    def do_POST(self):
        deadline=time.monotonic()+250
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.reply(403,{'error':'FORBIDDEN'})
        if self.headers.get('Sec-Fetch-Site')=='cross-site':return self.reply(403,{'error':'FORBIDDEN'})
        identity=self.headers.get('x-vercel-oidc-token','')
        if os.environ.get('VERCEL_ENV')!='preview' or not identity:return self.reply(503,{'error':'PREVIEW_IDENTITY_UNAVAILABLE'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n>3000000:return self.reply(413,{'error':'REQUEST_TOO_LARGE'})
            if n<=0 or self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.reply(400,{'error':'INVALID_REQUEST'})
            body=self.rfile.read(n)
            if not isinstance(json.loads(body),dict):return self.reply(400,{'error':'INVALID_REQUEST'})
            request=Request('https://research-mentor-nine.vercel.app/api/'+self.upstream,data=body,headers={'X-MedNote-Identity':identity,'Content-Type':'application/json'},method='POST')
            with build_opener(NoRedirect()).open(request,timeout=30) as response:return self.reply(200,json.loads(response.read(1000000)))
        except HTTPError as e:
            try:data=json.loads(e.read(10000))
            except Exception:data={'error':'SERVICE_UNAVAILABLE'}
            if e.code in (429,502,503,504) and data.get('error') in ('PROVIDER_BUSY','PROVIDER_UNAVAILABLE','SERVICE_UNAVAILABLE'):
                return self.use_fallback(body,deadline)
            return self.reply(e.code if e.code in (400,401,402,403,410,413,422,429,502,503,504) else 502,data)
        except (URLError,TimeoutError,socket.timeout):return self.use_fallback(body,deadline)
        except (ValueError,TypeError):return self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception:return self.reply(503,{'error':'SERVICE_UNAVAILABLE'})
    def do_GET(self):self.reply(405,{'error':'METHOD_NOT_ALLOWED'})
    def log_message(self,*args):pass
