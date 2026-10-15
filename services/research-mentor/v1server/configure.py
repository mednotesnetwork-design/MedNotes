"""Owner activation: one private connection setup, with no key printed or bundled."""
import getpass,json,os,sys
from pathlib import Path
from .provider import Provider

def main():
    root=Path(__file__).resolve().parents[1]
    runtime=Path(os.environ.get('RESEARCH_MENTOR_DATA',root/'.runtime'))
    path=Path(os.environ.get('RESEARCH_MENTOR_CONFIG',runtime/'inference.json'))
    path.parent.mkdir(parents=True,exist_ok=True,mode=0o700)
    if '--gemini' in sys.argv:
        if path.exists():raise SystemExit('Existing provider configuration takes precedence. Review it before switching.')
        secret=path.parent/'gemini.env'
        key=getpass.getpass('GEMINI_API_KEY (hidden; saved on this server only): ').strip()
        if not key or any(c.isspace() for c in key) or any(c in key for c in '\"\''):raise SystemExit('Invalid key formatting; nothing saved.')
        fd=os.open(secret,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as f:f.write('GEMINI_API_KEY='+key+'\n')
        print('Secret installed. Run python3 -m server.verify_gemini to verify real inference. No model call has run yet.')
        return
    if path.exists():raise SystemExit('Connection already exists. Preserve the V1 baseline before explicitly replacing it.')
    endpoint=input('Authorized HTTPS Chat Completions endpoint: ').strip()
    model=input('Authorized model identifier: ').strip()
    key=getpass.getpass('Provider API key (hidden, server-side only): ').strip()
    cfg={'endpoint':endpoint,'model':model,'api_key':key,'sampling_parameters':{'max_completion_tokens':3000}}
    fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
    try:
        with os.fdopen(fd,'w') as f:json.dump(cfg,f)
        Provider(path)
    except Exception:
        path.unlink(missing_ok=True);raise SystemExit('Connection configuration was invalid; no key was retained.')
    print('Private connection installed. The next request freezes baseline V1 before inference. No model call has yet been made.')

if __name__=='__main__':main()
