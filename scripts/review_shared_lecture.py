#!/usr/bin/env python3
"""Offline review of shared university lecture snapshot distribution rights.

Run by the verified institution's content curator with separate editor
database privileges. No student uploads are distributed automatically.
"""
import argparse
import os
import re

def main():
    p=argparse.ArgumentParser()
    p.add_argument("action",choices=("approved","rejected","withdrawn"))
    p.add_argument("scope",choices=("uqu","global"))
    p.add_argument("digest_kind",choices=("file","text"))
    p.add_argument("digest")
    p.add_argument("--reviewer",required=True)
    p.add_argument("--notes",required=True)
    p.add_argument("--institution-permission-verified",action="store_true")
    p.add_argument("--lecture-version-reviewed",action="store_true")
    args=p.parse_args()
    if not args.institution_permission_verified or not args.lecture_version_reviewed:
        p.error("Verify rights and exact snapshot contents before updating the library")
    if not re.fullmatch("[a-f0-9]{64}",args.digest):
        p.error("Invalid lecture fingerprint")
    if not 5<=len(args.reviewer)<=180 or not 20<=len(args.notes)<=5000:
        p.error("Reviewer identity and detailed review notes are required")
    url=os.environ.get("MEDNOTE_EDITOR_DATABASE_URL")
    if not url:p.error("Separate editor database credentials are required")
    from psycopg import connect
    with connect(url,connect_timeout=8,prepare_threshold=None) as db:
        with db.cursor() as cur:
            cur.execute("""SELECT status,rights_basis FROM mednote_shared_lectures
                           WHERE scope=%s AND digest_kind=%s AND digest=%s FOR UPDATE""",
                        (args.scope,args.digest_kind,args.digest))
            if not cur.fetchone():p.error("Staged lecture not found")
            cur.execute("""INSERT INTO mednote_shared_lecture_review_audit
                           (scope,digest_kind,digest,action,reviewer_id,
                            rights_checked,curriculum_version_checked,review_notes)
                           VALUES(%s,%s,%s,%s,%s,TRUE,TRUE,%s)""",
                        (args.scope,args.digest_kind,args.digest,args.action,args.reviewer,args.notes))
            cur.execute("""UPDATE mednote_shared_lectures SET status=%s,updated_at=now()
                           WHERE scope=%s AND digest_kind=%s AND digest=%s""",
                        ("approved" if args.action=="approved" else "withdrawn",
                         args.scope,args.digest_kind,args.digest))
    print("Review recorded. Sharing is separate from human clinical approval.")

if __name__=="__main__":main()
