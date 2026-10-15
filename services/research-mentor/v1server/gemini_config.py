"""Private, server-only Gemini settings; never evaluate a shell/env file."""
import os,stat
from pathlib import Path
from .contracts import require
MODEL='gemini-3.8-flash'
ENDPOINT='https://generativelanguage.googleapis.com/v1beta/models/'+MODEL+':generateContent'

def gemini_config(config_path):
    key=os.environ.get('GEMINI_API_KEY','').strip()
    path=Path(config_path).parent/'gemini.env'
    if not key and path.exists():
        require(not path.is_symlink() and stat.S_IMODE(path.stat().st_mode)&0o077==0,'gemini.env requires owner-only permissions','INVALID_CONFIG',503)
        lines=[s.strip() for s in path.read_text().splitlines() if s.strip() and not s.lstrip().startswith('#')]
        require(len(lines)==1 and lines[0].startswith('GEMINI_API_KEY='),'gemini.env must contain only GEMINI_API_KEY=value','INVALID_CONFIG',503)
        key=lines[0].split('=',1)[1].strip()
    if not key:return None
    require(bool(key) and not any(c.isspace() for c in key) and not any(c in key for c in '\"\''),'Invalid Gemini key formatting','INVALID_CONFIG',503)
    return {'endpoint':ENDPOINT,'model':MODEL,'api_key':key,'protocol':'gemini-generate-content','sampling_parameters':{'max_completion_tokens':8192,'reasoning_effort':'high'}}
