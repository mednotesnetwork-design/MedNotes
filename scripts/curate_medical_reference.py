#!/usr/bin/env python3
"""Offline reference curation ONLY. Never invoked from public MedNote API.

Requires a provisioned DATABASE_URL, applied sql/mednote_medical_evidence.sql,
and existing Cloudflare Gemini gateway variables. Never accepts lecture uploads.
The operator is responsible for checking rights, edition and clinical accuracy.
"""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/"services"/"research-mentor"))
from medical_evidence import embed

def fail(message):
    raise SystemExit(message)

def canonical(manifest):
    content=json.dumps(manifest,sort_keys=True,ensure_ascii=False,separators=(",",":")).encode()
    return hashlib.sha256(content).hexdigest()

def verify(manifest):
    fields=("reference_code","title","publisher","version","url","rights_basis","sections")
    if not isinstance(manifest,dict) or any(k not in manifest for k in fields):
        fail("Reference metadata incomplete. No source will be activated.")
    if not re.fullmatch(r"[a-zA-Z0-9_.-]{3,100}",str(manifest["reference_code"])):
        fail("Invalid reference code")
    for k in ("title","publisher","version","rights_basis"):
        if not isinstance(manifest[k],str) or len(manifest[k].strip())<5 or len(manifest[k])>500:fail("Invalid "+k)
    if not isinstance(manifest["url"],str) or not re.fullmatch(r"https://[^ ]{8,1200}",manifest["url"]):
        fail("Reference must have an HTTPS official source URL")
    sections=manifest["sections"]
    if not isinstance(sections,list) or not 1<=len(sections)<=60:
        fail("References must contain 1–60 curated excerpts, not full copyrighted works")
    for i,row in enumerate(sections):
        if not isinstance(row,dict) or any(k not in row for k in ("section","locator","content")):
            fail(f"Missing section fields in item {i}")
        if not all(isinstance(row[k],str) for k in ("section","locator","content")):fail("Invalid section fields")
        if not 30<=len(row["content"])<=2500 or len(row["locator"])>100 or len(row["section"])>150:
            fail("Invalid curated passage length or location")
    return sections

def connect():
    import os
    from psycopg import connect as pg_connect
    url=os.environ.get("DATABASE_URL")
    if not url:fail("DATABASE_URL is required; do not stage data in the browser")
    return pg_connect(url,connect_timeout=8,prepare_threshold=None)

def stage(filename):
    manifest=json.loads(Path(filename).read_text(encoding="utf-8"))
    sections=verify(manifest)
    embeddings=[embed(row["content"],"RETRIEVAL_DOCUMENT") for row in sections]
    sha=canonical(manifest)
    with connect() as db:
        with db.cursor() as cur:
            cur.execute("""INSERT INTO mednote_medical_references
                     (reference_code,title,publisher,version,url,rights_basis,
                      content_sha256,curator_approved,active)
                    VALUES (%s,%s,%s,%s,%s,%s,%s,FALSE,FALSE)
                    RETURNING id""",
                    (manifest["reference_code"],manifest["title"],manifest["publisher"],
                     manifest["version"],manifest["url"],manifest["rights_basis"],sha))
            ref_id=cur.fetchone()[0]
            for row,vector in zip(sections,embeddings):
                cur.execute("""INSERT INTO mednote_medical_reference_chunks
                               (reference_id,section,locator,content,embedding)
                               VALUES(%s,%s,%s,%s,%s::vector)""",
                            (ref_id,row["section"],row["locator"],row["content"],vector))
    print(json.dumps({"reference_code":manifest["reference_code"],"sha256":sha,
                      "status":"staged_not_approved","chunks":len(sections)}))

def approve(code,operator,notes):
    if len(operator)<5 or len(notes)<20:fail("Curator identifier and 20+ character notes are mandatory")
    with connect() as db:
        with db.cursor() as cur:
            cur.execute("""SELECT id,title,version,rights_basis,curator_approved
                           FROM mednote_medical_references
                           WHERE reference_code=%s FOR UPDATE""",(code,))
            row=cur.fetchone()
            if not row:fail("Reference not found")
            if row[4]:fail("Reference already approved")
            print("REQUIRES HUMAN VERIFICATION",row[1],row[2],row[3])
            cur.execute("""INSERT INTO mednote_reference_review_audit
                           (reference_id,action,operator_identity,rights_basis_verified,
                            source_version_verified,notes) VALUES(%s,'approved',%s,TRUE,TRUE,%s)""",
                        (row[0],operator,notes))
            cur.execute("""UPDATE mednote_medical_references
                           SET curator_approved=TRUE,active=TRUE,
                               curator_identity=%s,approved_at=now()
                           WHERE id=%s""",(operator,row[0]))
    print(json.dumps({"reference_code":code,"status":"curator_approved"}))

def main():
    parser=argparse.ArgumentParser(description="Trusted offline reference curation only")
    sub=parser.add_subparsers(dest="command",required=True)
    a=sub.add_parser("stage");a.add_argument("manifest")
    b=sub.add_parser("approve");b.add_argument("code");b.add_argument("--operator",required=True)
    b.add_argument("--notes",required=True)
    b.add_argument("--confirmed-rights-and-edition",action="store_true")
    args=parser.parse_args()
    if args.command=="stage":stage(args.manifest)
    else:
        if not args.confirmed_rights_and_edition:
            fail("Independent operator must verify medical edition, publisher rights and exact content first")
        approve(args.code,args.operator,args.notes)

if __name__=="__main__":
    main()
