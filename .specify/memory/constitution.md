# Panah Kala Shop Constitution

## Core Principles

### I. Professional Iranian Ecommerce First
Storefront and admin panel are one product: the storefront MUST serve real Persian shoppers (fa-first, RTL, logical `ms/me` properties, Jalali dates, Toman money), and the admin panel MUST fully manage every storefront capability (catalog incl. variants/options, orders, users, coupons, content blocks, settings, support, notifications, Q&A). Every feature MUST be operable end-to-end by both roles with no dead ends. Rationale: Digikala-style retail UX is the explicit product goal; a storefront feature the admin cannot manage is incomplete.

### II. Money & Data Integrity (NON-NEGOTIABLE)
Money values are whole Toman stored as 32-bit `Int` columns, and reach the client as plain numbers (Toman in UI, IRR ×10 only in schema.org JSON-LD). Toman has no commonly used subunit, so a fractional price is not a value this store can hold; the upper bound is Postgres `int4` and is validated at the form boundary rather than allowed to fail as a database error. No client-side arithmetic on money without conversion; server re-validates prices, coupon eligibility, and stock at purchase time — client-sent prices/stock are never trusted. Order state transitions keep authority bindings (e.g. `paymentAuthority`, `trackCode`) verifiable. Physical dimensions, weight and rating remain `Decimal` and are stringified by a `$extends` result transform. Never reintroduce `.toFixed(2)` on a money write: a fractional string is silently coerced by an `Int` column. Rationale: direct financial loss is the worst failure mode this app can cause.

<!--
Sync Impact Report — 1.0.0 → 1.0.1 (PATCH, 2026-10-05)

Corrects a stale storage-type claim, not the principle's intent. Every normative
statement in principle II (no client arithmetic, server re-validates at purchase
time, authority bindings stay verifiable) was already true and remains true.

What was wrong: the text said money is "Prisma Decimals exposed as strings".
Since feature 005 it is `Int` columns exposed as plain numbers. The principle
contradicted the schema on all nine money columns, which made it unusable as an
audit reference — a reviewer checking a money requirement against this text would
verify the wrong type.

Version rationale: PATCH rather than MINOR or MAJOR. No principle was added,
removed, or redefined; a factual detail inside an existing principle was
corrected to match what shipped. An argument exists for MINOR (the stored type
changed), but the governing rule — how money integrity is enforced — did not.

Affected specs: none require edits. 005-money-int-migration implemented this and
was correct at the time; the constitution was the artifact that lagged.

Affected code: none. Schema and implementation are the source of truth here.
-->

### III. Security & Authorization by Default
All mutations live in server actions gated by `requireAdmin()`/`getValidUserId()` at the boundary; zod validation at trust boundaries; secrets (AI key, storage keys, OTP) env-only; assistant links rendered as internal-only anchors by the client parser; destructive/critical admin actions wrapped in confirmation dialogs. Rationale: the store processes payments and PII; authorization misses are shipping bugs, not follow-ups.

### IV. Bilingual Completeness (NON-NEGOTIABLE)
Every user-facing string exists in BOTH `messages/fa.json` and `messages/en.json`; the parity test fails the suite on divergence. DB-driven locale/font/theme stay admin-switchable without redeploy. Language parity is part of the definition of done for any UI change. Rationale: the parity test is enforced green — an unkeyed string is a failed build waiting to happen.

### V. Test & E2E Verification
Pure logic (lib/) gets Jest coverage and the validation gate (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`) MUST pass before every commit. Behavior-changing features get verified in the browser (golden path + edge cases) before being reported done. Commits stay section-scoped and local; the user pushes manually. Rationale: ~286 passing tests + verified E2E are the deployment-process guardrail the workflow depends on.

### VI. Data Layer Discipline
Prisma 7 with driver adapters; schema changes go through hand-authored `prisma/migrations/` SQL folders applied with `npx prisma migrate deploy` (never `db push` against shared DBs); dev server restarts after `prisma generate`. Media URLs stored in DB MUST resolve (verified against the object storage, e.g. ArvanCloud bucket paths) before shipping. Rationale: Neon ledger drift and 404 image rows have both cost recovery time already.

### VII. Efficiency & Simplicity
Features serve shoppers without needless complexity: no speculative abstractions, reuses existing patterns (server-action pattern, notification pipeline, `withActionMessage`) before inventing new ones. Performance paths that scale (list sort/filter columns, connection-pool singleton, pagination) are preserved when extending. Rationale: a solo-maintained shop benefits maintenance speed over architectural ambition.

## Workflow Requirements

- Feature work follows Spec Kit: constitution → /speckit-specify → /speckit-plan → /speckit-tasks → verify before implementation.
- Every feature spec MUST name the affected storefront flows, admin-side management surface, i18n keys, and test plan before tasks are generated.
- Testing initiatives MUST cover storefront (browse, auth incl. OTP, cart, checkout incl. ZarinPal/COD/coupons, reviews, Q&A, favorites, support chat, AI assistant) and admin panel (each sidebar section incl. badges, uploads, content blocks, settings), with failures logged as issues/specs rather than silently skipped.
- Commits stay local unless the user explicitly pushes; commit messages describe the why.

## Governance

This constitution supersedes ad-hoc practices in this repo. Amendments are documented in-place with a version bump (MAJOR = principle removal/redefinition, MINOR = new principle/expanded guidance, PATCH = clarifications) and a Sync Impact Report comment for review. Compliance is checked at review/spec time; violations either fix to comply or amend the constitution with rationale. Runtime dev guidance lives in CLAUDE.md, which defers to this constitution on conflict.

**Version**: 1.0.1 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-10-05
