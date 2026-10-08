"""Protected browser boundary for durable lecture jobs."""
import asyncio
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from server import lecture_jobs as jobs

class handler(BaseHTTPRequestHandler):
    def reply(self,status,data):
        raw=json.dumps(data,ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.end_headers()
        self.wfile.write(raw)

    def identity(self):
        origin=self.headers.get('Origin')
        if origin and urlparse(origin).netloc!=self.headers.get('Host'):
            raise jobs.JobError(403,'FORBIDDEN')
        if self.headers.get('Sec-Fetch-Site')=='cross-site':
            raise jobs.JobError(403,'FORBIDDEN')
        if os.environ.get('VERCEL_ENV')!='preview' or not self.headers.get('x-vercel-oidc-token'):
            raise jobs.JobError(503,'PREVIEW_IDENTITY_UNAVAILABLE')

    def execute(self,method):
        try:
            self.identity()
            if not jobs.configured():raise jobs.JobError(503,'DATABASE_NOT_CONFIGURED')
            args=parse_qs(urlparse(self.path).query)
            action=(args.get('action') or [''])[0]
            token=self.headers.get('X-MedNote-Job-Token','')
            if method=='GET':
                if action!='status':raise jobs.JobError(405,'METHOD_NOT_ALLOWED')
                return self.reply(200,jobs.status((args.get('id') or [''])[0],token))
            if method!='POST':raise jobs.JobError(405,'METHOD_NOT_ALLOWED')
            n=int(self.headers.get('Content-Length','0'))
            if n<=0 or n>2200000:raise jobs.JobError(413,'REQUEST_TOO_LARGE')
            if self.headers.get('Content-Type','').split(';')[0]!='application/json':
                raise jobs.JobError(400,'INVALID_REQUEST')
            payload=json.loads(self.rfile.read(n))
            if not isinstance(payload,dict):raise jobs.JobError(400,'INVALID_REQUEST')
            if action=='create':return self.reply(201,jobs.create(payload.get('title'),payload.get('total_pages')))
            job_id=payload.get('job_id')
            if action=='page':
                return self.reply(200,jobs.append_page(job_id,token,payload.get('page')))
            if action=='start':
                # The DB write completes before dispatching. Failed dispatches can
                # be retried via the same authenticated start request.
                jobs.start(job_id,token)
                from vercel.queue import send
                asyncio.run(send('mednote-lecture-jobs',{'job_id':job_id}))
                return self.reply(202,{'job_id':job_id,'phase':'queued'})
            raise jobs.JobError(400,'INVALID_ACTION')
        except jobs.JobError as e:return self.reply(e.status,{'error':e.code})
        except (ValueError,TypeError):return self.reply(400,{'error':'INVALID_REQUEST'})
        except Exception as e:
            print(json.dumps({'event':'lecture_jobs_error','type':type(e).__name__}),flush=True)
            return self.reply(503,{'error':'JOB_SERVICE_UNAVAILABLE'})
    def do_GET(self):return self.execute('GET')
    def do_POST(self):return self.execute('POST')
    def log_message(self,*args):pass
