"""Existing reviewed engines, invoked in MedNote's server runtime."""
import json
import sys
from copy import deepcopy
from pathlib import Path
SERVICE=Path(__file__).resolve().parents[1]/'services'/'research-mentor'
if str(SERVICE) not in sys.path:sys.path.insert(0,str(SERVICE))
from v1server.contracts import MentorError,require,string,empty_state,validate_patch
from v1server.engine import Engine
from lecture_workflow import prepare_lecture
from study_routing import run_study

def execute_study(module,data):
    require(isinstance(data,dict),'Invalid request')
    if module=='lecture':return run_study({},prepare_lecture(data),module='lecture')
    require(module=='student','Invalid module')
    require(len(json.dumps(data).encode())<=100000,'Research request too large','REQUEST_TOO_LARGE',413)
    text=string(data.get('input'),'input')
    mode=data.get('mode','mentor');require(mode in ('mentor','translate','appraise','coach'),'Invalid mode')
    state=empty_state();state.update(validate_patch(data.get('research_state',{})))
    history=data.get('conversation',[])
    require(isinstance(history,list) and len(history)<=12,'Invalid history')
    require(all(isinstance(t,dict) and set(t)=={'role','content'} and t['role'] in ('user','assistant') and isinstance(t['content'],str) and len(t['content'])<=24000 for t in history),'Invalid history')
    result=run_study({},lambda p:Engine(p).answer(text,deepcopy(state),deepcopy(history),mode=mode,papers=[]),module='research')
    result.update(experimental=True,baseline='REAL-ENGINE BASELINE V1',evaluation_record=False)
    return result
