-- Migration: 003_contacts_opted_out
-- Description: Add opted_out field to contacts for SMS opt-out support

ALTER TABLE contacts ADD COLUMN opted_out BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE contacts ADD COLUMN opted_out_at TIMESTAMPTZ;

-- Track opt-out requests by phone (contacts who replied STOP)
CREATE TABLE sms_opt_outs (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone      TEXT        UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sms_opt_outs_phone ON sms_opt_outs (phone);
