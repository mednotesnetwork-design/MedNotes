"""Independent, human-only clinical sign-off lookup.

The LLM, student, browser, and media generator cannot approve their own module.
Approved state exists ONLY if an authorized curator inserts a signed-off,
append-only audit record in the separate database. Runtime database credentials
should have SELECT-only access to the audit table.
"""
import hashlib
import json
import os

def digest_module(sources,draft):
    canonical={
        "source":[{"id":row["id"],"page":row["page"],"title":row["title"],"text":row["text"]} for row in sources],
        "generated":{key:draft.get(key) for key in (
            "headline","opening","foundation","learning_layers","scenes","mechanism",
            "clinical","visual","high_yield","quiz","uncertainties")}
    }
    data=json.dumps(canonical,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()
    return hashlib.sha256(data).hexdigest()

def status(sources,draft):
    digest=digest_module(sources,draft)
    result={"module_digest":digest,"human_review":"pending","clinical_approval":False,
            "reviewed_by":None,"reviewed_at":None}
    if not os.environ.get("DATABASE_URL"):
        return result
    try:
        from psycopg import connect
        with connect(os.environ["DATABASE_URL"],connect_timeout=5,prepare_threshold=None) as db:
            with db.cursor() as cur:
                cur.execute("""SELECT action,clinician_id,reviewed_at
                     FROM mednote_clinical_review_audit WHERE module_digest=%s
                     ORDER BY reviewed_at DESC,id DESC LIMIT 1""",(digest,))
                row=cur.fetchone()
        if row:
            result["human_review"]={"approved":"approved","rejected":"rejected",
                                    "withdrawn":"withdrawn"}[row[0]]
            result["clinical_approval"]=row[0]=="approved"
            # Do not expose clinician personal identifiers in user-facing module output.
            result["reviewed_at"]=row[2].isoformat()
    except Exception:
        # Fail closed, including schema not yet provisioned or database downtime.
        pass
    return result
