"""Preview study failover. Restart the entire reviewed workflow on a fresh provider."""
import json, os, socket, time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import build_opener
from v1server.provider import Provider, NoRedirect
from v1server.contracts import MentorError, require

GATEWAY='https://ai-gateway.vercel.sh/v1'
FALLBACK_MODEL='openai/gpt-5-mini'

class StudyTransport:
    def __init__(self, inner, deadline, gateway=False):
        self.inner,self.deadline,self.gateway=inner,deadline,gateway
    def open(self, request, **kwargs):
        remaining=self.deadline-time.monotonic()
        require(remaining>1,'Request deadline reached','PROVIDER_BUSY',503)
        kwargs['timeout']=min(35 if self.gateway else 15,remaining)
        try:return self.inner.open(request,**kwargs)
        except HTTPError as error:
            status=error.code;error.close()
            print(json.dumps({'event':'study_provider_error','provider':'gateway' if self.gateway else 'gemini','status':status}),flush=True)
            if self.gateway and status==402:raise MentorError('GATEWAY_CREDITS_REQUIRED','Gateway balance unavailable',402)
            if self.gateway and status in (401,403):raise MentorError('GATEWAY_ACCESS_REQUIRED','Gateway access unavailable',503)
            if status in (408,429,500,502,503,504):raise MentorError('PROVIDER_BUSY','Temporary provider error',503)
            raise
        except (URLError,TimeoutError,socket.timeout):
            raise MentorError('PROVIDER_BUSY','Provider connection timed out',503)

def gateway_provider(headers,deadline):
    # This deployment's runtime identity, never the caller-supplied workload token.
    token=os.environ.get('AI_GATEWAY_API_KEY','').strip() or headers.get('x-vercel-oidc-token','') or os.environ.get('VERCEL_OIDC_TOKEN','').strip()
    require(bool(token),'Gateway identity unavailable','GATEWAY_ACCESS_REQUIRED',503)
    opener=StudyTransport(build_opener(NoRedirect()),deadline,gateway=True)
    # Let the inference endpoint decide eligibility. Free credits activate on the
    # first generation; a credits preflight can incorrectly reject new teams.
    # No billing, purchase, or auto-top-up endpoint is called here.
    provider=Provider.__new__(Provider)
    provider.config={'endpoint':GATEWAY+'/chat/completions','model':FALLBACK_MODEL,'api_key':token,'protocol':'chat-completions-json','sampling_parameters':{'max_completion_tokens':8192,'reasoning_effort':'medium'}}
    provider.calls=[];provider.opener=opener
    return provider

def run_study(headers,execute,*,allow_failover=True,primary_factory=None,fallback_factory=gateway_provider):
    deadline=time.monotonic()+240
    primary=(primary_factory or (lambda:Provider(Path('/nonexistent-research-mentor-config/inference.json'))))()
    require(primary.available,'Primary provider not configured','PROVIDER_UNAVAILABLE',503)
    primary.opener=StudyTransport(primary.opener,deadline)
    try:
        result=execute(primary);used=primary;fallback=False
    except MentorError as error:
        # Never retry validation, unsafe output, or scientific rejection on another model.
        if not allow_failover or error.code!='PROVIDER_BUSY':raise
        print(json.dumps({'event':'study_failover','from':'gemini','to':FALLBACK_MODEL}),flush=True)
        used=fallback_factory(headers,deadline)
        result=execute(used);fallback=True
    result['provider_routing']={'failover_used':fallback,'model':used.config['model']}
    print(json.dumps({'event':'study_completed','model':used.config['model'],'failover_used':fallback,'calls':len(used.calls)}),flush=True)
    return result
