# Technical Plan — imok (I'm OK)

**Version:** 1.0  
**Date:** 2026-04-03  
**Status:** Draft

---

## 1. Overview

imok is a daily check-in mobile application for people living alone. Each day the user receives a push notification with a single "I'm OK" button. If the user does not respond within a configured time window, the app notifies their emergency contacts via push notification and SMS.

Primary target audience: elderly expats living alone in Southeast Asia (Pattaya, Chiang Mai, Hua Hin).

---

## 2. Goals & Success Metrics

| Goal | Metric | Target (Month 3) |
|---|---|---|
| Daily active usage | DAU / MAU ratio | > 70% |
| Notification response rate | % of check-ins confirmed | > 85% |
| False alarm rate | Escalations that turned out to be false | < 5% |
| Onboarding completion | Users who add at least 1 contact | > 80% |

---

## 3. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Mobile App                           │
│              (React Native / Expo)                      │
│           iOS 15+  ·  Android 10+                       │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS / REST
┌──────────────────────▼──────────────────────────────────┐
│                  API Server                             │
│               (Node.js + Fastify)                       │
│              Deployed on Railway / Fly.io               │
└───────┬────────────────────────────┬────────────────────┘
        │                            │
┌───────▼────────┐        ┌──────────▼──────────┐
│  PostgreSQL    │        │   Job Scheduler      │
│  (Supabase)   │        │   (BullMQ + Redis)   │
└────────────────┘        └──────────┬───────────┘
                                     │
                    ┌────────────────┼──────────────────┐
                    │                │                  │
           ┌────────▼──────┐  ┌─────▼──────┐  ┌───────▼──────┐
           │ Firebase FCM  │  │   Twilio   │  │  SendGrid    │
           │ (Push Notif.) │  │   (SMS)    │  │  (Email)     │
           └───────────────┘  └────────────┘  └──────────────┘
```

### Why this stack

| Choice | Reason |
|---|---|
| React Native + Expo | Single codebase for iOS and Android, fast iteration, OTA updates |
| Node.js + Fastify | Fast, lightweight, good ecosystem for async jobs |
| PostgreSQL (Supabase) | Managed, includes auth, realtime, and REST out of the box |
| BullMQ + Redis | Reliable job queuing for scheduling daily check-ins per user |
| Firebase FCM | Free, reliable push delivery for both iOS and Android |
| Twilio | SMS fallback for contacts who do not have a smartphone |

---

## 4. Data Model

```sql
-- Users who use the app to check in
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone           TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    timezone        TEXT NOT NULL DEFAULT 'Asia/Bangkok',
    checkin_time    TIME NOT NULL DEFAULT '09:00',   -- local time for daily notification
    grace_period_min INT NOT NULL DEFAULT 120,        -- minutes to wait before escalation
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emergency contacts (may or may not have the app)
CREATE TABLE contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL,          -- used for SMS fallback
    email           TEXT,
    notify_via_push BOOLEAN NOT NULL DEFAULT FALSE,
    notify_via_sms  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_via_email BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One record per day per user
CREATE TABLE checkins (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scheduled_for   TIMESTAMPTZ NOT NULL,
    confirmed_at    TIMESTAMPTZ,            -- NULL = not confirmed yet
    escalated_at    TIMESTAMPTZ,            -- NULL = no escalation triggered
    status          TEXT NOT NULL DEFAULT 'pending',
                    -- pending | confirmed | escalated | skipped
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, scheduled_for::DATE)
);

-- Temporary pauses (vacation, hospital, etc.)
CREATE TABLE pauses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pause_from      DATE NOT NULL,
    pause_until     DATE NOT NULL,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Log of all notifications sent
CREATE TABLE notification_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checkin_id      UUID REFERENCES checkins(id),
    recipient_type  TEXT NOT NULL,  -- 'user' | 'contact'
    recipient_id    UUID NOT NULL,
    channel         TEXT NOT NULL,  -- 'push' | 'sms' | 'email'
    status          TEXT NOT NULL,  -- 'sent' | 'delivered' | 'failed'
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 5. Core Logic — Check-in Lifecycle

```
Every day at user's checkin_time (local timezone):
│
├─ Create checkin record (status: pending)
├─ Send push notification → "Are you OK today? Tap to confirm."
│
│  [User taps "I'm OK"]
│  └─ Update checkin status: confirmed ✓ — done for the day
│
│  [No response within grace_period_min]
│  ├─ Send second push notification (reminder)
│  │
│  │  [Still no response within 30 min]
│  │  ├─ Update checkin status: escalated
│  │  ├─ Send push to contacts (if they have the app)
│  │  ├─ Send SMS to all contacts: "We haven't heard from [Name] today.
│  │  │   Please check in on them."
│  │  └─ Send email (if configured)
│  │
│  │  [User is on pause for today]
│  └─ Skip checkin (status: skipped)
```

---

## 6. API Endpoints

### Auth
```
POST   /auth/request-otp        Send OTP to phone number
POST   /auth/verify-otp         Verify OTP, return JWT
POST   /auth/refresh            Refresh JWT token
```

### User
```
GET    /user/me                  Get current user profile
PATCH  /user/me                  Update profile (name, checkin_time, timezone, grace_period)
DELETE /user/me                  Delete account and all data
```

### Contacts
```
GET    /contacts                 List all contacts
POST   /contacts                 Add a contact
PATCH  /contacts/:id             Update a contact
DELETE /contacts/:id             Remove a contact
```

### Check-ins
```
GET    /checkins?from=&to=       Check-in history
POST   /checkins/confirm         Confirm today's check-in (called when user taps button)
GET    /checkins/today           Get today's check-in status
```

### Pauses
```
GET    /pauses                   List all pauses
POST   /pauses                   Create a pause (vacation etc.)
DELETE /pauses/:id               Cancel a pause
```

### Push tokens
```
POST   /devices                  Register/update FCM device token
DELETE /devices/:token           Unregister device
```

---

## 7. Mobile App — Screen Map

```
Onboarding
├── Welcome screen
├── Phone number entry + OTP verification
├── Profile setup (name, timezone, check-in time)
└── Add first contact (required to proceed)

Main (after onboarding)
├── Home
│   ├── Today's status card (pending / confirmed / escalated)
│   ├── "I'm OK" button (large, prominent — shown if pending)
│   └── Upcoming check-in time
├── Contacts
│   ├── Contact list
│   ├── Add / edit contact
│   └── Contact detail (notification settings)
├── History
│   └── Calendar view of past check-ins
├── Settings
│   ├── Check-in time
│   ├── Grace period
│   ├── Pause check-ins (date range picker)
│   ├── Notification preferences
│   └── Delete account

Push notification (received)
└── Tap → opens app → auto-confirms check-in OR shows Home screen
```

---

## 8. Key Edge Cases

| Scenario | Handling |
|---|---|
| Phone is off / no internet | FCM stores notification up to 28 days. If no delivery confirmation after grace_period, fall back to SMS escalation. |
| User travels and changes timezone | App detects timezone on open and prompts to update. Scheduler re-queues based on new timezone. |
| Contact doesn't have smartphone | SMS is the primary channel for contacts — no app required. |
| False alarm — user was asleep | Grace period (default 2 hours) + second reminder before escalation. User can configure this. |
| User in hospital / vacation | Pause feature: select date range, no notifications during pause. |
| Multiple contacts | All contacts are notified simultaneously on escalation. |
| User doesn't respond for 3+ days | Send email to account email if set, flag in admin dashboard. |

---

## 9. Security & Privacy

- **Authentication:** Phone number + OTP only. No passwords.
- **JWT:** Short-lived access tokens (1 hour) + refresh tokens (30 days).
- **Data encryption:** All data at rest encrypted (Supabase default). TLS in transit.
- **Minimal data collection:** No location tracking, no health data in MVP.
- **PDPA compliance** (Thailand Personal Data Protection Act): User must explicitly consent to data collection on signup. Right to delete account and all data.
- **Contact data:** Contacts are notified via SMS only — their phone numbers are stored but they do not need to consent to receive a single advisory SMS per incident. Include opt-out in SMS: "Reply STOP to opt out."
- **No data selling:** Explicit policy. Especially important for this demographic.

---

## 10. Infrastructure & Deployment

```
Production environment:
- API:      Fly.io (auto-scaling, $20–40/month at MVP scale)
- Database: Supabase Pro ($25/month, includes backups)
- Redis:    Upstash ($0–10/month at MVP scale)
- CDN/Assets: Cloudflare (free tier)

CI/CD:
- GitHub Actions: lint → test → deploy on merge to main
- Expo EAS Build: automated iOS/Android builds on push to main
- Environment: staging + production

Monitoring:
- Sentry (error tracking, free tier)
- Uptime: Better Uptime or UptimeRobot (free)
- Logs: Fly.io built-in
```

---

## 11. Roadmap

### Phase 1 — MVP (Weeks 1–8)

**Goal:** Working app with core check-in loop, deployable to TestFlight and Google Play (internal testing).

| Week | Deliverables |
|---|---|
| 1 | Project setup: monorepo, CI/CD, DB schema, API skeleton |
| 2 | Auth (phone + OTP), user profile CRUD |
| 3 | Contacts CRUD, FCM device registration |
| 4 | Scheduler: daily job per user, push notification send |
| 5 | Check-in confirmation flow (tap notification → confirm) |
| 6 | Escalation logic: grace period, second reminder, contact notification (push + SMS) |
| 7 | Pause feature, settings screen, history screen |
| 8 | QA, bug fixes, TestFlight + Play internal testing release |

**MVP is complete when:** A user can sign up, add a contact, receive a daily notification, confirm it, and when they don't confirm — the contact receives an SMS.

---

### Phase 2 — Stability & Retention (Weeks 9–16)

- Contact web page (no app needed — contact opens link to see user's last check-in status)
- Multiple check-in times per day (morning + evening)
- Improved notification reliability (delivery receipts, retry logic)
- Admin dashboard (internal): active users, escalation counts, error rates
- App Store public release (iOS + Android)
- Referral flow: user invites contact, contact can become a user

---

### Phase 3 — Monetization (Weeks 17–24)

- Premium subscription via RevenueCat (App Store / Play Store billing)
  - Free: 1 contact, 1 check-in/day
  - Premium ($4.99/month): unlimited contacts, multiple check-ins/day, email notifications, priority SMS
- Stripe for web-based subscription (for users who prefer not to pay via app store)
- Promo codes for community partners (British Club, etc.)

---

### Phase 4 — Expansion (Month 7+)

- Apple Watch app: one-tap confirmation from wrist
- Wear OS support
- Multi-language: English, Thai, German, French (expat demographics)
- B2B white-label: sell to expat insurance providers (ACS, Cigna, AXA)
- Expand to other expat hubs: Chiang Mai, Hua Hin, Bali, Spain, Portugal

---

## 12. Team & Roles

| Role | Responsibility |
|---|---|
| Full-stack developer | API, scheduler, database, infrastructure |
| Mobile developer | React Native app (iOS + Android) |
| UX designer | Screens, notification copy, onboarding flow |
| Product owner | Backlog, acceptance criteria, user testing |

Minimum viable team for MVP: 1 full-stack + 1 mobile developer.

---

## 13. Definition of Done (per ticket)

- Code reviewed and merged to main
- Unit tests written for business logic (scheduler, escalation)
- Manual QA on both iOS and Android (physical devices preferred)
- No Sentry errors introduced
- Staging deployment passes smoke tests before production deploy

---

## 14. Open Questions (to resolve before Week 1)

1. **App name & domain:** Is `imok.app` available? Decide on final name.
2. **Legal entity:** Which country to incorporate in for App Store / payments?
3. **Twilio number:** Which country code to send SMS from? Thai number preferred for local delivery.
4. **iOS developer account:** Who registers it? Takes up to 24h to activate.
5. **Beta testers:** Can we get 10–20 people from Pattaya expat community to test MVP?
6. **Paid or freemium from day one:** Start free to gather data, or charge early adopters from MVP?
