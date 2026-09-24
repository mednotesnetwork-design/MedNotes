"""Invitation-only experimental student adapter, pinned to frozen V1 source."""
import hashlib,hmac,json
from copy import deepcopy
from datetime import datetime,timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
from student_access import TOKEN_SHA256, EXPIRES_AT
from mednote_access import mednote_request
from v1server.provider import Provider
from v1server.engine import Engine
from v1server.contracts import MentorError,require,string,empty_state,validate_patch
from server.resilience import TrackedTransport

class handler(BaseHTTPRequestHandler):
    def reply(self,status,data):
        self.send_response(status);self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(json.dumps(data,ensure_ascii=False).encode())
    def do_POST(self):
        auth=self.headers.get('Authorization','')
        trusted=mednote_request(self.headers)
        if not trusted and (not auth.startswith('Bearer ') or not hmac.compare_digest(hashlib.sha256(auth[7:].encode()).hexdigest(),TOKEN_SHA256)):return self.reply(401,{'error':'INVITE_REQUIRED'})
        if not trusted and datetime.now(timezone.utc)>=datetime.fromisoformat(EXPIRES_AT):return self.reply(410,{'error':'EXPERIMENT_ENDED'})
        try:
            origin=self.headers.get('Origin')
            require(not origin or urlparse(origin).netloc==self.headers.get('Host'),'Cross-origin request rejected','FORBIDDEN',403)
            length=int(self.headers.get('Content-Length','0'));require(0<length<=100000,'Invalid request size')
            require(self.headers.get('Content-Type','').split(';')[0]=='application/json','JSON required')
            data=json.loads(self.rfile.read(length));require(isinstance(data,dict),'Invalid request')
            text=string(data.get('input'),'input');mode=data.get('mode','mentor');require(mode in ('mentor','translate','appraise','coach'),'Invalid mode')
            state=empty_state();state.update(validate_patch(data.get('research_state',{})))
            require(state['student_level'] in ('beginner','medical_student','advanced_student','researcher'),'Invalid level')
            history=data.get('conversation',[]);require(isinstance(history,list) and len(history)<=12,'Invalid history')
            require(all(isinstance(t,dict) and set(t)=={'role','content'} and t['role'] in ('user','assistant') and isinstance(t['content'],str) and len(t['content'])<=24000 for t in history),'Invalid history')
            p=Provider(Path('/nonexistent-research-mentor-config/inference.json'));require(p.available,'Inference unavailable','PROVIDER_UNAVAILABLE',503)
            p.opener=TrackedTransport(p.opener,p.config['api_key'])
            response=Engine(p).answer(text,deepcopy(state),history,mode=mode,papers=[])
            response.update(experimental=True,baseline='REAL-ENGINE BASELINE V1',evaluation_record=False)
            return self.reply(200,response)
        except MentorError as e:return self.reply(e.status,{'error':e.code})
        except (ValueError,TypeError):return self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception:return self.reply(500,{'error':'INTERNAL_ERROR'})
    def do_GET(self):self.reply(405,{'error':'METHOD_NOT_ALLOWED'})
    def log_message(self,*args):pass
