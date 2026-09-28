# MedNote study route — source of truth (2026-09-27)

Existing MedNote Vercel preview + Python API →
Cloudflare AI Gateway provider-native endpoint → Gemini. Same app and domains.
No Vercel AI Gateway, OpenAI or Claude request path is enabled.

## Server environment (existing `med-notes` Vercel project)

- `GEMINI_API_KEY`: optional when already stored in Cloudflare Provider Keys; reuse that key, never copy it into the client.
- `CLOUDFLARE_ACCOUNT_ID`: account owning the gateway.
- `CLOUDFLARE_AI_GATEWAY_ID`: gateway slug.
- `CLOUDFLARE_AI_GATEWAY_TOKEN`: encrypted, scoped gateway-run credential.
- `MEDNOTE_GEMINI_MODEL`: optional, defaults to `gemini-3.8-flash`, the existing project's Flash model. Flash-Lite returned repeated `503 UNAVAILABLE` during live verification; no paid third-party fallback is enabled.

Cloudflare authentication is required. Missing configuration fails closed with
`STUDY_CONFIGURATION_REQUIRED`; there is no implicit direct or paid fallback.
Both study APIs invoke the existing reviewed engines inside MedNote. The independent
legacy Research deployment is preserved and is not part of this request path.

## Gateway settings required before activation

Apply `cloudflare-gateway.settings.json` (not yet applied to an account).
Require provider-owned credentials (`byok_only`) to prevent Unified Billing.
Enable authentication, logging and a sliding rate limit of 20 model requests
per 60 seconds for the private gateway. Disable response caching. Runtime request
headers bound attempts to 2 with 700ms exponential backoff, provider timeout to
25s, and application socket timeout to 58s (240s workflow deadline).
No application transport retry multiplies Gateway retries. Lecture repair is
limited to one rewrite + re-review (at most 4 calls); Research retains its existing
reviewed engine and 8-call maximum. Maximum output is 6144 tokens/call.

Application admission adds at most 2 simultaneous workflows, 6/min and 30/hour
**per warm process**. This is supplementary and resets on cold starts; the Gateway
limit is the distributed enforcement. These are request/token limits, not a hard
currency budget. Do not describe them as a monthly spending cap. For future plans,
replace `admit_study` with atomic durable user/plan reservations and usage commits.
Subscriptions and paid fallback are deliberately not implemented.

## Slide contract

PDF stays on device. The current page is rendered to JPEG and its text extracted;
image uploads are rendered to JPEG. Every request sends the full current slide,
selected text, bounded neighboring context and conversation. Region selection
sends normalized bounds and a second detail image, never replaces the full slide.
Both generation and review see both images as native `inlineData` parts. Combined
images are bounded below the existing 3MB request boundary. No provider secrets
or names are needed by the client. Arbitrary remote image URLs are not accepted.

## Deployment and verification gate

1. Configure the existing gateway and server variables above.
2. Deploy the integrated study branch to existing `med-notes` preview project.
3. Exercise Research and Lecture through the existing protected MedNote preview.
4. Test a PDF/text selection, image-region selection, follow-up, Quiz and Visual.
5. Verify `lecture_input` records full image and nonzero selection length, then
   `study_completed` route `cloudflare-gemini`; inspect MedNote runtime 4xx/5xx.
6. Only claim completion after responses appear in the interface. Local mocks
   validate the contract but are not evidence of live inference.

Runtime logs contain request IDs, status, input lengths, image booleans, call
counts and latency; never keys, prompts, slides or provider error bodies. Gateway
logging retention/content visibility must be reviewed for private lecture data.

Official contracts:
- https://developers.cloudflare.com/ai-gateway/usage/providers/google-ai-studio/
- https://developers.cloudflare.com/ai-gateway/configuration/request-handling/
- https://developers.cloudflare.com/ai-gateway/features/rate-limiting/
- https://ai.google.dev/gemini-api/docs/models/gemini-3.1-flash-lite
