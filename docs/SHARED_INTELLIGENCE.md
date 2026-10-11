# MedNote Shared Intelligence — pilot architecture

Goal: reuse a *verified* teaching snapshot for a byte-identical lecture, or
a normalized-text-identical lecture; reuse medically approved concept media
(e.g. gout) across otherwise different university lectures.

## What the integration does

- Studio checks the shared index by SHA-256 of the uploaded file **before**
  extracting or paying for AI. It checks normalized slide text after extraction.
  If neither approved match exists, the existing per-student flow remains intact.
- Shared results are imported into the student's private IndexedDB with a
  newly generated record ID. The originating student's browser state, job
  tokens, original PDF, and notes are **never** published.
- Approved assets are indexed independently by medical concept. Only assets
  marked `clinician_approved` with verified rights can be streamed in a
  clinical scene. A generated *script* does not masquerade as a produced video.
- A curated SQL schema includes student-plan **candidates**: free, 9 SAR/month
  and 19 SAR/month. Billing is disabled. No checkout, webhook, or student
  entitlement is claimed until verified identity, compliant payment provider,
  contracts and usage caps exist.

## Provisioning / operational blockers

1. Provision a private PostgreSQL database and add `DATABASE_URL` to the
   correct Vercel preview environment. Apply
   `sql/mednote_shared_learning.sql` with a migration role. Do not expose
   the URL to the browser.
2. Add a randomly generated server-only `MEDNOTE_CURATOR_KEY` (>=32 chars)
   for trusted editorial publishing. Never embed it in frontend bundles.
3. Only publish course material with explicit institutional sharing rights.
   The admin POST route requires rights basis and curator identity. Verify
   both externally; the API cannot independently verify ownership.
4. The existing environment is private Vercel preview. For wider university
   adoption, first build student identity, university membership verification,
   database access controls, object storage policy, and trusted payment
   webhooks. Never use a preview OIDC header as student identity.
5. Publish two fingerprints for a lecture, one `file` and (if applicable)
   one `text`, using the same approved teaching snapshot. Check changes
   before republishing. Keep media under stable keys such as `gout`.

No silent publishing: previously uploaded student material stays private.
Human clinical approval is never inferred from an AI-generated script.
The code intentionally fails closed for approval and fails open (to the
existing local lecture flow) for lookup when the database is unavailable.
