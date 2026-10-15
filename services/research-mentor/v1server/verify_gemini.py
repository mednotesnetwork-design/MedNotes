"""One real request through the same WSGI endpoint; no secrets in output."""
import io,json,sys
from .app import Application
from .gemini_config import ENDPOINT,MODEL

def main():
    app=Application();provider=app.provider_factory()
    if not provider.available:
        print('GEMINI_API_KEY is not configured on this server. No inference or V1 verification performed.');return 2
    if provider.config['endpoint']!=ENDPOINT or provider.config['model']!=MODEL:
        print('Another provider configuration is active. Review it before Gemini activation.');return 2
    payload={'input':'Explain briefly why measuring exposure and outcome at the same time can leave the direction of an association uncertain.','mode':'mentor','student_level':'medical_student','evaluation':True}
    body=json.dumps(payload).encode();status=[]
    env={'REQUEST_METHOD':'POST','PATH_INFO':'/api/mentor','REMOTE_ADDR':'127.0.0.1','HTTP_HOST':'127.0.0.1','CONTENT_TYPE':'application/json','CONTENT_LENGTH':str(len(body)),'wsgi.input':io.BytesIO(body),'HTTP_AUTHORIZATION':'Bearer '+app.eval_token}
    response=json.loads(b''.join(app(env,lambda s,h:status.append(s))))
    if not status[0].startswith('200'):
        print(json.dumps({'status':status[0],'error':response.get('error'),'verified':False}));return 1
    print(json.dumps({'status':'verified','baseline':response['baseline'],'model':response['model'],'answer':response['answer'],'scientific_benchmark_status':'not_graded'},ensure_ascii=False,indent=2));return 0
if __name__=='__main__':sys.exit(main())
