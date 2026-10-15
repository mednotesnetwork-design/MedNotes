"""Curator-approved medical reference retrieval (optional, fail-closed on missing index).

This is NOT a general web search. Only individually curator-approved, versioned
reference chunks stored in PostgreSQL/pgvector are eligible for retrieval.
Student lectures are never inserted into the shared clinical reference index.
Gemini embeddings are routed via the existing Cloudflare AI Gateway (BYOK).
"""
import json
import math
import os
import re
from urllib.request import Request, build_opener
from urllib.error import HTTPError, URLError
from v1server.provider import NoRedirect
from v1server.contracts import MentorError

DIMENSIONS=768
EMBED_MODEL="gemini-embedding-001"
MAX_CONTEXT=4
SIMILARITY_FLOOR=.66

def configured():
    return bool(os.environ.get("DATABASE_URL","").strip()) and os.environ.get("MEDNOTE_MEDICAL_RAG","off")=="on"

def _vector(values):
    if not isinstance(values,list) or len(values)!=DIMENSIONS or not all(type(x) in (float,int) and math.isfinite(x) for x in values):
        raise MentorError("RAG_UNAVAILABLE","Invalid reference vector",503)
    return "["+",".join(format(float(x),".10g") for x in values)+"]"

def embed(text,task_type):
    """Embedding method matches reference ingestion AND retrieval dimension/model."""
    if task_type not in ("RETRIEVAL_DOCUMENT","RETRIEVAL_QUERY") or not isinstance(text,str) or not text.strip() or len(text)>4500:
        raise MentorError("RAG_INVALID_QUERY","Bad embedding request",422)
    account=os.environ.get("CLOUDFLARE_ACCOUNT_ID","").strip()
    gateway=os.environ.get("CLOUDFLARE_AI_GATEWAY_ID","").strip()
    token=os.environ.get("CLOUDFLARE_AI_GATEWAY_TOKEN","").strip()
    if not re.fullmatch("[a-fA-F0-9]{32}",account) or not re.fullmatch("[a-zA-Z0-9_-]{1,64}",gateway) or not token:
        raise MentorError("RAG_UNAVAILABLE","Embedding gateway not configured",503)
    url=f"https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/google-ai-studio/v1beta/models/{EMBED_MODEL}:embedContent"
    body={"model":f"models/{EMBED_MODEL}","content":{"parts":[{"text":text}]},
          "embedContentConfig":{"taskType":task_type,"outputDimensionality":DIMENSIONS,"autoTruncate":False}}
    request=Request(url,data=json.dumps(body).encode("utf-8"),method="POST",
                    headers={"Content-Type":"application/json",
                             "cf-aig-authorization":"Bearer "+token,
                             "cf-aig-skip-cache":"true",
                             "User-Agent":"MedNote-Evidence/1.0"})
    try:
        with build_opener(NoRedirect()).open(request,timeout=20) as response:
            payload=json.loads(response.read(110000))
        return _vector(payload["embedding"]["values"])
    except (HTTPError,URLError,TimeoutError,ValueError,TypeError,KeyError):
        raise MentorError("RAG_UNAVAILABLE","Clinical reference embedding unavailable",503)

def _connection():
    from psycopg import connect
    return connect(os.environ["DATABASE_URL"],connect_timeout=6,prepare_threshold=None)

def retrieve(topic,original_text):
    """Never claim a reference is retrieved merely because a model mentions it."""
    if not configured():
        return {"status":"not_configured","references":[],"reason":"NO_APPROVED_VECTOR_INDEX"}
    if not isinstance(topic,str) or not isinstance(original_text,str):
        return {"status":"unavailable","references":[],"reason":"INVALID_SOURCE"}
    query=(topic[:190]+"\n"+original_text[:2900]).strip()
    if not query:
        return {"status":"no_match","references":[],"reason":"EMPTY_SOURCE"}
    try:
        query_vector=embed(query,"RETRIEVAL_QUERY")
        with _connection() as connection:
            with connection.cursor() as cur:
                cur.execute("""SELECT r.reference_code,r.title,r.publisher,r.version,
                                      r.url,c.section,c.locator,c.content,
                                      1-(c.embedding <=> %s::vector) AS score
                                 FROM mednote_medical_reference_chunks c
                                 JOIN mednote_medical_references r ON r.id=c.reference_id
                                WHERE r.curator_approved=TRUE AND r.active=TRUE AND c.active=TRUE
                                ORDER BY c.embedding <=> %s::vector LIMIT 6""",
                            (query_vector,query_vector))
                rows=cur.fetchall()
    except Exception:
        # No citations or assumed verification on database/provider errors.
        return {"status":"unavailable","references":[],"reason":"RETRIEVAL_FAILED"}
    refs=[]
    for code,title,publisher,version,url,section,locator,content,score in rows:
        if not isinstance(score,(float,int)) or score<SIMILARITY_FLOOR:continue
        if not all(isinstance(z,str) for z in (code,title,publisher,version,url,section,locator,content)):continue
        if not url.startswith("https://") or len(url)>1200:continue
        refs.append({"id":code,"title":title[:170],"publisher":publisher[:120],
                     "version":version[:90],"url":url,
                     "section":section[:150],"locator":locator[:100],
                     "excerpt":content[:1800],"similarity":round(float(score),3)})
        if len(refs)>=MAX_CONTEXT:break
    return {"status":"retrieved" if refs else "no_match","references":refs,
            "reason":None if refs else "NO_APPROVED_SEMANTIC_MATCH"}
