# E_Summit_Backend

Production API and data engine for **PEC Summit 2026** (E-Cell PEC, Chandigarh).

Implements [`BACKEND_IMPLEMENTATION_PLAN.md`](./BACKEND_IMPLEMENTATION_PLAN.md) and [`ADMIN_DASHBOARD_PLAN.md`](./ADMIN_DASHBOARD_PLAN.md). It powers the `ESUMMIT` public site and the `esummit-admin` operations portal.

## Status

All core modules are built, type-checked, and integrated.

| Plan Section | Module | Status | Notes |
| :--- | :--- | :--- | :--- |
| §3 Database Schema | Prisma PostgreSQL & pgvector | ✅ Complete | Migrated schema with relations & indexes |
| §4.1 Auth & Users | `src/auth/` | ✅ Complete | register / login / refresh / logout / me + JWT Rotation |
| §5.3 Rate Limiting | `src/app.module.ts` | ✅ Complete | In-memory token bucket + Redis-ready throttler |
| §4.2 Registrations & Passes | `src/registrations/` | ✅ Complete | `PEC-XXXXXX` ID generation & cryptographic QR |
| §4.3 Payments & Razorpay | `src/payments/` | ✅ Complete | Razorpay Orders, Signatures & Webhooks |
| §4.4 Gate Check-in (HMAC QR) | `src/checkin/` | ✅ Complete | HMAC-SHA256 verification & replay prevention |
| §4.5 Teams & Submissions | `src/teams/` | ✅ Complete | Hackathon/Pitch teams (`HACK-XXXX`), Jury 1-10 Rubric |
| §4.6 AI Concierge RAG | `src/concierge/` | ✅ Complete | Grounded festival chat + UI Action Directives |
| CMS & Schedule Content | `src/cms/` | ✅ Complete | Events (Day 1 & 2), Speakers, Sponsors, Newsletter |
| Admin Command Center | `src/admin/` | ✅ Complete | Real-time analytics, datatable, CA Leaderboard |
| Database Seeder | `prisma/seed.ts` | ✅ Complete | Seeded with all `ESUMMIT` speakers & events |

## Tech Stack

NestJS 10 · TypeScript · Prisma 6 · PostgreSQL 16 (pgvector) · Redis 7 · Passport JWT · Argon2 · Zod · Class Validator

## Quick Start

Requires Node.js 18+ and Docker.

```bash
# 1. Start all containers (Postgres + Redis + Backend)
docker compose up -d --build

# 2. Or run locally:
npm install
npm run infra:up          # Postgres :5433 + Redis :6380
npx prisma migrate dev    # Apply Prisma schema migrations
npm run db:seed           # Populate with initial fest schedule & accounts
npm run start:dev         # Start server at http://localhost:4000/api/v1
```

Verify backend health:

```bash
curl http://localhost:4000/api/v1/health
```

## API Route Directory

All routes are prefixed with `/api/v1`.

### 1. Authentication (`/api/v1/auth`)
- `POST /auth/register` (Public) — User registration.
- `POST /auth/login` (Public) — Login with email/password, sets HTTP-only refresh cookie, returns short-lived JWT.
- `POST /auth/refresh` (Public) — Rotates refresh token cookie and issues new JWT.
- `POST /auth/logout` (Public) — Revokes refresh session and clears cookie.
- `GET  /auth/me` (Bearer) — Current user profile.

### 2. Registrations & Passes (`/api/v1/registrations`)
- `GET  /registrations/types` (Public) — Pass catalog, fees, and live availability.
- `POST /registrations/create` (Public/Bearer) — Creates pass with unique `PEC-XXXXXX` and HMAC-SHA256 `qrToken`.
- `GET  /registrations/my-passes` (Bearer) — Current user's digital passes and QR codes.
- `GET  /registrations/:passId` (Public/Bearer) — Pass lookup.

### 3. Payments (`/api/v1/payments`)
- `POST /payments/create-order` (Public) — Initializes Razorpay order for pending pass.
- `POST /payments/verify` (Public) — Verifies Razorpay transaction signature.
- `POST /payments/webhook` (Public) — Razorpay webhook event processor.

### 4. Gate Check-in (`/api/v1/checkin`)
- `POST /checkin/verify-qr` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Cryptographically verifies HMAC QR and enforces zero duplicate check-ins.
- `POST /checkin/manual-lookup` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Search attendee by name/email/passId.
- `GET  /checkin/stats` (Role: `VOLUNTEER_CHECKIN`, `ORGANIZER`, `SUPER_ADMIN`) — Live gate scan statistics.

### 5. Teams & Jury Scoring (`/api/v1/teams`)
- `POST /teams/create` (Bearer) — Creates Hackathon or Pitch team with join code (`HACK-XXXX`).
- `POST /teams/join` (Bearer) — Joins team via code.
- `GET  /teams/my-teams` (Bearer) — User's active teams and submissions.
- `GET  /teams/:teamId` (Bearer) — Team details.
- `POST /teams/:teamId/submit` (Bearer) — Submits repo URL, demo URL, and pitch deck.
- `POST /teams/:teamId/score` (Role: `INVESTOR`, `ORGANIZER`, `SUPER_ADMIN`) — Jury rubric scoring (1-10 on Innovation, Execution, Market, Presentation).
- `GET  /teams/leaderboard/:type` (Public) — Live competition leaderboard.

### 6. CMS & Festival Content (`/api/v1/...`)
- `GET /events` (Public) — Schedule events (filter by `day=1|2`, `track`, `type`).
- `POST /events`, `PUT /events/:id`, `DELETE /events/:id` (Role: `ORGANIZER`, `SUPER_ADMIN`)
- `GET /speakers` (Public) — 40+ speakers directory.
- `POST /speakers`, `PUT /speakers/:id`, `DELETE /speakers/:id` (Role: `ORGANIZER`, `SUPER_ADMIN`)
- `GET /sponsors` (Public) — Sponsor list by tier (title, gold, silver, media).
- `POST /subscribers` (Public) — Newsletter signup.
- `GET /subscribers` (Role: `ORGANIZER`, `SUPER_ADMIN`) — Subscribers list.

### 7. AI Concierge (`/api/v1/concierge`)
- `POST /concierge/chat` (Public) — RAG chat engine with festival context and UI action directives (`scrollToSection`, `highlightEvent`).

### 8. Admin Analytics (`/api/v1/admin`)
- `GET   /admin/analytics` (Role: `ORGANIZER`, `SUPER_ADMIN`) — Executive overview, revenue, check-in totals, college breakdown.
- `GET   /admin/delegates` (Role: `ORGANIZER`, `SUPER_ADMIN`) — Paginated datatable with search and filters.
- `GET   /admin/ca-leaderboard` (Role: `ORGANIZER`, `SUPER_ADMIN`) — Campus Ambassador referral rankings.
- `PATCH /admin/delegates/:id/override` (Role: `ORGANIZER`, `SUPER_ADMIN`) — Manual gate/VIP override.

---

## Seed Accounts (from `prisma/seed.ts`)

All pre-seeded test accounts use password: `PecSummit@2026`

| Persona | Email | Role |
| :--- | :--- | :--- |
| **Super Admin** | `admin@pecsummit.com` | `SUPER_ADMIN` |
| **Organizer** | `organizer@pecsummit.com` | `ORGANIZER` |
| **Volunteer (Gate Checkin)** | `volunteer@pecsummit.com` | `VOLUNTEER_CHECKIN` |
| **Investor / Judge** | `investor@pecsummit.com` | `INVESTOR` |
| **Campus Ambassador** | `ca@pecsummit.com` (Code: `CA-PEC-2026`) | `DELEGATE` |
| **Delegate** | `delegate@pecsummit.com` (Pass: `PEC-894210`) | `DELEGATE` |
