CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  phone_country text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- One row per code sent. Codes are stored as HMACs, never in plain text.
CREATE TABLE otp_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_challenges_phone_created_at ON otp_challenges (phone, created_at DESC);
