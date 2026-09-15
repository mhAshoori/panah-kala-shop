# Implementation Plan: Full Feature Audit — Storefront & Admin Panel

**Branch**: `001-full-feature-audit` | **Date**: 2026-09-16 | **Spec**: spec.md
**Role lens**: senior DevOps + QA (audit execution, environment readiness, defect triage)

**Input**: Feature specification from `specs/001-full-feature-audit/spec.md`

## Technical Context

- **Runtime**: Next.js 16 (Turbopack dev) + Prisma 7 (driver adapters) on Neon dev DB; Auth.js v5 (credentials + SMS OTP mock `123456` + env-gated Google); ZarinPal sandbox; ArvanCloud S3 bucket for media; Jest 30 for lib tests.
- **Verification stack**: dev server via preview tools (`dev` launch config, port 3000); browser-driven E2E by session; `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build` as the gate.
- **Accounts under test**: admin@example.com / 12345678 (super-admin), jane@example.com / 123456 (shopper), banned user row for negative case; guest (no session).
- **Data**: seeded 13 products with variants/options, categories tree, coupons, HomeBlocks, settings rows (all DB-back).
- No unknowns remain → no NEEDS CLARIFICATION.

## Constitution Check (pre-design)

| Gate | Status | Notes |
|---|---|---|
| I Ecommerce-first (storefront+admin both) | PASS | Spec FR-1/FR-2 require both sides |
| II Money integrity (server re-validated) | PASS | FR-4 includes coupon re-validation at purchase |
| III Security default (authz on all actions) | PASS/untested risk | Audit will test authz edges (banned user, guest POST) |
| IV Bilingual completeness | PASS | FR-3 fa/en + fonts/themes |
| V Test & E2E gate | PASS | P3 story; gate ≥ baseline test count |
| VI Data-layer discipline (migrations, URL validity) | PASS | Post-image-fix state; audit re-checks URL resolution |
| VII Simplicity | PASS | Fixes must reuse existing patterns; no speculative refactor |

No violations. Defect fixes during audit MUST also re-pass Constitution Check (targeted: auth for any new/changed action, bilingual keys for any new UI string, migrate vs db push if any schema change slips in).

## Phase 0 · research.md summary

All research resolved in-place from repo knowledge (no new forks):

1. **How to drive the audit** → Decision: browser E2E via preview tools, station-by-station with live checklist. Rationale: app behavior (RTL, variants, badges) only verifiable in render; Jest already covers pure lib. Alternatives: Playwright suite (overkill for one audit; add later if audit recurs), API-only smoke (can't see UI breakage).
2. **Environment readiness** → Decision: fresh `SELECT 1` probe + dev server restart on P1001/Race conditions; reseed only if data destroyed by tests. Rationale: documented Neon flakiness. Alternative: local PG (overkill, changes prod-parity).
3. **Cron of payment tests** → Decision: ZarinPal sandbox full ride + COD + abandoned-payment + coupon-at-purchase rejection. Sandbox-only per spec; no real merchant touches.
4. **Test-count baseline** → Decision: record current 286 Jest tests as baseline before first fix commit; each fix's gate must end ≥ 286.

## Phase 1 · data-model.md summary

No new entities. Audit touches existing entities (see spec Key Entities); defect fixes may add: none expected — visibility fields already exist (`isRead`, `adminSeenAt`, `hideEmpty`). If a fix requires schema change, hand-authored `prisma/migrations/<ts>_<name>/migration.sql` + `migrate deploy`, per CLAUDE.md.

## Phase 1 · contracts/ summary

- `contracts/audit-stations.md` — the station checklist (below) IS the interface the audit reports through: per station PASS/FAIL + defect rows (severity C1/C2/C3, route, steps, expected, actual, fix commit).

### contracts/audit-stations.md

| # | Station | Covered spec FR |
|---|---|---|
| S1 | Home blocks all states, header/nav, mega menu, mobile sheet, footer | FR-1 |
| S2 | Catalog: category pages, search, listing sort | FR-1 |
| S3 | Product page: images, deep-link `?variant=`, options/combos, price/stock display | FR-1 |
| S4 | Auth: sign-up (email), sign-in (email/OTP), sign-out, banned-negative, session expiry | FR-5 P2, FR-9 |
| S5 | Cart: guest add, merge on sign-in, coupon apply/remove errors, quantity/stock edge | FR-2 P2, FR-9 |
| S6 | Checkout+payment: address book CRUD, ZarinPal sandbox PAID, COD, abandoned payment, expired coupon at purchase | FR-4 |
| S7 | Orders: history, detail, trackCode display for shopper | FR-2 P2 |
| S8 | Reviews (incl. pending-approval visibility), Q&A, favorites | FR-2 P2 |
| S9 | Profile: personal info edits (contact change mock codes), addresses, avatar upload/rejects | FR-6, P2 |
| S10 | Support chat: shopper→admin→shopper round trip, badges, unread counts both ends | FR-5 |
| S11 | AI assistant (storefront): grounded answer w/ internal link, rate limit 429, error toasts | FR-1 edge |
| S12 | Admin: dashboard, orders inbox (seen/comment/ship/deliver), product CRUD incl. variants+upload, categories incl. hide-empty, users, coupons, notifications, support inbox, homepage blocks, contact/SEO settings, settings (locale/font/theme round-trip) | FR-2 |
| S13 | Gate: tsc/lint/test/build; fa+en parity; both themes; images all 200 | FR-7, FR-8, P3 |

## Phase 1 · quickstart.md summary

Prereqs: dev server up (`launch.json: dev`), DB reachable, seeded accounts. Order: S1→S12 live in browser; record defects in `audit-notes.md` per station; S13 gate last after fixes. Pass = no C1/C2 outstanding + gate green.

## Post-design Constitution Check

Re-affirm: fix-only scope keeps VI (no speculative schema churn), III (any fix re-checks authz), IV (any fix's UI string goes to both message files). **PASS.**
