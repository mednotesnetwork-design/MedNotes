import json,sqlite3,uuid,hashlib
from datetime import datetime,timezone
from pathlib import Path
from .contracts import empty_state,validate_patch,require,MentorError

def now(): return datetime.now(timezone.utc).isoformat()

class Store:
    def __init__(self,path):
        self.path=str(path); Path(path).parent.mkdir(parents=True,exist_ok=True,mode=0o700)
        with self.db() as db:
            db.executescript('''CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY,owner TEXT,state TEXT,version INTEGER,updated_at TEXT);
            CREATE TABLE IF NOT EXISTS turns(id TEXT PRIMARY KEY,project TEXT,request_id TEXT,input TEXT,response TEXT,created_at TEXT);
            CREATE TABLE IF NOT EXISTS evidence(id TEXT,project TEXT,record TEXT,PRIMARY KEY(id,project));
            CREATE TABLE IF NOT EXISTS requests(owner TEXT,request_id TEXT,fingerprint TEXT,response TEXT,status TEXT,PRIMARY KEY(owner,request_id));''')
        Path(path).chmod(0o600)

    def db(self):
        db=sqlite3.connect(self.path,timeout=10); db.row_factory=sqlite3.Row; return db

    def create(self,owner):
        id=str(uuid.uuid4())
        with self.db() as db: db.execute('INSERT INTO projects VALUES(?,?,?,?,?)',(id,owner,json.dumps(empty_state()),0,now()))
        return self.get(owner,id)

    def get(self,owner,id):
        with self.db() as db: row=db.execute('SELECT * FROM projects WHERE id=? AND owner=?',(id,owner)).fetchone()
        require(row is not None,'Research project not found','NOT_FOUND',404)
        return {'id':row['id'],'state':json.loads(row['state']),'version':row['version'],'updated_at':row['updated_at']}

    def list(self,owner):
        with self.db() as db: return [{'id':r['id'],'topic':json.loads(r['state'])['topic'],'version':r['version']} for r in db.execute('SELECT * FROM projects WHERE owner=? ORDER BY updated_at DESC',(owner,))]

    def patch(self,owner,id,version,patch):
        patch=validate_patch(patch)
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            row=db.execute('SELECT * FROM projects WHERE id=? AND owner=?',(id,owner)).fetchone()
            require(row is not None,'Project not found','NOT_FOUND',404)
            require(type(version) is int and row['version']==version,'Research state changed; reload before saving','STATE_CONFLICT',409)
            state=json.loads(row['state']); state.update(patch)
            require(len(json.dumps(state))<=100000,'Research state too large')
            db.execute('UPDATE projects SET state=?,version=version+1,updated_at=? WHERE id=?',(json.dumps(state),now(),id))
        return self.get(owner,id)

    def history(self,owner,id):
        self.get(owner,id)
        with self.db() as db: rows=db.execute('SELECT input,response FROM turns WHERE project=? ORDER BY created_at DESC LIMIT 12',(id,)).fetchall()
        # Bounded recent context; the full history remains in SQLite.
        return [{'student':r['input'],'mentor':json.loads(r['response']).get('answer','')} for r in reversed(rows)]

    def paper(self,owner,project,id):
        self.get(owner,project)
        with self.db() as db: r=db.execute('SELECT record FROM evidence WHERE project=? AND id=?',(project,id)).fetchone()
        require(r is not None,'Selected paper has not been retrieved for this project','SOURCE_NOT_FOUND',404)
        return json.loads(r[0])

    def papers(self,owner,project):
        self.get(owner,project)
        with self.db() as db: return [json.loads(r[0]) for r in db.execute('SELECT record FROM evidence WHERE project=?',(project,))]

    def save_paper(self,owner,project,paper):
        self.get(owner,project)
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('INSERT OR REPLACE INTO evidence VALUES(?,?,?)',(paper['id'],project,json.dumps(paper)))
            row=db.execute('SELECT state FROM projects WHERE id=? AND owner=?',(project,owner)).fetchone()
            state=json.loads(row[0])
            if paper['id'] not in state['saved_papers']:
                require(len(state['saved_papers'])<80,'Project paper limit reached')
                state['saved_papers'].append(paper['id'])
                db.execute('UPDATE projects SET state=?,version=version+1,updated_at=? WHERE id=?',(json.dumps(state),now(),project))

    def cached_request(self,owner,request_id,payload):
        if not request_id:return None
        digest=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
        with self.db() as db:r=db.execute('SELECT * FROM requests WHERE owner=? AND request_id=?',(owner,request_id)).fetchone()
        if not r:return None
        require(r['fingerprint']==digest,'Request ID reused with different content','REQUEST_CONFLICT',409)
        require(r['status']=='completed','Request is running or failed; use a new request ID to retry','REQUEST_IN_PROGRESS',409)
        return json.loads(r['response'])

    def begin_request(self,owner,request_id,payload):
        require(isinstance(request_id,str) and 1<=len(request_id)<=100,'A request_id is required')
        digest=hashlib.sha256(json.dumps(payload,sort_keys=True).encode()).hexdigest()
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            r=db.execute('SELECT * FROM requests WHERE owner=? AND request_id=?',(owner,request_id)).fetchone()
            if r:
                require(r['fingerprint']==digest,'Request ID reused with different content','REQUEST_CONFLICT',409)
                require(r['status']=='completed','Request is running or failed; use a new request ID to retry','REQUEST_IN_PROGRESS',409)
                return json.loads(r['response'])
            db.execute('INSERT INTO requests VALUES(?,?,?,?,?)',(owner,request_id,digest,None,'running'))

    def finish(self,owner,request_id,project,version,text,response):
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            r=db.execute('SELECT version FROM projects WHERE owner=? AND id=?',(owner,project)).fetchone()
            require(r is not None and r[0]==version,'State changed during scientific review; regenerate with current state','STATE_CONFLICT',409)
            response['state_version']=version+1
            db.execute('INSERT INTO turns VALUES(?,?,?,?,?,?)',(str(uuid.uuid4()),project,request_id,text,json.dumps(response),now()))
            db.execute('UPDATE projects SET version=version+1,updated_at=? WHERE id=?',(now(),project))
            db.execute('UPDATE requests SET status=?,response=? WHERE owner=? AND request_id=?',('completed',json.dumps(response),owner,request_id))
        return response

    def fail(self,owner,request_id):
        with self.db() as db: db.execute("UPDATE requests SET status='failed' WHERE owner=? AND request_id=? AND status='running'",(owner,request_id))
