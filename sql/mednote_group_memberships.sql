-- MedNote student group passes, 60 days, one plan and 1-3 separate accounts.
-- No billing, email sending, or user provisioning is enabled by this migration.
CREATE TABLE IF NOT EXISTS mednote_group_price_tiers (
  tier_size smallint PRIMARY KEY CHECK (tier_size IN (1,2,3)),
  price_per_student_halalas integer NOT NULL CHECK (price_per_student_halalas BETWEEN 100 AND 10000),
  access_days smallint NOT NULL DEFAULT 60 CHECK (access_days=60),
  currency char(3) NOT NULL DEFAULT 'SAR' CHECK (currency='SAR'),
  enabled_for_checkout boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO mednote_group_price_tiers(tier_size,price_per_student_halalas,access_days,enabled_for_checkout)
VALUES (1,1800,60,false),(2,1500,60,false),(3,1200,60,false)
ON CONFLICT (tier_size) DO UPDATE SET price_per_student_halalas=EXCLUDED.price_per_student_halalas,
    access_days=EXCLUDED.access_days,enabled_for_checkout=false,updated_at=now();

CREATE TABLE IF NOT EXISTS mednote_membership_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_subject text NOT NULL CHECK (length(owner_subject) BETWEEN 8 AND 180),
  state text NOT NULL DEFAULT 'collecting'
    CHECK (state IN ('collecting','ready_for_payment','active','expired','cancelled')),
  price_locked_per_student_halalas integer,
  price_locked_group_size smallint CHECK (price_locked_group_size BETWEEN 1 AND 3),
  access_days smallint NOT NULL DEFAULT 60 CHECK (access_days=60),
  activation_time timestamptz,
  expiry_time timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((state NOT IN ('active','expired'))
      OR (activation_time IS NOT NULL AND expiry_time=activation_time+interval '60 days')),
  CHECK (price_locked_per_student_halalas IS NULL OR
         (price_locked_per_student_halalas BETWEEN 100 AND 10000
          AND price_locked_group_size IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS mednote_membership_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES mednote_membership_groups(id) ON DELETE RESTRICT,
  invited_email_normalized text NOT NULL CHECK (length(invited_email_normalized) BETWEEN 5 AND 254),
  token_sha256 char(64) NOT NULL UNIQUE CHECK(token_sha256 ~ '^[a-f0-9]{64}$'),
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','accepted','declined','expired','revoked')),
  accepted_subject text,
  accepted_email_verified boolean NOT NULL DEFAULT false,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  CHECK ((state='accepted')=(accepted_subject IS NOT NULL AND
                             accepted_email_verified AND accepted_at IS NOT NULL)),
  CHECK (expires_at > invited_at)
);
CREATE UNIQUE INDEX IF NOT EXISTS mednote_membership_invitation_per_group_email
 ON mednote_membership_invitations(group_id,invited_email_normalized)
 WHERE state IN ('pending','accepted');
CREATE UNIQUE INDEX IF NOT EXISTS mednote_membership_invitation_per_group_subject
 ON mednote_membership_invitations(group_id,accepted_subject)
 WHERE state='accepted';
CREATE INDEX IF NOT EXISTS mednote_membership_invitation_group
 ON mednote_membership_invitations(group_id,state);

CREATE TABLE IF NOT EXISTS mednote_membership_entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES mednote_membership_groups(id) ON DELETE RESTRICT,
  student_subject text NOT NULL,
  charged_halalas integer NOT NULL CHECK(charged_halalas BETWEEN 100 AND 10000),
  currency char(3) NOT NULL DEFAULT 'SAR' CHECK(currency='SAR'),
  payment_provider text NOT NULL,
  verified_payment_event_id text NOT NULL UNIQUE,
  begins_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id,student_subject),
  CHECK (ends_at=begins_at+interval '60 days')
);
-- Payment entitlements MUST be issued by a separately authenticated provider
-- webhook with signature validation. Do not grant INSERT to the web runtime.
-- Invite tokens MUST be random, hashed, short-lived and bound to authenticated
-- and independently verified student identity. Do not expose these tables.
