"""Server-only adapter for an authorized Chat Completions JSON endpoint."""
import json, os, stat, hashlib, time
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, build_opener, HTTPRedirectHandler
from .contracts import MentorError, require
from .gemini_config import gemini_config

class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None

class Provider:
    def __init__(self,config_path):
        self.path=Path(config_path)
        self.config=None
        if self.path.exists():
            require(stat.S_IMODE(self.path.stat().st_mode)&0o077==0,'Inference secret file must have owner-only permissions','INVALID_CONFIG',503)
            try: cfg=json.loads(self.path.read_text())
            except Exception: raise MentorError('INVALID_CONFIG','Inference configuration is not valid JSON',503)
            require(isinstance(cfg,dict),'Invalid inference configuration','INVALID_CONFIG',503)
            for k in ('endpoint','model','api_key'):
                require(isinstance(cfg.get(k),str) and bool(cfg[k].strip()),'Inference configuration needs endpoint, model and api_key','INVALID_CONFIG',503)
            url=urlparse(cfg['endpoint'])
            require(url.scheme=='https' and bool(url.hostname) and not any((url.username,url.password,url.query,url.fragment)),'Provider endpoint must be an HTTPS URL without embedded credentials','INVALID_CONFIG',503)
            require(not any(x in cfg['api_key'] for x in '\r\n'),'Invalid API key','INVALID_CONFIG',503)
            params=cfg.get('sampling_parameters',{'max_completion_tokens':3000})
            require(isinstance(params,dict) and set(params)<= {'temperature','top_p','max_completion_tokens','reasoning_effort','seed'},'Unsupported sampling parameter','INVALID_CONFIG',503)
            cfg['sampling_parameters']=params
            self.config=cfg
        else:
            self.config=gemini_config(self.path)
        self.calls=[]
        self.opener=build_opener(NoRedirect())

    @property
    def available(self): return self.config is not None

    def identity(self):
        require(self.available,'Set GEMINI_API_KEY in the server environment or private gemini.env to activate the engine','INFERENCE_NOT_CONFIGURED',503)
        return {'model':self.config['model'],'endpoint_sha256':hashlib.sha256(self.config['endpoint'].encode()).hexdigest(),
                'sampling_parameters':self.config['sampling_parameters'],'protocol':self.config.get('protocol','chat-completions-json')}

    def complete(self,system,payload):
        require(self.available,'Set GEMINI_API_KEY in the server environment or private gemini.env to activate the engine','INFERENCE_NOT_CONFIGURED',503)
        require(len(self.calls)<8,'Inference call budget exceeded','REVIEW_FAILED',422)
        body={'model':self.config['model'],'messages':[{'role':'system','content':system+'\nReturn exactly one JSON object. No markdown fences, hidden reasoning or chain-of-thought.'},
               {'role':'user','content':json.dumps(payload,ensure_ascii=False)}],'response_format':{'type':'json_object'},**self.config['sampling_parameters']}
        start=time.monotonic()
        try:
            native=self.config.get('protocol')=='gemini-generate-content'
            headers={'Authorization':'Bearer '+self.config['api_key'],'Content-Type':'application/json'}
            if native:
                params=self.config['sampling_parameters']
                body={'systemInstruction':{'parts':[{'text':body['messages'][0]['content']}]},
                      'contents':[{'role':'user','parts':[{'text':body['messages'][1]['content']}]}],
                      'generationConfig':{'responseMimeType':'application/json','maxOutputTokens':params['max_completion_tokens'],
                                          'thinkingConfig':{'thinkingLevel':params['reasoning_effort'].upper()}}}
                headers={'x-goog-api-key':self.config['api_key'],'Content-Type':'application/json'}
            request=Request(self.config['endpoint'],data=json.dumps(body).encode(),headers=headers,method='POST')
            with self.opener.open(request,timeout=50) as response:
                raw=response.read(2_000_001)
            if len(raw)>2_000_000: raise ValueError('Oversize provider response')
            result=json.loads(raw)
            if native:
                candidate=result['candidates'][0]
                if candidate.get('finishReason')!='STOP':raise ValueError('Incomplete or refused generation')
                content=''.join(p.get('text','') for p in candidate['content']['parts'] if not p.get('thought',False))
                result={'choices':[{'finish_reason':'stop','message':{'content':content}}],
                        'id':result.get('responseId'),'model':result.get('modelVersion'),'usage':result.get('usageMetadata')}
            choice=result['choices'][0]
            if choice.get('finish_reason')!='stop': raise ValueError('Incomplete or refused generation')
            value=json.loads(choice['message']['content'])
            if not isinstance(value,dict): raise ValueError('Expected JSON object')
            self.calls.append({'provider_request_id':result.get('id'),'returned_model':result.get('model'),'usage':result.get('usage'),
                               'latency_seconds':round(time.monotonic()-start,3)})
            return value
        except MentorError: raise
        except Exception:
            # Never include raw upstream body, URL, headers or credentials in errors.
            raise MentorError('PROVIDER_FAILURE','Inference provider failed or returned invalid/incomplete JSON. No answer was published.',502)
