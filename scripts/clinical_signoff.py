#!/usr/bin/env python3
"""Append a HUMAN review verdict to the restricted clinical audit table.

Run only from a trusted operations environment using a separate curator DB
identity, after independently verifying the clinician's current licensure and
review of the exact lecture-content digest. This is NOT a public API endpoint.
"""
import argparse
import json
import re
import os

def main():
    p=argparse.ArgumentParser()
    p.add_argument("action",choices=("approved","rejected","withdrawn"))
    p.add_argument("module_digest")
    p.add_argument("--clinician-id",required=True)
    p.add_argument("--credential",required=True)
    p.add_argument("--reference-code",action="append",default=[])
    p.add_argument("--notes",required=True)
    p.add_argument("--verified-clinician-and-content",action="store_true")
    x=p.parse_args()
    if not x.verified_clinician_and_content:
        p.error("An authorized human operator must verify reviewer identity, qualification and exact module content")
    if not re.fullmatch(r"[a-f0-9]{64}",x.module_digest):
        p.error("Invalid SHA-256 module digest")
    if not (5<=len(x.clinician_id)<=180 and 5<=len(x.credential)<=180 and 20<=len(x.notes)<=5000):
        p.error("Clinical review requires identified clinician, credential and detailed notes")
    if x.action=="approved" and not x.reference_code:
        p.error("Clinical approval requires at least one curator-approved, active source reference")
    db_url=os.environ.get("DATABASE_URL")
    if not db_url:p.error("Restricted curator DATABASE_URL required")
    from psycopg import connect
    with connect(db_url,connect_timeout=8,prepare_threshold=None) as db:
        with db.cursor() as cur:
            if x.reference_code:
                cur.execute("""SELECT reference_code FROM mednote_medical_references
                        WHERE active=TRUE AND curator_approved=TRUE
                        AND reference_code=ANY(%s)""",(x.reference_code,))
                found={z[0] for z in cur.fetchall()}
                if found!=set(x.reference_code):
                    p.error("Every cited clinical reference must be curated, active and approved")
            from psycopg.types.json import Jsonb
            cur.execute("""INSERT INTO mednote_clinical_review_audit
                     (module_digest,action,clinician_id,clinician_credential,reference_codes,notes)
                     VALUES(%s,%s,%s,%s,%s,%s)""",
                    (x.module_digest,x.action,x.clinician_id,x.credential,
                     Jsonb(sorted(set(x.reference_code))),x.notes))
    print(json.dumps({"module_digest":x.module_digest,"action":x.action,
                      "status":"audit_record_added"}))

if __name__=="__main__":
    main()
