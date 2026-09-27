"""Independent fallback inside the existing MedNote deployment. No browser secrets."""
import sys,time,json
from copy import deepcopy
from pathlib import Path
SERVICE=Path(__file__).resolve().parents[1]/'services'/'research-mentor'
if str(SERVICE) not in sys.path:sys.path.append(str(SERVICE))
from study_routing import gateway_provider
from lecture_workflow import prepare_lecture
from v1server.engine import Engine
from v1server.contracts import MentorError,require,string,empty_state,validate_patch

def fallback(upstream,body,headers,deadline):
    data=json.loads(body)
    require(isinstance(data,dict),'Invalid request')
    if upstream=='lecture':execute=prepare_lecture(data)
    else:
        require(len(body)<=100000,'Invalid size')
        text=string(data.get('input'),'input');mode=data.get('mode','mentor')
        require(mode in ('mentor','translate','appraise','coach'),'Invalid mode')
        state=empty_state();state.update(validate_patch(data.get('research_state',{})))
        require(state['student_level'] in ('beginner','medical_student','advanced_student','researcher'),'Invalid level')
        history=data.get('conversation',[])
        require(isinstance(history,list) and len(history)<=12,'Invalid history')
        require(all(isinstance(t,dict) and set(t)=={'role','content'} and t['role'] in ('user','assistant') and isinstance(t['content'],str) and len(t['content'])<=24000 for t in history),'Invalid history')
        execute=lambda p:Engine(p).answer(text,deepcopy(state),deepcopy(history),mode=mode,papers=[])
    print(json.dumps({'event':'study_failover','from':'gemini','to':'openai/gpt-5.4-mini'}),flush=True)
    provider=gateway_provider(headers,deadline)
    result=execute(provider)
    result.update(experimental=True,evaluation_record=False,provider_routing={'failover_used':True,'model':provider.config['model']})
    print(json.dumps({'event':'study_completed','model':provider.config['model'],'failover_used':True,'calls':len(provider.calls)}),flush=True)
    return result
