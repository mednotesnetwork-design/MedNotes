# Durable MedNote lecture processing

This feature is isolated from Research Mentor and the existing `/api/lecture` fallback.

## Prerequisites

1. Provision a PostgreSQL database using a Vercel Marketplace storage integration (e.g. Neon free tier, subject to provider terms).
2. Set `DATABASE_URL` for the **preview** deployment only. Do not print or commit it.
3. Deploy the branch `codex/integrated-study-workspace`. Python package `vercel-queue` supplies an internal queue consumer.
4. Check Queue delivery subscriptions and that `POST /api/lecture_jobs?action=create` returns 201 from the authenticated Vercel preview.
5. Upload pages sequentially, then start. Each step writes its state to the database and sends only the job UUID through Vercel Queues.
6. The random job token is returned once to the browser and only its SHA-256 digest is saved in PostgreSQL. The browser must keep the token in its private IndexedDB. No public listing endpoint is provided.

## Endpoints

- `POST /api/lecture_jobs?action=create`: `{title,total_pages}`.
- `POST /api/lecture_jobs?action=page`: `{job_id,page:{number,text,image?}}` and `X-MedNote-Job-Token`.
- `POST /api/lecture_jobs?action=start`: `{job_id}` and job token.
- `GET /api/lecture_jobs?action=status&id=<job_uuid>` and job token.

## Limits and risks

The page JPEG limit is 1.45 MB and server POST limit is 2.2 MB; 300 pages maximum. The browser locally extracts PDF text and renders page JPEGs. The server carries out Gemini image analysis, planning, verification, and lesson generation on independent queue deliveries.

No managed database has been provisioned by this code change. Until `DATABASE_URL` exists, the API intentionally returns `DATABASE_NOT_CONFIGURED` (503), and the original browser-managed lecture flow is available. Server-side processing, queue subscriptions, real provider availability and permissions require deployment-specific integration tests before release.

A job token is a capability: losing it loses access. Do not share screenshots or URLs containing tokens. For multi-user production rollout, integrate actual accounts and row-level user authorization; deployment protection alone is not sufficient.
