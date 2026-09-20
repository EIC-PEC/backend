# E-Summit 2026 — Backend API Engine

[![NestJS](https://img.shields.io/badge/NestJS-10.4-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.2+-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas_%2F_6.0+-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)

Production REST API, security pipeline, and data engine for **PEC E-Summit 2026** (E-Cell, Punjab Engineering College, Chandigarh). Powers the public experience portal (`frontend/`) and the operations command center (`admin/`).

---

## Architectural Highlights

- **Database**: MongoDB (via Prisma ORM 6 with Replica Set `rs0` for atomic transactions).
- **Authentication**: Stateless Passport JWT with Argon2id password hashing and refresh token rotation.
- **Ticketing Security**: Node.js Crypto HMAC-SHA256 digital signature minted for each `PEC-XXXXXX` pass with anti-replay state validation.
- **Media Uploads**: S3-compatible cloud object storage (`@aws-sdk/client-s3`) and Cloudinary CDN for festival assets.
- **Email Delivery**: Resend API integration for automated pass confirmation and ticket QR delivery.
- **Rate Limiting**: NestJS Throttler with memory store and Redis support.

---

## Module Status & Feature Matrix

| Module | Route Prefix | Primary Function | Auth / Access |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/v1/auth` | Registration, login, refresh rotation, profile (`/me`) | Public / Bearer JWT |
| **Registrations** | `/api/v1/registrations` | Pass catalog, `PEC-XXXXXX` pass minting, digital tickets | Public / Bearer JWT |
| **Payments** | `/api/v1/payments` | Razorpay order creation, signature verification, webhooks | Public / Razorpay Signature |
| **Gate Check-In** | `/api/v1/checkin` | Cryptographic HMAC QR verification, manual search, stats | Volunteer, Organizer, Admin |
| **Teams & Jury** | `/api/v1/teams` | Join codes (`HACK-XXXX`), submissions, 1-10 jury rubric | User, Investor, Admin |
| **CMS** | `/api/v1/...` | Schedule, events, speakers, sponsors, and announcements | Public / Organizer, Admin |
| **AI Concierge** | `/api/v1/concierge` | Grounded festival RAG engine with UI action directives | Public |
| **Admin Analytics** | `/api/v1/admin` | Revenue velocity, attendance stats, audit log query | Organizer, Admin |

---

## Quick Start

### 1. Prerequisites
- **Node.js**: `v20.x` LTS recommended (v18.18+ supported)
- **MongoDB**: `v6.0+` (local replica set or MongoDB Atlas cluster)

### 2. Local Setup

```bash
# 1. Navigate to directory
cd backend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env

# 4. Generate Prisma client & push schema to MongoDB
npx prisma generate
npx prisma db push

# 5. Seed initial festival schedule, speakers, and accounts
npm run db:seed

# 6. Start development server in watch mode (Port 4000)
npm run start:dev
```

*Verify backend health at `http://localhost:4000/api/v1/health`.*

---

## API Route Directory

All routes are mounted under `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
- `POST /auth/register` (Public) — User account creation.
- `POST /auth/login` (Public) — Returns short-lived JWT and sets HTTP-only refresh cookie.
- `POST /auth/refresh` (Public) — Rotates refresh token family and issues fresh JWT.
- `POST /auth/logout` (Public) — Revokes refresh session and clears cookie.
- `GET  /auth/me` (Bearer) — Returns active user profile.

### 2. Registrations & Passes (`/api/v1/registrations`)
- `GET  /registrations/types` (Public) — Pass catalog, pricing, and live availability.
- `POST /registrations/create` (Public/Bearer) — Creates pass with unique `PEC-XXXXXX` ID and HMAC-SHA256 `qrToken`.
- `GET  /registrations/my-passes` (Bearer) — Digital tickets and signed QR codes.
- `GET  /registrations/:passId` (Public/Bearer) — Pass verification and metadata lookup.

### 3. Payments (`/api/v1/payments`)
- `POST /payments/create-order` (Public) — Initializes Razorpay payment order.
- `POST /payments/verify` (Public) — Verifies Razorpay transaction signature.
- `POST /payments/webhook` (Public) — Asynchronous Razorpay webhook processor.

### 4. Gate Check-In (`/api/v1/checkin`)
- `POST /checkin/verify-qr` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Cryptographically verifies HMAC QR and guarantees zero duplicate check-ins.
- `POST /checkin/manual-lookup` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Search attendee by name, email, or pass ID.
- `GET  /checkin/stats` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Real-time gate telemetry.

### 5. Teams & Jury Scoring (`/api/v1/teams`)
- `POST /teams/create` (Bearer) — Creates Hackathon/Pitch team with join code (`HACK-XXXX`).
- `POST /teams/join` (Bearer) — Joins team via code.
- `GET  /teams/my-teams` (Bearer) — User active teams and project submissions.
- `POST /teams/:teamId/submit` (Bearer) — Submits GitHub repo URL, demo URL, and pitch deck.
- `POST /teams/:teamId/score` (Role: `INVESTOR`, `ORGANIZER`, `SUPER_ADMIN`) — 4-pillar jury scoring (1-10 on Innovation, Execution, Market, Presentation).
- `GET  /teams/leaderboard/:type` (Public) — Live competition leaderboard.

### 6. CMS & Festival Content
- `GET /events` (Public) — Schedule items (filter by `day=1|2`, `track`, `type`).
- `POST /events`, `PUT /events/:id`, `DELETE /events/:id` (Role: `ORGANIZER`, `SUPER_ADMIN`)
- `GET /speakers` (Public) — Speaker directory with session bindings.
- `POST /speakers`, `PUT /speakers/:id`, `DELETE /speakers/:id` (Role: `ORGANIZER`, `SUPER_ADMIN`)
- `GET /sponsors` (Public) — Sponsor list classified by tier.
- `POST /subscribers` (Public) — Newsletter subscription.

### 7. AI Concierge (`/api/v1/concierge`)
- `POST /concierge/chat` (Public) — RAG chat engine with grounded festival context and UI action directives (`scrollToSection`, `highlightEvent`).

---

## Testing & CI Verification

Backend has automated standalone CI (`backend/.github/workflows/ci.yml`) and a comprehensive Jest test suite:

```bash
# Run all unit and integration test suites (61 tests)
npm test

# Run tests in watch mode
npm run test:watch

# Generate code coverage
npm run test:cov

# Run ESLint validation
npm run lint

# Production compilation
npm run build
```

**Key Test Coverage**:
- `src/auth/auth.service.spec.ts` (Password hashing, JWT rotation)
- `src/checkin/checkin.service.spec.ts` (HMAC QR ticket checks & anti-replay)
- `src/common/utils/qr.util.spec.ts` (HMAC-SHA256 signature tampering detection)
- `src/admin/admin.service.spec.ts` (Analytics aggregation & CA tracking)
- `src/teams/teams.service.spec.ts` (Jury scoring & leaderboard algorithms)
- `src/cms/cms.service.spec.ts` (Festival events, speakers, and sponsors)
- `src/health/health.controller.spec.ts` (Service & database health probe)
