-- MedNote medical reference index; apply only to a provisioned private Postgres DB
-- with the pgvector extension. Never ingest student notes into this shared index.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS mednote_medical_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code text NOT NULL UNIQUE CHECK (length(reference_code) BETWEEN 3 AND 100),
  title text NOT NULL CHECK (length(title) BETWEEN 3 AND 250),
  publisher text NOT NULL,
  version text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https://'),
  rights_basis text NOT NULL CHECK (length(rights_basis) BETWEEN 5 AND 500),
  content_sha256 text NOT NULL CHECK (content_sha256 ~ '^[a-f0-9]{64}$'),
  curator_approved boolean NOT NULL DEFAULT FALSE,
  active boolean NOT NULL DEFAULT FALSE,
  curator_identity text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((curator_approved=FALSE AND approved_at IS NULL)
      OR (curator_approved=TRUE AND curator_identity IS NOT NULL AND approved_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS mednote_medical_reference_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES mednote_medical_references(id) ON DELETE CASCADE,
  section text NOT NULL,
  locator text NOT NULL,
  content text NOT NULL CHECK (length(content) BETWEEN 30 AND 2500),
  embedding vector(768) NOT NULL,
  embedding_model text NOT NULL DEFAULT 'gemini-embedding-001',
  active boolean NOT NULL DEFAULT TRUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (embedding_model='gemini-embedding-001')
);
CREATE INDEX IF NOT EXISTS mednote_medical_reference_chunks_reference
 ON mednote_medical_reference_chunks(reference_id);
-- Exact nearest-neighbor search works for a modest curated corpus.
-- Add an HNSW cosine index after provisioned DB measurements justify it.

CREATE TABLE IF NOT EXISTS mednote_clinical_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_digest text NOT NULL CHECK (module_digest ~ '^[a-f0-9]{64}$'),
  action text NOT NULL CHECK (action IN ('approved','rejected','withdrawn')),
  clinician_id text NOT NULL CHECK (length(clinician_id) BETWEEN 5 AND 180),
  clinician_credential text NOT NULL CHECK (length(clinician_credential) BETWEEN 5 AND 180),
  reference_codes jsonb NOT NULL,
  notes text NOT NULL CHECK (length(notes) BETWEEN 20 AND 5000),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mednote_clinical_review_audit_module
 ON mednote_clinical_review_audit(module_digest,reviewed_at DESC);
-- Audit rows are append-only by policy and DB privileges. Do NOT grant
-- INSERT, UPDATE, or DELETE to web/AI runtime roles.

CREATE TABLE IF NOT EXISTS mednote_reference_review_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES mednote_medical_references(id),
  action text NOT NULL CHECK (action IN ('approved','deactivated')),
  operator_identity text NOT NULL,
  rights_basis_verified boolean NOT NULL,
  source_version_verified boolean NOT NULL,
  notes text NOT NULL CHECK (length(notes)>=20),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mednote_reference_review_reference
 ON mednote_reference_review_audit(reference_id,created_at DESC);
-- Restrict both audit tables to SELECT for the AI service. A separate DB
-- role for a verified curator writes audit approvals outside the web app.
