# MedNote integrated study workspace

Continues `mednotesnetwork-design/MedNotes` at base commit 8377677. The original flattened export files remain, and `src/` restores the layout required by its existing imports. Existing brand, pages, social UI and atlas assets are retained. No new standalone product or provider credentials were created.

## Routes

- `/`: existing MedNote home plus three study entry points.
- `/research`: frozen Research Mentor V1 adapter; project fields and conversation stored in IndexedDB. Explicitly approved proposals create a dated decision log with the student's source quote. Translation scientific warnings render separately.
- `/lectures`: PDF/TXT or pasted slides, original slide, local notes and saved page, source-mode selector, term/selection explanation, quote-linked mechanism steps, MCQs with each option explained, slide map and atlas deep links. Authored three-slide radial nerve journey works without inference and is explicitly marked as an authored example, not an AI result.
- `/anatomy?structure=radial-nerve`: integrated existing atlas, selected nerve, source-derived models, existing search/layers/attachments/quiz/clinical information. Return link restores the saved lecture page and notes.
- `/api/research` and `/api/lecture`: server-only proxy to the existing Research Mentor service; only the student's invitation is forwarded. Provider key remains on the original server.

## Honest boundaries

No browser end-to-end pass or new deployment is claimed. Production builds succeeded; see verification.json for current type check. Cloud browser could not reach the local app. The direct deployment operation is no longer exposed by the connected Vercel service, and GitHub writes returned 403 Resource not accessible by integration. Current main Vercel project was already in ERROR before this change. Do not claim its existing URL displays this branch.

PDF images have no OCR/vision analysis. Lecture map headings come from extracted slide text; mechanisms/exam questions are available after explanation, or in the authored example. The frozen Mentor has no live literature retrieval. No cloud account/project synchronization has been implemented; IndexedDB is device-local. Existing social backend was absent from the supplied export: its adapter returns explicit service errors rather than fabricated records or successful writes. Some anatomy records lack meshes; complete sensory surface visualization and anatomically validated movement rigs remain unavailable. Z-Anatomy/BodyParts3D attribution and licenses are retained in public/models/LICENSES.txt and public/data. Source-derived geometry is not independently expert-validated.

## Verification and release

`npm ci`, `npm run typecheck`, `npm run build`.

After authorization, push this branch to the SAME repository and deploy to the existing `med-notes` project (`prj_dT9NAYLBPnEoycEcHwubhYuqLTtn`), team `team_AFVDGm6j1rt0LhzRVtjltMgN`. Use vercel.json, Vite build, dist output and Python API functions. Do not replace the separate READY project named `mednotes` without reviewing its provenance.

Deploy the accompanying Research Mentor hosting source to the SAME `research-mentor` project. It adds lecture source-mode enforcement and extends only student invitation access to 2026-10-21. Evaluator access and the scientific evolution hard end remain 2026-09-21. All 17 frozen V1 source hashes and all 114 benchmark cases are unchanged. This product branch is not a scientific promotion.

Release acceptance: on mobile, open the sample lecture, answer a checkpoint, advance a slide, open radial nerve in 3D, return and verify the exact slide/answers/notes. Upload a real PDF and confirm original rendering + source text. Test both source modes with one bounded live request; label provider failure honestly. Test Mentor project persistence and separately displayed translation warning. Verify route deep links, model downloads, no invitation leakage and no provider secrets in dist. Recheck original pages' honest unavailable-service state.

## Main-project continuation — 2026-09-22
The user rejected the temporary atlas-hosted preview as the delivery target.
Continue only the canonical mednotesnetwork-design/MedNotes deployment.
No additional standalone project was created or published in this continuation.
Changes: per-slide question/source-mode persistence, previous reviewed explanation history,
manual methodology decisions with rationale included in research state, immediate research
state saving on navigation, and session restoration of atlas selection/layers/bone mode.
Frozen V1 scientific configuration remains unchanged. These are product improvements,
not evidence of scientific improvement.
Deployment remains blocked: GitHub installations returned empty and Vercel deploy returned
Tool deploy_to_vercel not found. Required account capability: authorize repository write
access for mednotesnetwork-design/MedNotes via GitHub integration; provider keys are not needed.

## Slide-first study update — 2026-09-24

Lecture Explainer now centers the original PDF/text slide with text selection, a pointer-drawn image crop, Explain, per-slide follow-up conversations, and optional Quiz/Visual/3D/notes tabs. Existing saved lectures migrate without clearing IndexedDB. Image requests send only the current slide or selected crop; the whole PDF stays local. The original authored sample remains labeled as such.

Browser invitation entry was removed. The MedNote preview API now forwards Vercel's signed runtime workload identity to the existing Research Mentor service. `services/research-mentor/` holds the existing service deployment source, plus JWT validation restricted to MedNote's project, team and preview environment. Provider configuration and frozen V1 engine modules remain unchanged. The evaluator endpoint retains its original policy. No secrets are committed.

Release dependency: deploy `services/research-mentor/` to EXISTING project `prj_sTnkTHAM39XMr4dNXrrEn7u07qsQ` with its existing environment, and verify MedNote receives `x-vercel-oidc-token` at runtime. No new project, provider setup or client key is required. Without this backend release, direct AI requests will fail honestly; a successful frontend build does not prove AI activation. The connected deployment operation currently returns Tool not found, and browser deployment is blocked by sign-in. The environment-variable page was not opened after automatic approval rejected possible secret exposure.

Verified locally: TypeScript, production build, Python compile; 8 tests cover signed identity, wrong project/environment/audience/expiry/signature rejection, image attachment to generation/review, source quote checks, no invitation forwarding, and cross-origin rejection. No live Gemini inference or browser end-to-end pass is claimed for this update.
