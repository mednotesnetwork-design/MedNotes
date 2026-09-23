"""Same-origin MedNote boundary; forwards a student's invitation, never a provider key."""
import json
from http.server import BaseHTTPRequestHandler
from urllib.request import Request,build_opener,HTTPRedirectHandler
from urllib.error import HTTPError
from urllib.parse import urlparse
class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs):return None
class StudyProxy(BaseHTTPRequestHandler):
    upstream='student'
    def reply(self,status,data):
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(json.dumps(data,ensure_ascii=False).encode())
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.reply(403,{'error':'FORBIDDEN'})
        auth=self.headers.get('Authorization','')
        if not auth.startswith('Bearer ') or len(auth)>300:return self.reply(401,{'error':'INVITE_REQUIRED'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if not 0<n<=100000 or self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.reply(400,{'error':'INVALID_REQUEST'})
            body=self.rfile.read(n);json.loads(body)
            request=Request('https://research-mentor-nine.vercel.app/api/'+self.upstream,data=body,headers={'Authorization':auth,'Content-Type':'application/json'},method='POST')
            with build_opener(NoRedirect()).open(request,timeout=275) as response:
                data=json.loads(response.read(1000000));return self.reply(200,data)
        except HTTPError as e:
            try:data=json.loads(e.read(10000))
            except Exception:data={'error':'SERVICE_UNAVAILABLE'}
            return self.reply(e.code if e.code in (400,401,403,410,422,429,502,503,504) else 502,data)
        except (ValueError,TypeError):return self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception:return self.reply(503,{'error':'SERVICE_UNAVAILABLE'})
    def do_GET(self):self.reply(405,{'error':'METHOD_NOT_ALLOWED'})
    def log_message(self,*args):pass
