#!/usr/bin/env python3
"""Offline medical asset approval after licensing and clinical review.

Run only with a restricted medical-editor database credential.
Never expose this command as a public web endpoint.
"""
import argparse
import hashlib
import re
import os

def main():
    p=argparse.ArgumentParser()
    p.add_argument("media_id")
    p.add_argument("action",choices=["approved","rejected","withdrawn"])
    p.add_argument("--clinician-id",required=True)
    p.add_argument("--credential",required=True)
    p.add_argument("--sha256",required=True)
    p.add_argument("--notes",required=True)
    p.add_argument("--review-verified",action="store_true")
    a=p.parse_args()
    if not a.review_verified:
        p.error("Verify clinical accuracy, copyright, license, credentials and the exact media file first")
    if not re.fullmatch(r"[a-f0-9]{64}",a.sha256):
        p.error("SHA-256 digest of audited media is required")
    if not 5<=len(a.clinician_id)<=180 or not 5<=len(a.credential)<=180 or not 20<=len(a.notes)<=5000:
        p.error("Valid clinician credentials and review notes are required")
    db_url=os.environ.get("MEDNOTE_EDITOR_DATABASE_URL")
    if not db_url:
        p.error("A separate editor DB identity is required; do not reuse MedNote inference credentials")
    import psycopg
    from uuid import UUID
    media_id=UUID(a.media_id)
    with psycopg.connect(db_url,connect_timeout=8,prepare_threshold=None) as db:
        with db.cursor() as cursor:
            cursor.execute("""SELECT id,status,rights_basis,url FROM mednote_shared_media
                              WHERE id=%s FOR UPDATE""",(media_id,))
            row=cursor.fetchone()
            if not row:
                p.error("Media record not found")
            if a.action=="approved" and row[1]!="pending":
                p.error("Only pending media may be approved. Create a new version for modifications")
            cursor.execute("""INSERT INTO mednote_shared_media_approval_audit
                              (media_id,action,clinician_id,clinician_credential,media_sha256,clinical_notes)
                              VALUES(%s,%s,%s,%s,%s,%s)""",
                            (media_id,a.action,a.clinician_id,a.credential,a.sha256,a.notes))
            cursor.execute("""UPDATE mednote_shared_media
                              SET status=%s,medical_review=%s,reviewer_id=%s
                              WHERE id=%s""",
                            ("approved" if a.action=="approved" else "withdrawn",
                             "clinician_approved" if a.action=="approved" else "withdrawn",
                             a.clinician_id,media_id))
    print("Recorded clinical asset review. Never changes student billing.")

if __name__=="__main__":main()
