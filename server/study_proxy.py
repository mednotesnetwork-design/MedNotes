"""Same-origin private-preview boundary; all AI calls run server-side in MedNote."""
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse
from server.study_service import execute_study, MentorError

class StudyProxy(BaseHTTPRequestHandler):
    upstream='student'
    def reply(self,status,data):
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        if status==429:self.send_header('Retry-After','60')
        self.end_headers()
        self.wfile.write(json.dumps(data,ensure_ascii=False).encode())
    def do_POST(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):return self.reply(403,{'error':'FORBIDDEN'})
        if self.headers.get('Sec-Fetch-Site')=='cross-site':return self.reply(403,{'error':'FORBIDDEN'})
        # Preserve private preview protection. Runtime identity is never sent to AI providers.
        if os.environ.get('VERCEL_ENV')!='preview' or not self.headers.get('x-vercel-oidc-token'):
            return self.reply(503,{'error':'PREVIEW_IDENTITY_UNAVAILABLE'})
        try:
            n=int(self.headers.get('Content-Length','0'))
            if n>3000000:return self.reply(413,{'error':'REQUEST_TOO_LARGE'})
            if n<=0 or self.headers.get('Content-Type','').split(';')[0]!='application/json':return self.reply(400,{'error':'INVALID_REQUEST'})
            data=json.loads(self.rfile.read(n))
            return self.reply(200,execute_study(self.upstream,data))
        except MentorError as error:return self.reply(error.status,{'error':error.code})
        except (ValueError,TypeError):return self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception as error:
            print(json.dumps({'event':'study_internal_error','type':type(error).__name__}),flush=True)
            return self.reply(503,{'error':'SERVICE_UNAVAILABLE'})
    def do_GET(self):self.reply(405,{'error':'METHOD_NOT_ALLOWED'})
    def log_message(self,*args):pass
