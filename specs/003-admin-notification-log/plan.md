# Implementation Plan: Admin Notification Log

**Branch**: `003-admin-notification-log` | **Date**: 2026-09-21 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-admin-notification-log/spec.md`

## Summary

Add a persistent notification log: a `NotificationEvent` table (kind, entity ref, human-readable detail, createdAt) written when activity events fire (order, payment, signup, question, low stock), a `/admin/notifications` page (admin-only, newest-first, kind tags, entity detail, links, empty state), admin-adjustable page size persisted in Setting, and toast copy completed with the entity (product name for stock alerts, order id for orders). All traffic server-safe: event-time single inserts, bounded reads, existing 30s poll cadence only.

## Technical Context

**Language/Version**: TypeScript 5 / Next.js 16 (App Router, Turbopack) + React 19 — matches repo.
**Primary Dependencies**: Prisma 7 (driver adapters, Neon), next-intl, sonner, Tailwind v4 logical properties, zod.
**Storage**: PostgreSQL via Prisma (`NotificationEvent` table; hand-authored migration folder under `prisma/migrations/`; never `db push`).
**Testing**: Jest 30 (node env), `__tests__/**/*.test.ts`; fa/en parity test; validation gate before commits.
**Target Platform**: Vercel + Neon (dev) / VPS + local PG (prod); fa first (RTL), en LTR.
**Project Type**: Single Next.js web app.
**Performance Goals**: log page render aware of ≤5,000-row table via indexed createdAt + bounded page (10–100, admin-set); poll cadence unchanged (30s toasts).
**Constraints**: ≤1 notification-system request per 30s per admin tab; no DB writes per navigation; single insert per event occurrence.
**Scale/Scope**: single-admin store, low event volume; one new table, one page, minor toast/ poll changes.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Professional Iranian Ecommerce First | PASS | /admin/notifications is admin-side management of activity; fa-first RTL, logical properties; both roles considered (only admin access). |
| II. Money & Data Integrity | PASS | No money mutation; order amount only rendered as string from DB — no client arithmetic. |
| III. Security & Authorization | PASS | Page + all actions gated `requireAdmin()`; zod at write boundary (event writer internal only). |
| IV. Bilingual Completeness | PASS | New keys in fa.json + en.json; parity test keeps suite green. |
| V. Test & E2E Verification | PASS | Pure helpers get Jest tests; gate before commit; browser verification per quickstart.md. |
| VI. Data Layer Discipline | PASS | Hand-authored SQL migration; schema reindex/deploy via `npx prisma migrate deploy`, dev restart after generate. |
| VII. Efficiency & Simplicity | PASS | Reuses server-action pattern, existing toast/sonner, existing 30s poll, existing                                           pagination helpers; no new abstractions. |

## Project Structure

### Documentation (this feature)

```text
specs/003-admin-notification-log/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── notification-events.md
└── tasks.md   (built by /speckit-tasks after this file)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma (add NotificationEvent model)
└── migrations/<timestamp>_notification_events/migration.sql (hand-authored)

db/prisma.ts (existing client)
lib/
├── constants.ts (stock thresholds etc.)
├── notification-events.ts (pure: label maps, detail formatter for events; prisma-free for Jest)
└── actions/
    ├── notification.actions.ts (write helper, calls fireNotificationEvent) — extends files carrying order placement/user signup, etc.
    └── notify.actions.ts (existing; may be extended to also read from log)
app/admin/notifications/
├── page.tsx (server component - list)
└── [client pagination control component]
components/shared/admin/
└── admin-notifications.tsx (existing toast poller — extended for complete toast copy)
messages/
├── fa.json (new keys)
└── en.json (mirror keys)
__tests__/lib/notification-events.test.ts (jest)
```

**Structure Decision**: single Next.js repo — match existing layout (server actions under lib/actions, page under app/admin, shared component under components/shared/admin).

## Complexity Tracking

> No constitution violations.
