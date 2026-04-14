-- Migration: 001_initial_schema
-- Description: Core tables for imok MVP

-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────
-- USERS
-- ─────────────────────────────────────────────
CREATE TABLE users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    phone             TEXT        UNIQUE NOT NULL,
    name              TEXT        NOT NULL,
    timezone          TEXT        NOT NULL DEFAULT 'Asia/Bangkok',
    checkin_time      TIME        NOT NULL DEFAULT '09:00',
    grace_period_min  INT         NOT NULL DEFAULT 120
                                  CHECK (grace_period_min BETWEEN 30 AND 480),
    is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_phone ON users (phone);
CREATE INDEX idx_users_is_active ON users (is_active) WHERE is_active = TRUE;

-- ─────────────────────────────────────────────
-- CONTACTS
-- ─────────────────────────────────────────────
CREATE TABLE contacts (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT        NOT NULL,
    phone             TEXT        NOT NULL,
    email             TEXT,
    notify_via_push   BOOLEAN     NOT NULL DEFAULT FALSE,
    notify_via_sms    BOOLEAN     NOT NULL DEFAULT TRUE,
    notify_via_email  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT contacts_at_least_one_channel
        CHECK (notify_via_push OR notify_via_sms OR notify_via_email)
);

CREATE INDEX idx_contacts_user_id ON contacts (user_id);

-- ─────────────────────────────────────────────
-- DEVICES (FCM tokens)
-- ─────────────────────────────────────────────
CREATE TABLE devices (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fcm_token   TEXT        UNIQUE NOT NULL,
    platform    TEXT        NOT NULL CHECK (platform IN ('ios', 'android')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_devices_user_id ON devices (user_id);

-- ─────────────────────────────────────────────
-- CHECKINS
-- ─────────────────────────────────────────────
CREATE TYPE checkin_status AS ENUM ('pending', 'confirmed', 'escalated', 'skipped');

CREATE TABLE checkins (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for TIMESTAMPTZ    NOT NULL,
    confirmed_at  TIMESTAMPTZ,
    escalated_at  TIMESTAMPTZ,
    status        checkin_status NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_checkins_user_id ON checkins (user_id);
CREATE INDEX idx_checkins_scheduled_for ON checkins (scheduled_for);
CREATE INDEX idx_checkins_status ON checkins (status) WHERE status = 'pending';

-- ─────────────────────────────────────────────
-- PAUSES
-- ─────────────────────────────────────────────
CREATE TABLE pauses (
    id           UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pause_from   DATE  NOT NULL,
    pause_until  DATE  NOT NULL,
    reason       TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pauses_valid_range CHECK (pause_from <= pause_until)
);

CREATE INDEX idx_pauses_user_id ON pauses (user_id);
CREATE INDEX idx_pauses_range ON pauses (pause_from, pause_until);

-- ─────────────────────────────────────────────
-- NOTIFICATION LOG
-- ─────────────────────────────────────────────
CREATE TYPE notification_channel AS ENUM ('push', 'sms', 'email');
CREATE TYPE notification_recipient_type AS ENUM ('user', 'contact');
CREATE TYPE notification_status AS ENUM ('sent', 'delivered', 'failed');

CREATE TABLE notification_log (
    id             UUID                       PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id     UUID                       REFERENCES checkins(id) ON DELETE SET NULL,
    recipient_type notification_recipient_type NOT NULL,
    recipient_id   UUID                       NOT NULL,
    channel        notification_channel       NOT NULL,
    status         notification_status        NOT NULL,
    sent_at        TIMESTAMPTZ                NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_log_checkin_id ON notification_log (checkin_id);
CREATE INDEX idx_notification_log_sent_at ON notification_log (sent_at DESC);
