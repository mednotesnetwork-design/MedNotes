-- MedNote Shared Intelligence v1
-- Run against a provisioned private PostgreSQL database; no student upload is
-- automatically published. Publishing needs verified distribution rights.
CREATE TABLE IF NOT EXISTS mednote_shared_lectures (
  scope text NOT NULL CHECK (scope IN ('uqu','global')),
  digest_kind text NOT NULL CHECK (digest_kind IN ('file','text')),
  digest char(64) NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  title text NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
  snapshot jsonb NOT NULL,
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version >= 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','withdrawn')),
  rights_basis text NOT NULL CHECK (length(rights_basis) BETWEEN 20 AND 1000),
  review_state text NOT NULL DEFAULT 'educational_unreviewed'
    CHECK (review_state IN ('educational_unreviewed','clinician_approved')),
  curator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (scope,digest_kind,digest)
);
CREATE INDEX IF NOT EXISTS mednote_shared_lectures_approved
  ON mednote_shared_lectures(digest_kind,digest)
  WHERE status='approved';
CREATE TABLE IF NOT EXISTS mednote_shared_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  concept_key text NOT NULL CHECK (concept_key ~ '^[a-z0-9_-]{2,80}$'),
  kind text NOT NULL CHECK (kind IN ('video','image','interactive3d')),
  version integer NOT NULL DEFAULT 1 CHECK (version>=1),
  title text NOT NULL,
  url text NOT NULL CHECK (url ~ '^https://'),
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','withdrawn')),
  rights_basis text NOT NULL CHECK (length(rights_basis) BETWEEN 20 AND 1000),
  medical_review text NOT NULL DEFAULT 'pending' CHECK (medical_review IN ('pending','clinician_approved','withdrawn')),
  reviewer_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (concept_key,kind,version),
  CHECK (medical_review <> 'clinician_approved' OR reviewer_id IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS mednote_shared_media_lookup ON
  mednote_shared_media(concept_key,kind) WHERE status='approved' AND medical_review='clinician_approved';
-- Candidate prices only: 100 halalas = 1 SAR. No payment or subscription activation
-- is performed until authenticated users and a verified payment webhook exist.
CREATE TABLE IF NOT EXISTS mednote_student_plans (
  code text PRIMARY KEY CHECK (code IN ('free','student','student_plus')),
  price_halalas integer NOT NULL CHECK (price_halalas BETWEEN 0 AND 10000),
  shared_access boolean NOT NULL DEFAULT true,
  monthly_custom_video_credits integer NOT NULL DEFAULT 0 CHECK (monthly_custom_video_credits BETWEEN 0 AND 20),
  billing_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO mednote_student_plans(code,price_halalas,shared_access,monthly_custom_video_credits,billing_enabled)
VALUES ('free',0,true,0,false),('student',900,true,0,false),('student_plus',1900,true,2,false)
ON CONFLICT (code) DO NOTHING;
-- Private subscriber records and webhooks must not be simulated without auth.

-- Human clinical approval is a separate offline audit action; the curator
-- merely stages an asset, and the student-facing API never has approval rights.
CREATE TABLE IF NOT EXISTS mednote_shared_media_approval_audit(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_id uuid NOT NULL REFERENCES mednote_shared_media(id),
  action text NOT NULL CHECK (action IN ('approved','rejected','withdrawn')),
  clinician_id text NOT NULL CHECK(length(clinician_id) BETWEEN 5 AND 180),
  clinician_credential text NOT NULL CHECK(length(clinician_credential) BETWEEN 5 AND 180),
  media_sha256 char(64) NOT NULL CHECK(media_sha256 ~ '^[a-f0-9]{64}$'),
  clinical_notes text NOT NULL CHECK(length(clinical_notes) BETWEEN 20 AND 5000),
  reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mednote_shared_media_review_lookup
 ON mednote_shared_media_approval_audit(media_id,reviewed_at DESC);
-- Publishing privileges are restricted to trusted offline curator and clinician
-- roles. Server-side API identity does not grant billing or medical approval.
