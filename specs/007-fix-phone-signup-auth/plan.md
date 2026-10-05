# Implementation Plan: Phone Sign-Up Authentication Fix

**Branch**: `007-fix-phone-signup-auth` | **Date**: 2026-10-05 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/007-fix-phone-signup-auth/spec.md`

## Summary

A shopper registering by mobile number on the live site enters a valid SMS code, presses sign-up, and nothing happens — no session, no redirect, no message. The code is consumed twice in one attempt: `signUpUser` verifies it (deleting the stored row) and then the SMS provider verifies the same already-deleted code when establishing the session. Verification fails, and because the session call's error return is ignored, the action proceeds as though sign-in succeeded.

Fix by verifying the code exactly once and establishing the session from that proven credential. Alongside it: enforce the 2-minute code lifetime that is currently written but never read, add the countdown and phone-field lock, unify sign-in and sign-up on one session-creation path, remove the duplicate unused sign-in implementation, and fix the Google OAuth redirect-URI mismatch that currently blocks Google sign-in entirely.

**Technical approach**: Split one-time-code verification into a non-consuming check (used to authorize account creation) and the single consuming check (used to establish the session), so the code is proven once and consumed once, never twice and never zero times. Route both sign-in and sign-up through one `signInAsNewUser`-style path that verifies the session actually exists before navigating.

## Technical Context

**Language/Version**: TypeScript 5.x, Next.js 16 (App Router, Turbopack), React 19

**Primary Dependencies**: `next-auth@5.0.0-beta.32` (Auth.js v5, JWT strategy, CredentialsProvider `id: 'sms'`), `prisma@7` with `@prisma/adapter-pg`, `zod`, `sonner` (toasts), `next-intl`, Jest 30 via `next/jest`

**Storage**: PostgreSQL via Prisma. `VerificationToken` (composite PK `[identifier, token]`, fields `identifier`, `token` SHA-256 hashed, `expires DateTime` — **already written, never read**)

**Testing**: Jest 30, `testEnvironment: 'node'`, tests under `__tests__/**/*.test.ts`. Full gate: `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build`. Browser verification required (constitution V).

**Target Platform**: Linux VPS behind Nginx + CDN, `next start` on Node 22. No `output: standalone`.

**Project Type**: Single Next.js web app (storefront + admin panel in one codebase)

**Performance Goals**: Sign-up/sign-in submit-to-redirect under 3 seconds including one SMS round-trip. Countdown ticks at 1 Hz. No added server round-trips on the happy path.

**Constraints**:
- SMS.ir codes are 6 digits (`generateOtpCode` → `randomInt(0, 1_000_000)` padStart 6). The sign-in form hardcodes `code.length !== 6` while the sign-up schema accepts 4–6 — a real inconsistency to resolve.
- `rateLimit` is in-memory, per-process. It resets on every deploy and is not shared across instances. A single VPS instance is the current deployment, so this is acceptable, but it is **not** a correctness dependency for this fix (see research.md R6).
- Dev/CI must keep working with the fixed master code `123456` when no SMS provider is configured.
- Bilingual parity: every new message key goes in **both** `messages/fa.json` and `messages/en.json`; `__tests__/messages.test.ts` fails the suite on divergence.

**Scale/Scope**: 13 seed products, single VPS, low-traffic Iranian storefront. No horizontal scaling concerns for this fix.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status | Notes |
|-----------|------|--------|-------|
| I. Professional Iranian Ecommerce First | MUST have no dead ends | ✅ PASS | The defect *is* a dead end (stranded account, no recovery). The fix removes it. New user-facing copy is Persian-first, RTL-consistent. |
| II. Money & Data Integrity (NON-NEGOTIABLE) | MUST | ✅ N/A | No money, prices, or order state touched. |
| III. Security & Authorization by Default | MUST | ✅ PASS | Directly improves security posture: codes now expire (2 min) — the `expires` column was dead. Codes remain single-use and purpose-scoped. The sign-up path already verifies before creating (correct, and retained — see research.md R2). |
| IV. Bilingual Completeness (NON-NEGOTIABLE) | MUST | ✅ PASS | All new keys added to both catalogues; parity test enforces. |
| V. Test & E2E Verification | MUST | ✅ PASS | Pure logic (OTP verification split, countdown, resend cooldown) gets Jest coverage. Behaviour change verified in browser with real SMS delivery, per FR-014. |
| VI. Data Layer Discipline | MUST | ✅ PASS | **No schema change needed** — `expires` already exists. Migrations not required. |
| VII. Efficiency & Simplicity | SHOULD | ✅ PASS | No new dependency. `sonner` already installed. Reuses `consumeSmsOtp`, `normalizeIranMobile`, `rateLimit`, `PhoneField`, `OtpInput`. Net line count is expected to be **negative** (deleting dead `signInWithCredentials`, merging two session paths). |

**Gate result: PASS.** No violations, no complexity tracking required.

### Re-check after Phase 1 design

All seven principles re-verified against the Phase 1 artifacts. The design adds no schema migration (VI), no new dependency (VII), and turns a latent security gap into an enforced one (III). **Gate result: PASS.**

## Phase 0: Research

Resolved into [research.md](research.md). Six decisions, each with alternatives considered:

| ID | Decision |
|----|----------|
| R1 | Split OTP verification into non-consuming `check` + consuming `consume` |
| R2 | Keep verify-before-create ordering; consume exactly once, at session establishment |
| R3 | Detect silent success by checking the returned URL for an error marker, not the return shape |
| R4 | Enforce the 2-minute expiry inside `consumeSmsOtp` (server-side, not just UI) |
| R5 | Derive the OAuth redirect URI from `NEXT_PUBLIC_SITE_URL`, register `/api/auth/callback/google` |
| R6 | Leave the in-memory rate limiter alone; document the deployment caveat |

No `NEEDS CLARIFICATION` markers remain.

## Phase 1: Design & Contracts

- [data-model.md](data-model.md) — `VerificationToken` semantics, OTP lifecycle state machine, no schema change
- [contracts/server-actions.md](contracts/server-actions.md) — server action signatures and return shapes
- [contracts/ui-behaviour.md](contracts/ui-behaviour.md) — countdown, phone-field lock, resend, toast
- [quickstart.md](quickstart.md) — runnable verification scenarios, including the production SMS path

## Project Structure

### Documentation (this feature)

```text
specs/007-fix-phone-signup-auth/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 — six technical decisions
├── data-model.md        # Phase 1 — OTP entity + lifecycle
├── quickstart.md        # Phase 1 — runnable verification
├── contracts/
│   ├── server-actions.md   # Action signatures and return contracts
│   └── ui-behaviour.md     # Countdown, lock, resend, toast
├── checklists/
│   └── requirements.md     # Spec quality gate
└── tasks.md             # Phase 2 (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
auth.ts                                  # sms provider authorize() — reuse, no verify change
lib/
├── otp.ts                               # OTP_TTL_MS: 5min -> 2min; DEV_MASTER_CODES
├── sms/
│   ├── verify-otp.ts                    # SPLIT: checkSmsOtp() + consumeSmsOtp(); expiry enforced
│   └── smsir.ts                         # unchanged — delivery layer
├── actions/
│   └── user.actions.ts                  # signUpUser rewritten; establishSmsSession fixed;
│                                         #   signInWithCredentials (dead) DELETED;
│                                         #   shared establishSession() introduced
├── action-messages.ts                   # new bilingual keys
└── rate-limit.ts                        # unchanged (see research.md R6)

app/(auth)/
├── sign-up/signup-form.tsx              # verify-then-redirect; phone lock; toast on fallback
└── sign-in/credentials-signin-form.tsx  # same session-verification discipline; 6-digit rule unified

components/shared/
├── otp-input.tsx                        # unchanged — already supports disabled + onComplete
└── auth/phone-field.tsx                 # unchanged — already supports disabled

messages/
├── fa.json                              # + new keys
└── en.json                              # + new keys (parity test enforces)

__tests__/
├── lib/sms/verify-otp.test.ts           # NEW — expiry, single-use, purpose scoping
└── lib/otp.test.ts                      # UPDATE — TTL is 2 minutes

types/index.ts                           # ActionState: may carry a `toast` discriminator
```

**Structure Decision**: Single Next.js app — no new directories, no new top-level modules. All changes land in existing files that already own the behaviour (`lib/sms/verify-otp.ts`, `lib/actions/user.actions.ts`, the two form components). The only new files are Jest tests for the split verification logic and one small contract document. `components/shared/auth/phone-field.tsx` and `components/shared/otp-input.tsx` already expose the `disabled` prop this feature needs — no component API change required.

## Complexity Tracking

> No Constitution Check violations. Nothing to justify.

## Implementation Risk

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| The 2-minute window is too tight for real SMS.ir delivery in Iran | Medium | FR-007 resend with cool-down; delivery is normally <30s. Verified in browser per quickstart Scenario 3. |
| `NEXT_PUBLIC_SITE_URL` is wrong or unset on the VPS, so the OAuth fix fails | Medium | quickstart Scenario 6 reads the actual env first. If unset, the fallback is `AUTH_URL`. |
| Changing the OTP TTL breaks a dev flow that relied on a long-lived code | Low | Dev master code `123456` short-circuits the DB lookup entirely and is unaffected by TTL. |
| Google OAuth fix requires a change in the Google Cloud console, not just code | Certain | Recorded in quickstart Scenario 6 as an explicit manual step — code cannot fix a console-side registration. |
