"""Durable lecture ingestion and progress. No model secrets or documents reach logs.

Requires PostgreSQL (DATABASE_URL) and Vercel Queues. This is opt-in until
the database is provisioned; the existing lecture/research routes are unchanged.
"""
import base64
import hashlib
import json
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone

SCHEMA = """
CREATE TABLE IF NOT EXISTS mednote_lecture_jobs (
 id uuid PRIMARY KEY, secret_hash text NOT NULL, title text NOT NULL,
 total_pages integer NOT NULL CHECK(total_pages BETWEEN 1 AND 300),
 phase text NOT NULL DEFAULT 'queued',
 plan_offset integer NOT NULL DEFAULT 0,
 units jsonb NOT NULL DEFAULT '[]'::jsonb,
 plan jsonb,
 lessons jsonb NOT NULL DEFAULT '{}'::jsonb,
 warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 attempts integer NOT NULL DEFAULT 0,
 next_attempt timestamptz,
 lease_until timestamptz,
 error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS mednote_lecture_pages (
 job_id uuid NOT NULL REFERENCES mednote_lecture_jobs(id) ON DELETE CASCADE,
 page_no integer NOT NULL, raw_text text NOT NULL,
 image_bytes bytea, points jsonb, warnings jsonb NOT NULL DEFAULT '[]'::jsonb,
 PRIMARY KEY(job_id,page_no)
);
CREATE INDEX IF NOT EXISTS mednote_lecture_pages_job ON mednote_lecture_pages(job_id);
"""

def configured():
    return bool(os.environ.get('DATABASE_URL'))

def connect():
    from psycopg import connect as pg_connect
    url=os.environ.get('DATABASE_URL')
    if not url:raise JobError(503,'DATABASE_NOT_CONFIGURED')
    return pg_connect(url, connect_timeout=8, prepare_threshold=None)

class JobError(Exception):
    def __init__(self,status,code):
        self.status,self.code=status,code
        super().__init__(code)

def ensure_schema(conn):
    with conn.cursor() as cur:
        for statement in SCHEMA.strip().split(';'):
            if statement.strip():cur.execute(statement)
    conn.commit()

def j(value):
    from psycopg.types.json import Jsonb
    return Jsonb(value)

def authorize(conn,job_id,token):
    try: job_id=str(uuid.UUID(str(job_id)))
    except (ValueError,TypeError,AttributeError):raise JobError(404,'JOB_NOT_FOUND')
    if not isinstance(token,str) or len(token)!=64:raise JobError(404,'JOB_NOT_FOUND')
    with conn.cursor() as cur:
        cur.execute("SELECT id,secret_hash FROM mednote_lecture_jobs WHERE id=%s",(job_id,))
        row=cur.fetchone()
    if not row or not secrets.compare_digest(row[1],hashlib.sha256(token.encode()).hexdigest()):
        raise JobError(404,'JOB_NOT_FOUND')
    return job_id

def create(title,total_pages):
    if not isinstance(title,str) or not title.strip() or len(title)>180:raise JobError(400,'INVALID_TITLE')
    if type(total_pages) is not int or not 1<=total_pages<=300:raise JobError(400,'INVALID_PAGE_COUNT')
    job_id=str(uuid.uuid4())
    token=secrets.token_hex(32)
    with connect() as conn:
        ensure_schema(conn)
        with conn.cursor() as cur:
            cur.execute("""INSERT INTO mednote_lecture_jobs(id,secret_hash,title,total_pages)
                           VALUES(%s,%s,%s,%s)""",
                (job_id,hashlib.sha256(token.encode()).hexdigest(),title,total_pages))
    return {'job_id':job_id,'job_token':token,'phase':'queued'}

def append_page(job_id,token,page):
    if not isinstance(page,dict):raise JobError(400,'INVALID_PAGE')
    number=page.get('number');raw=page.get('text');image=page.get('image')
    if type(number) is not int or not isinstance(raw,str) or len(raw)>40000:
        raise JobError(400,'INVALID_PAGE')
    data=None
    if image is not None:
        if not isinstance(image,str) or not image.startswith('data:image/jpeg;base64,') or len(image)>2000000:
            raise JobError(413,'IMAGE_TOO_LARGE')
        try:data=base64.b64decode(image.split(',',1)[1],validate=True)
        except (ValueError,base64.binascii.Error):raise JobError(400,'INVALID_IMAGE')
        if len(data)>1450000 or not data.startswith(b'\xff\xd8\xff'):
            raise JobError(400,'INVALID_IMAGE')
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT total_pages,phase FROM mednote_lecture_jobs WHERE id=%s AND secret_hash=%s FOR UPDATE",
                        (job_id,hashlib.sha256(token.encode()).hexdigest()))
            record=cur.fetchone()
            if not record:raise JobError(404,'JOB_NOT_FOUND')
            if not 1<=number<=record[0]:raise JobError(400,'INVALID_PAGE')
            if record[1]!='queued':raise JobError(409,'JOB_ALREADY_STARTED')
            cur.execute("""INSERT INTO mednote_lecture_pages(job_id,page_no,raw_text,image_bytes)
                           VALUES(%s,%s,%s,%s) ON CONFLICT(job_id,page_no) DO NOTHING""",
                        (job_id,number,raw,data))
    return {'received':number}

def start(job_id,token):
    with connect() as conn:
        authorize(conn,job_id,token)
        with conn.cursor() as cur:
            cur.execute("SELECT total_pages,phase FROM mednote_lecture_jobs WHERE id=%s FOR UPDATE",(job_id,))
            total,phase=cur.fetchone()
            cur.execute("SELECT count(*) FROM mednote_lecture_pages WHERE job_id=%s",(job_id,))
            received=cur.fetchone()[0]
            if received!=total:raise JobError(409,'MISSING_PAGES')
            if phase not in ('queued','retrying','failed'):raise JobError(409,'ALREADY_PROCESSING')
            cur.execute("""UPDATE mednote_lecture_jobs SET phase='queued',error_code=NULL,lease_until=NULL,
                           attempts=0,updated_at=now() WHERE id=%s""",(job_id,))
    return {'job_id':job_id,'phase':'queued'}

def status(job_id,token):
    with connect() as conn:
        authorize(conn,job_id,token)
        with conn.cursor() as cur:
            cur.execute("""SELECT title,total_pages,phase,plan,lessons,warnings,error_code,
                           attempts,plan_offset FROM mednote_lecture_jobs WHERE id=%s""",(job_id,))
            title,total,phase,plan,lessons,warnings,error,attempts,offset=cur.fetchone()
            cur.execute("""SELECT page_no,points,warnings FROM mednote_lecture_pages WHERE job_id=%s ORDER BY page_no""",(job_id,))
            rows=cur.fetchall()
    processed=sum(points is not None for _,points,_ in rows)
    return {'job_id':job_id,'title':title,'total_pages':total,'phase':phase,'processed_pages':processed,
            'plan_offset':offset,'plan':plan,'lessons':lessons,'warnings':warnings,
            'error_code':error,'attempts':attempts,
            'pages':[{'number':no,'points':points,'warnings':w} for no,points,w in rows if points is not None]}

def is_terminal(job_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT phase FROM mednote_lecture_jobs WHERE id=%s",(job_id,))
            row=cur.fetchone()
    return not row or row[0] in ('ready','failed')

def claim(job_id):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""UPDATE mednote_lecture_jobs SET lease_until=now()+interval '275 seconds',
                           updated_at=now() WHERE id=%s AND phase NOT IN ('ready','failed')
                           AND (lease_until IS NULL OR lease_until<now())
                           AND (next_attempt IS NULL OR next_attempt<=now())
                           RETURNING id""",(job_id,))
            return cur.fetchone() is not None

def release(job_id,phase=None,error=None,delay=0):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""UPDATE mednote_lecture_jobs SET lease_until=NULL,
                       phase=COALESCE(%s,phase), error_code=%s,
                       next_attempt=CASE WHEN %s>0 THEN now()+(%s * interval '1 second') ELSE NULL END,
                       updated_at=now() WHERE id=%s""",(phase,error,delay,delay,job_id))

def worker_step(job_id):
    """Do one bounded unit of work. Queue redelivery is idempotent."""
    from server.study_service import execute_study
    from course_workflow import text_points,complete_plan_or_repair,validate_order
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT title,phase,plan_offset,units,plan,lessons FROM mednote_lecture_jobs WHERE id=%s",(job_id,))
            record=cur.fetchone()
            if not record:return False
            title,phase,offset,units,plan,lessons=record
            if phase in ('ready','failed'):return False
            cur.execute("""SELECT page_no,raw_text,image_bytes,points FROM mednote_lecture_pages
                           WHERE job_id=%s ORDER BY page_no""",(job_id,))
            pages=cur.fetchall()
    if not pages:return False
    unseen=next((x for x in pages if x[3] is None),None)
    if unseen:
        no,raw,image,_=unseen
        payload={'operation':'extract','pages':[{'number':no,'text':raw,
                    **({'image':'data:image/jpeg;base64,'+base64.b64encode(image).decode()} if image else {})}]}
        output=execute_study('lecture',payload)
        result=output['pages'][0]
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""UPDATE mednote_lecture_pages SET points=%s,warnings=%s
                               WHERE job_id=%s AND page_no=%s AND points IS NULL""",
                            (j(result['points']),j(result.get('warnings',[])),job_id,no))
                cur.execute("UPDATE mednote_lecture_jobs SET phase='extracting',updated_at=now() WHERE id=%s",(job_id,))
        return True
    points=[p for _,_,_,items in pages for p in (items or [])]
    if not points:raise JobError(422,'EMPTY_LECTURE')
    if not plan:
        if offset<len(points):
            batch=[];n=0
            for point in points[offset:]:
                if batch and (len(batch)>=12 or n+len(point['text'])>8000):break
                batch.append(point);n+=len(point['text'])
            output=execute_study('lecture',{'operation':'plan','title':title,'points':batch})
            incoming=output['plan']['units']
            shift=len(units)
            for ui,unit in enumerate(incoming):
                unit['id']=f'u{shift+ui+1}'
                for ci,card in enumerate(unit['cards']):card['id']=f'u{shift+ui+1}-c{ci+1}'
            with connect() as conn:
                with conn.cursor() as cur:
                    cur.execute("""UPDATE mednote_lecture_jobs SET phase='structuring',units=%s,
                                   plan_offset=%s,updated_at=now() WHERE id=%s AND plan_offset=%s""",
                                (j(units+incoming),offset+len(batch),job_id,offset))
            return True
        assigned=[i for u in units for c in u['cards'] for i in c['source_ids']]
        all_ids={p['id'] for p in points}
        if len(assigned)!=len(all_ids) or set(assigned)!=all_ids:raise JobError(422,'COURSE_PLAN_FAILED')
        if len(units)>1 and len(units)<=120:
            try:
                output=execute_study('lecture',{'operation':'reorder','units':[
                    {'id':u['id'],'title':u['title'],'objective':u['objective']} for u in units]})
                order=validate_order(output,units)
                index={u['id']:u for u in units}
                units=[index[i] for i in order]
            except Exception:
                # Optional global ordering must never erase valid source coverage.
                pass
        plan={'title':title,'units':units}
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""UPDATE mednote_lecture_jobs SET phase='generating',plan=%s,
                               updated_at=now() WHERE id=%s AND plan IS NULL""",(j(plan),job_id))
        return True
    cards=[c for u in plan['units'] for c in u['cards']]
    next_card=next((c for c in cards if c['id']+':lecture_only' not in lessons),None)
    if next_card:
        subset=[p for p in points if p['id'] in set(next_card['source_ids'])]
        output=execute_study('lecture',{'operation':'teach','title':title+' · '+next_card['title'],
                                        'points':subset,'source_mode':'lecture_only'})
        lesson=output['lesson']
        with connect() as conn:
            with conn.cursor() as cur:
                cur.execute("""UPDATE mednote_lecture_jobs SET phase='generating',
                               lessons=jsonb_set(lessons,%s,%s,true),updated_at=now()
                               WHERE id=%s""",('{'+next_card['id']+':lecture_only}',j(lesson),job_id))
        return True
    release(job_id,'ready')
    return False

def retry_delay(attempt):
    return min(300,10*(2**min(5,max(0,attempt-1))))

def failure(job_id,code,retryable=True):
    with connect() as conn:
        with conn.cursor() as cur:
            cur.execute("""UPDATE mednote_lecture_jobs SET attempts=attempts+1,
                           lease_until=NULL, updated_at=now() WHERE id=%s RETURNING attempts""",(job_id,))
            result=cur.fetchone()
            if not result:return 0
            attempt=result[0]
            delay=retry_delay(attempt) if retryable and attempt<=6 else 0
            cur.execute("""UPDATE mednote_lecture_jobs SET phase=%s,error_code=%s,
                           next_attempt=CASE WHEN %s>0 THEN now()+(%s*interval '1 second') ELSE NULL END
                           WHERE id=%s""",('retrying' if delay else 'failed',code,delay,delay,job_id))
        return delay
