# MedNote Core AI — Evidence & Human Review

## Current state (be precise)

This change affects only the lecture Studio, not Research Mentor or the MedNote theme. Gemini review is NOT clinician approval. The medical vector index and human-review database are NOT provisioned in the current preview. A code path supporting RAG is not the same as a connected, populated, validated RAG service.

## Four learning layers

Each fresh MedNote Core AI lesson must contain (1) foundation: what it is and why it matters; (2) anatomy: actual cellular/macroscopic structures and visual orientation; (3) mechanism: time-ordered scientific micro-steps, visual highlights, motion and scene transition; (4) clinical: high-yield relevance and supported pathological findings. Every layer includes citation IDs back to the uploaded slide source. If the lecture does not support a layer, coverage is not_in_source with no invented content. Exact medical units, values, equations, negations and terminology must survive unchanged. Old cached lessons require a manual rebuild.

## Curator-approved RAG pipeline — OFF until provisioned

1. Provision private PostgreSQL/pgvector and apply sql/mednote_medical_evidence.sql with a migration role. Grant the web runtime SELECT-only access to reference and audit tables; do NOT grant web/LLM runtime rights to approve clinical content.
2. Only a verified curator may stage short excerpts from legally permitted, versioned clinical references. Use a JSON manifest containing reference_code, title, publisher, version, official HTTPS url, rights_basis and a sections array of objects with section, locator and content. Never import entire unlicensed books or student/patient records into the shared corpus.
3. Run a trusted-operator command: python scripts/curate_medical_reference.py stage /trusted/reference.json . This creates embeddings through the existing Gemini/Cloudflare gateway and stores the reference INACTIVE.
4. After independent edition, clinical-content and publishing-rights verification, run: python scripts/curate_medical_reference.py approve REF_CODE --operator VERIFIED_OPERATOR --notes "Rights and edition verified by curator; reference excerpts checked against source" --confirmed-rights-and-edition .
5. Add DATABASE_URL to the private server runtime and set MEDNOTE_MEDICAL_RAG=on only after schema, curated passages, permissions and embeddings are confirmed. No public endpoints for curation or approval.

The retriever returns explicit states: not_configured, unavailable, no_match, retrieved. It never claims citation verification merely because an LLM gave a plausible medical answer or a vector similarity score.

## Clinician review — separate from AI

The server computes a SHA-256 digest tied to both uploaded lecture content and generated medical teaching content. Review remains pending until an independently verified, qualified clinician reviews the exact digest and submits an append-only audit event from a trusted operator context.

Example operator-only signoff: python scripts/clinical_signoff.py approved DIGEST --clinician-id VERIFIED_ID --credential VERIFIED_LICENSE --reference-code REF_CODE --notes "The exact module, all clinical figures and medical references have been checked by a qualified reviewer" --verified-clinician-and-content .

Latest approved/rejected/withdrawn audit event controls the trusted status. Medical licensure and content verification must be independently checked by an accountable operations process; entering a string is not cryptographic proof of licensure. Until approved, UI remains explicitly educational and clinical recommendations are not trusted for patient care.

## Release criteria

A successful Vercel build proves compilation only. Before any clinical release: provision the vector DB, add permitted curated medical references, calibrate retrieval thresholds, test Gemini embedding gateway connectivity and full-lecture coverage, run source-line-level scientific checks, validate all dosages/diagnoses with clinicians, and test unauthorized approval and withdrawal. Realistic clinical video generation and independent 3D medical media generation are NOT implemented by this evidence layer. The code provides a reviewable integration path, not a production-ready or certified medical product.
