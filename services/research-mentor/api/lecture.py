"""Experimental lecture tutor. Separate from frozen Research Mentor reasoning and benchmarks."""
import hashlib,hmac,json,base64
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from student_access import TOKEN_SHA256,EXPIRES_AT
from mednote_access import mednote_request
from v1server.provider import Provider
from v1server.contracts import MentorError,require,string
from study_routing import run_study

from lecture_workflow import prepare_lecture, validate, SlideTransport

class handler(BaseHTTPRequestHandler):
    def reply(self,status,data):
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(json.dumps(data,ensure_ascii=False).encode())
    def do_POST(self):
        auth=self.headers.get('Authorization','')
        trusted=mednote_request(self.headers)
        if not trusted and (not auth.startswith('Bearer ') or not hmac.compare_digest(hashlib.sha256(auth[7:].encode()).hexdigest(),TOKEN_SHA256)):return self.reply(401,{'error':'INVITE_REQUIRED'})
        if not trusted and datetime.now(timezone.utc)>=datetime.fromisoformat(EXPIRES_AT):return self.reply(410,{'error':'EXPERIMENT_ENDED'})
        try:
            length=int(self.headers.get('Content-Length','0'));require(0<length<=3000000,'Invalid size')
            data=json.loads(self.rfile.read(length))
            explain=prepare_lecture(data)
            self.reply(200,run_study(self.headers,explain,module='lecture'))
        except MentorError as e:self.reply(e.status,{'error':e.code})
        except (ValueError,TypeError):self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception:self.reply(500,{'error':'INTERNAL_ERROR'})
    def do_GET(self):self.reply(405,{'error':'METHOD_NOT_ALLOWED'})
    def log_message(self,*args):pass
