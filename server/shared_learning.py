"""Rights-checked shared lesson/media lookup. No user uploads are silently shared."""
import hashlib
import json
import os
import re
import secrets
from urllib.parse import urlparse

HEX = re.compile(r"^[a-f0-9]{64}$")
CONCEPT = re.compile(r"^[a-z0-9_-]{2,80}$")
KINDS = {"file", "text"}
SCOPES = {"uqu", "global"}

class LibraryError(Exception):
    def __init__(self, status, code):
        self.status, self.code = status, code
        super().__init__(code)

def connect():
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise LibraryError(503, "SHARED_LIBRARY_NOT_CONFIGURED")
    from psycopg import connect as pg_connect
    return pg_connect(url, connect_timeout=6, prepare_threshold=None)

def verify_curator(header):
    secret = os.environ.get("MEDNOTE_CURATOR_KEY", "")
    if len(secret) < 32 or not isinstance(header, str) or not secrets.compare_digest(header, secret):
        raise LibraryError(403, "CURATOR_AUTH_REQUIRED")

def lookup_lecture(digest_kind, digest, scope="uqu"):
    if digest_kind not in KINDS or not isinstance(digest, str) or not HEX.fullmatch(digest) or scope not in SCOPES:
        raise LibraryError(400, "INVALID_FINGERPRINT")
    with connect() as db, db.cursor() as cur:
        cur.execute("""SELECT title,snapshot,review_state,scope FROM mednote_shared_lectures
          WHERE digest_kind=%s AND digest=%s AND status='approved'
          AND scope IN (%s,'global')
          ORDER BY CASE WHEN scope=%s THEN 0 ELSE 1 END LIMIT 1""",
          (digest_kind, digest, scope, scope))
        row = cur.fetchone()
    if not row:
        return {"match": False}
    title, snapshot, review_state, matched_scope = row
    return {"match": True, "title": title, "snapshot": snapshot,
            "review_state": review_state, "scope": matched_scope}

def media_for_concept(concept_key):
    if not isinstance(concept_key, str) or not CONCEPT.fullmatch(concept_key):
        raise LibraryError(400, "INVALID_CONCEPT")
    with connect() as db, db.cursor() as cur:
        cur.execute("""SELECT id,title,kind,url,description,version FROM mednote_shared_media
          WHERE concept_key=%s AND status='approved' AND medical_review='clinician_approved'
          ORDER BY version DESC LIMIT 20""", (concept_key,))
        rows = cur.fetchall()
    # Return only the latest approved version of each medium.
    unique = {}
    for row in rows:
        unique.setdefault(row[2], {"id": str(row[0]), "title": row[1], "kind": row[2],
                                   "url": row[3], "description": row[4], "version": row[5]})
    return {"concept_key": concept_key, "media": list(unique.values())}

def candidate_plans():
    # Billing stays disabled regardless of DB contents until authenticated
    # webhook-driven subscription verification has been implemented.
    return {"billing_enabled": False, "currency": "SAR", "access_duration_days": 60, "auto_renewal": False, "plans": [
        {"code": "free", "price_halalas": 0, "shared_access": True, "custom_videos": 0, "access_duration_days": 60},
        {"code": "student", "price_halalas": 1500, "shared_access": True, "custom_videos": 0, "access_duration_days": 60},
        {"code": "student_plus", "price_halalas": 2900, "shared_access": True, "custom_videos": 2, "access_duration_days": 60},
    ]}

def clean_snapshot(snapshot):
    if not isinstance(snapshot, dict):
        raise LibraryError(400, "INVALID_SNAPSHOT")
    sources = snapshot.get("sources")
    outline = snapshot.get("outline")
    chapters = snapshot.get("chapters")
    if not isinstance(sources, list) or not (1 <= len(sources) <= 300):
        raise LibraryError(400, "INVALID_SNAPSHOT")
    if not isinstance(outline, dict) or not isinstance(outline.get("chapters"), list) or not isinstance(chapters, dict):
        raise LibraryError(400, "INVALID_SNAPSHOT")
    # Drop images, student-only notes, IDs, tokens and any unknown properties.
    safe_sources = []
    for page in sources:
        if not isinstance(page, dict) or not isinstance(page.get("id"), str) or not isinstance(page.get("page"), int):
            raise LibraryError(400, "INVALID_SNAPSHOT")
        safe_sources.append({"id": page["id"][:100], "page": page["page"],
            "title": str(page.get("title", ""))[:160], "text": str(page.get("text", ""))[:7000],
            "observations": page.get("observations", [])[:30] if isinstance(page.get("observations", []), list) else [],
            "visionDone": True, "warnings": ["نسخة مشتركة مرخّصة؛ يمكنك فتح الملف الأصلي للاطلاع على الرسومات."]})
    ids = {x["id"] for x in safe_sources}
    if len(ids) != len(safe_sources):
        raise LibraryError(400, "DUPLICATE_SOURCES")
    for chapter in outline["chapters"]:
        if not isinstance(chapter, dict) or not isinstance(chapter.get("source_ids"), list) or not set(chapter["source_ids"]).issubset(ids):
            raise LibraryError(400, "SOURCE_MISMATCH")
    output = {"name": str(snapshot.get("name", ""))[:200], "sources": safe_sources,
              "outline": outline, "chapters": chapters,
              "simulations": snapshot.get("simulations") if isinstance(snapshot.get("simulations"), dict) else {}}
    if len(json.dumps(output, ensure_ascii=False).encode("utf-8")) > 2_000_000:
        raise LibraryError(413, "SNAPSHOT_TOO_LARGE")
    return output

def publish_lecture(data, curator_key):
    verify_curator(curator_key)
    digest = data.get("digest")
    digest_kind = data.get("digest_kind")
    scope = data.get("scope")
    rights = data.get("rights_basis")
    curator = data.get("curator_id")
    if digest_kind not in KINDS or scope not in SCOPES or not isinstance(digest, str) or not HEX.fullmatch(digest):
        raise LibraryError(400, "INVALID_FINGERPRINT")
    if not isinstance(rights, str) or not 20 <= len(rights) <= 1000 or not isinstance(curator, str) or not 3 <= len(curator) <= 180:
        raise LibraryError(400, "RIGHTS_AND_CURATOR_REQUIRED")
    snapshot = clean_snapshot(data.get("snapshot"))
    # An approval here means distribution rights are confirmed, *not* human
    # clinical validation. The lesson's own clinical trust status is preserved.
    with connect() as db, db.cursor() as cur:
        from psycopg.types.json import Jsonb
        cur.execute("""INSERT INTO mednote_shared_lectures
          (scope,digest_kind,digest,title,snapshot,status,rights_basis,curator_id)
          VALUES (%s,%s,%s,%s,%s,'pending',%s,%s)
          ON CONFLICT (scope,digest_kind,digest) DO UPDATE
          SET title=EXCLUDED.title,snapshot=EXCLUDED.snapshot,status='pending',
              rights_basis=EXCLUDED.rights_basis,curator_id=EXCLUDED.curator_id,
              content_version=mednote_shared_lectures.content_version+1,updated_at=now()""",
          (scope,digest_kind,digest,snapshot["name"] or "Shared lecture",Jsonb(snapshot),rights,curator))
    return {"staged": True, "approved": False, "digest": digest, "scope": scope, "review_state": "educational_unreviewed"}

def publish_media(data, curator_key):
    verify_curator(curator_key)
    concept = data.get("concept_key"); kind = data.get("kind")
    url = data.get("url"); rights = data.get("rights_basis"); reviewer = data.get("reviewer_id")
    if not isinstance(concept, str) or not CONCEPT.fullmatch(concept) or kind not in {"video","image","interactive3d"}:
        raise LibraryError(400, "INVALID_MEDIA")
    if not isinstance(url, str) or len(url)>1500 or urlparse(url).scheme != "https" or not urlparse(url).hostname:
        raise LibraryError(400, "INVALID_MEDIA_URL")
    if not isinstance(rights,str) or not 20<=len(rights)<=1000:
        raise LibraryError(400,"MEDIA_RIGHTS_REQUIRED")
    title = str(data.get("title", concept))[:200]
    description = str(data.get("description", ""))[:1000]
    with connect() as db, db.cursor() as cur:
        cur.execute("""INSERT INTO mednote_shared_media
          (concept_key,kind,version,title,url,description,status,rights_basis,medical_review)
          VALUES (%s,%s,COALESCE((SELECT max(version)+1 FROM mednote_shared_media WHERE concept_key=%s AND kind=%s),1),
          %s,%s,%s,'pending',%s,'pending')""",
          (concept,kind,concept,kind,title,url,description,rights))
    return {"staged": True, "approved": False, "concept_key": concept, "kind": kind}
