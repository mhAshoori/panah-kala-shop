# Panah Kala Shop Constitution

## Core Principles

### I. Professional Iranian Ecommerce First
Storefront and admin panel are one product: the storefront MUST serve real Persian shoppers (fa-first, RTL, logical `ms/me` properties, Jalali dates, Toman money), and the admin panel MUST fully manage every storefront capability (catalog incl. variants/options, orders, users, coupons, content blocks, settings, support, notifications, Q&A). Every feature MUST be operable end-to-end by both roles with no dead ends. Rationale: Digikala-style retail UX is the explicit product goal; a storefront feature the admin cannot manage is incomplete.

### II. Money & Data Integrity (NON-NEGOTIABLE)
Money values are Prisma Decimals exposed as strings (Toman in UI, IRR ×10 only in schema.org JSON-LD). No client-side arithmetic on money without conversion; server re-validates prices, coupon eligibility, and stock at purchase time — client-sent prices/stock are never trusted. Order state transitions keep authority bindings (e.g. `paymentAuthority`, `trackCode`) verifiable. Rationale: direct financial loss is the worst failure mode this app can cause.

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

**Version**: 1.0.0 | **Ratified**: 2026-09-16 | **Last Amended**: 2026-09-16
