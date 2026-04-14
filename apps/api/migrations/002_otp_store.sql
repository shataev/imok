-- Migration: 002_otp_store
-- Description: Table for storing OTP codes (alternative to Redis for auditability)
-- Note: OTPs are short-lived (5 min TTL enforced via expires_at + cleanup job)

CREATE TABLE otp_requests (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       TEXT        NOT NULL,
    code_hash   TEXT        NOT NULL,  -- bcrypt hash of the 6-digit code
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_requests_phone ON otp_requests (phone);
CREATE INDEX idx_otp_requests_expires_at ON otp_requests (expires_at);

-- Cleanup function: delete expired OTPs (called by a scheduled job)
CREATE OR REPLACE FUNCTION cleanup_expired_otps() RETURNS void AS $$
BEGIN
    DELETE FROM otp_requests WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
