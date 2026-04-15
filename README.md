# imok — I'm OK

Daily check-in app for people living alone. Each day you get a push notification with one button: **I'm OK**. If you don't respond in time, your emergency contacts are notified via SMS.

Primary audience: elderly expats living alone in Southeast Asia.

---

## Stack

| Layer | Technology |
|---|---|
| Mobile | React Native + Expo SDK 54 (iOS & Android) |
| API | Node.js + Fastify v5, TypeScript ESM |
| Database | PostgreSQL via Supabase |
| Job Queue | BullMQ + Redis |
| Push | Firebase Admin SDK (FCM) |
| SMS | Twilio |
| Monorepo | Turborepo + npm workspaces |

---

## Project Structure

```
imok/
├── apps/
│   ├── api/          # Fastify API server
│   └── mobile/       # Expo React Native app
├── packages/
│   └── shared/       # Shared TypeScript types
└── supabase/
    └── migrations/   # PostgreSQL migrations
```

---

## Local Development

### Prerequisites

- Node.js 20+
- Docker (for Supabase + Redis)
- Supabase CLI

### Setup

```bash
# 1. Clone and install
git clone git@github.com:shataev/imok.git
cd imok
npm install

# 2. Start Supabase (PostgreSQL)
supabase start

# 3. Start Redis
docker run -d --name imok-redis -p 6379:6379 redis:7-alpine

# 4. Configure environment
cp .env.example .env
# Fill in the values (see Environment Variables below)

# 5. Start API + mobile
npm run dev
```

### Mobile (separate terminal)

```bash
cd apps/mobile
npx expo start --clear
```

Scan the QR code with Expo Go (development) or use `npx expo run:ios` for a dev build with FCM.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# JWT
JWT_SECRET=                    # min 32 chars
JWT_REFRESH_SECRET=            # min 32 chars

# Database (from `supabase start` output)
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# Redis
REDIS_URL=redis://localhost:6379

# Firebase FCM (from Firebase Console → Service Accounts → Generate key)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Twilio (from twilio.com/console)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_FROM_NUMBER=            # E.164 format, e.g. +13202284457
```

Firebase and Twilio credentials are optional for local dev — the app falls back to console.log when they are set to placeholder values.

---

## Check-in Lifecycle

```
Daily at user's check-in time (local timezone)
│
├── Create checkin record (status: pending)
├── Send push notification → "Are you OK today?"
│
│   [User taps "I'm OK"]
│   └── status: confirmed ✓
│
│   [No response within grace period]
│   ├── Send reminder push
│   │
│   │   [Still no response after 30 min]
│   │   ├── status: escalated
│   │   └── SMS to all emergency contacts
│   │
│   [User has an active pause]
│   └── status: skipped
```

---

## API Endpoints

```
POST   /auth/request-otp        Send OTP to phone
POST   /auth/verify-otp         Verify OTP → JWT
POST   /auth/refresh            Refresh access token

GET    /user/me                 Get profile
PATCH  /user/me                 Update profile
DELETE /user/me                 Delete account

GET    /contacts                List contacts
POST   /contacts                Add contact
PATCH  /contacts/:id            Update contact
DELETE /contacts/:id            Remove contact

GET    /checkins/today          Today's check-in status
POST   /checkins/confirm        Confirm today's check-in
GET    /checkins                Check-in history

GET    /pauses                  List pauses
POST   /pauses                  Create pause
DELETE /pauses/:id              Delete pause

POST   /devices                 Register FCM device token
DELETE /devices/:token          Unregister device

POST   /twilio/sms              Twilio inbound SMS webhook (STOP opt-out)
```

---

## Roadmap

- **MVP (Weeks 1–8):** Core check-in loop, push + SMS notifications ✅
- **Phase 2:** Contact web page, multiple check-in times, App Store release
- **Phase 3:** Premium subscription (RevenueCat)
- **Phase 4:** Apple Watch, multi-language, B2B white-label
