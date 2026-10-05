---

description: "Task list for 008-fix-phone-signin-registered"
---

# Tasks: Fix Phone Sign-In for Registered Numbers

**Input**: Design documents `/specs/008-fix-phone-signin-registered/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included and non-optional. Constitution V requires coverage for pure logic, and this feature's entire lesson is that the deciding logic shipped untested in 007 and passed a fully green gate.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**Commits**: One commit per phase, at the phase checkpoint.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: run in parallel (different files, no dependencies)
- **[Story]**: user story this task belongs to (US1, US2, US3)
- Exact file paths in descriptions

## Path Conventions

- Single Next.js project at the repository root
- Pure decision logic: `lib/*.ts`
- Server actions: `lib/actions/*.actions.ts`
- Shared auth components: `components/shared/auth/`
- Auth forms: `app/(auth)/**`
- Messages: `messages/fa.json`, `messages/en.json`
- Tests: `__tests__/**/*.test.ts`

---

## Phase 1: Setup

**Purpose**: Establish the baseline. No new dependency, no schema change, no scaffolding — this feature lands in files that already exist.

- [X] T001 Confirm `User.banned` exists in `prisma/schema.prisma`; per data-model.md no migration is required, the tri-state lookup only widens what an existing query selects
- [X] T002 Run the baseline validation gate (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`) and record the current numbers, so later results can be compared against them

---

## Phase 2: Foundational (CRITICAL — blocks all user stories)

**Goal**: Build the pure decision function and the tri-state lookup that answers it. Both stories are blocked until "should this number get a code?" has exactly one answer.

**Why this blocks everything**: The defect is not a wrong condition but a decision split across two files. Until it lives in one place, any caller can add a contradictory rule — which is what happened.

### Tests (write first — these MUST fail before implementation)

- [X] T003 [P] Create `__tests__/lib/phone-otp-intent.test.ts` asserting **all 8 rows** of the truth table in `contracts/decision-logic.md` explicitly. Do not snapshot: a snapshot passes unchanged when the table itself is wrong, which is how 007 shipped. Two rows carry the most weight — `sign-in` + `active` → `canSend: true`, and `register` + `active` → `canSend: false`. Also assert `canSend` and `messageKey` are always consistent, and that repeated calls with equal inputs are equal (no hidden state or clock)

### Implementation

- [X] T004 [P] Create `lib/phone-otp-intent.ts` exporting `OtpIntent` (`'sign-in' | 'register'`), `PhoneAccountStatus` (`'active' | 'none' | 'banned' | 'unknown'`), `OtpDecision` (`canSend`, `messageKey`, `redirectTo`) and `decideOtpSend(intent, status)`. Client-safe: no `node:` imports, no Prisma, no server-only dependencies, because both auth forms are `'use client'` and anything imported here lands in the browser bundle. Implement exactly the 8 rows with no default branch, so an unhandled combination is a type error rather than a silent pass
- [X] T005 Widen `checkPhoneRegistered` in `lib/actions/user.actions.ts` to return `{ account: PhoneAccountStatus }`, selecting `banned` alongside `id` from the same row (no extra query). **The throttle must return `'unknown'`, never `'none'`** — it currently returns `{ registered: false }` after 10 lookups, which claims a number is unregistered on the strength of a lookup that never ran (research.md R2, FR-009)
- [X] T006 Run `npx jest __tests__/lib/phone-otp-intent.test.ts` — all 8 rows pass. T003 was written to fail first
- [X] T007 Add new message keys to `messages/fa.json` under `auth`: `phoneCheckFailed`, `accountBanned`, `smsSendFailed`, `signedInSuccess`, `signedUpSuccess`. Natural Persian, not transliterated English
- [X] T008 Add the identical keys to `messages/en.json` under `auth`. **Run T007 and T008 sequentially, not in parallel** — `__tests__/messages.test.ts` fails on divergence, so an agent running the suite between them sees a false failure

**Checkpoint commit**: `fix(auth): decide code sending from intent, not a callback`

---

## Phase 3: User Story 1 - A registered shopper signs in by mobile (Priority: P1)

**Goal**: A shopper who registered by phone can return to the store with that same number. Today no number can sign in at all.

**Independent Test**: quickstart.md Scenario 1 — register with a number, sign out, sign back in with it, confirm the code is sent and the shopper is signed in.

### Implementation

- [X] T009 [US1] Replace the `registerCheck` prop in `components/shared/auth/phone-otp-section.tsx` with `intent: OtpIntent`, and delete the boolean callback. The component calls `checkPhoneRegistered`, passes the result to `decideOtpSend`, and obeys the verdict: show `messageKey` or follow `redirectTo` when refused, otherwise send the code. It must hold **no conditional of its own** about whether a number is registered (FR-003, FR-007) — reintroducing one recreates the two-file split that caused this bug
- [X] T010 [US1] In `components/shared/auth/phone-otp-section.tsx`, make `releaseNumber` clear the pending code, the countdown and the cooldown, and retain **no** verdict between requests (FR-010, research.md R5)
- [X] T011 [US1] In `app/(auth)/sign-in/credentials-signin-form.tsx`, pass `intent='sign-in'` and remove the `registerCheck` callback that produced *"already registered — please sign in"* on the sign-in page. That message must no longer be reachable from this page (FR-002)
- [X] T012 [US1] In `app/(auth)/sign-in/credentials-signin-form.tsx`, on successful phone sign-in, raise `toast.success(t('signedInSuccess'))` **after** `router.push(callbackUrl)`. Firing it before the push unmounts it with the form and it is never seen — the most likely way this toast silently fails (contracts/toast-behaviour.md, R4)
- [ ] T013 [US1] Verify in a browser against a site with real SMS delivery: register a number, sign out, sign back in with it, and confirm you are signed in on the intended destination with the success toast visible on the **destination page** (FR-001, FR-012, SC-001, SC-004)

**Checkpoint**: US1 is functional — quickstart Scenario 1 passes. The storefront is no longer locked out. Commit: `fix(auth): let a registered number sign in by phone`

---

## Phase 4: User Story 2 - Sign-up still refuses numbers that are taken (Priority: P2)

**Goal**: The fix does not weaken registration. A number with an account still cannot be used to register a second one.

**Independent Test**: quickstart.md Scenario 2 — attempt to register with a registered number and confirm no code is sent and the shopper is directed to sign in.

### Implementation

- [X] T014 [US2] In `app/(auth)/sign-up/signup-form.tsx`, pass `intent='register'`, replacing `registerCheck={checkPhoneRegistered}`. Confirm the registered-number refusal and its message still fire exactly as before (FR-006)
- [ ] T015 [US2] Confirm in a browser that sign-up refuses a registered number and sign-in accepts the same number, in that order and then the reverse, with no verdict cached between the pages (quickstart Scenario 4, FR-003, FR-010)

**Checkpoint**: US2 holds — quickstart Scenario 2 passes, the duplicate-account guard is intact. Commit: `test(auth): assert sign-up still refuses a registered number`

---

## Phase 5: User Story 3 - An unregistered number is directed to sign-up (Priority: P3)

**Goal**: A shopper signing in with a number that has never registered is told so plainly and handed the way to register, without a code being sent to a number that cannot use it.

**Independent Test**: quickstart.md Scenario 3 — request a code on sign-in for an unregistered number, confirm no code is sent and the referral works.

### Implementation

- [X] T016 [US3] In `components/shared/auth/phone-otp-section.tsx`, when `decideOtpSend` returns `redirectTo: 'sign-up'`, render a link to `/sign-up?mobile={number}` so the number carries over and the shopper does not retype it (FR-005)
- [X] T017 [US3] In `app/(auth)/sign-up/signup-form.tsx`, read the `mobile` query parameter into the existing phone state on mount, so the referral arrives pre-filled
- [X] T018 [US3] Confirm `checkPhoneRegistered` returning `'unknown'` (throttled or failed) produces `phoneCheckFailed` and **not** `phoneNotRegistered` on both pages (FR-009, research.md R2)
- [ ] T019 [US3] Confirm in a browser that a banned account is treated as registered — code sent on sign-in, refused at verification with a specific message — and is never told to register (FR-008)

**Checkpoint**: All three stories independently functional. Commit: `fix(auth): point unregistered numbers at sign-up with the number carried over`

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 Run the full validation gate: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Compare against the T002 baseline; expect zero new lint warnings (baseline 15 warnings, 0 errors)
- [X] T021 [P] Confirm message parity with `__tests__/messages.test.ts` — the five new keys present in both catalogues
- [X] T022 [P] Update `docs/DEPLOYMENT.md` if the tri-state lookup changes any operational note; otherwise confirm no doc change is needed
- [X] T023 Run the quickstart.md regression sweep: countdown still starts at `۲:۰۰` and ticks in Persian digits; phone field still locks **read-only not disabled** (that was the 007 bug — `disabled` drops the field from FormData); resend still unlocks only after expiry; `name` survives a failed submit; email sign-up, password sign-in and Google sign-in unaffected; RTL layout at mobile width
- [X] T024 Confirmed: the two commits touch no `.env` or secret file. The Google client secret and SMS.ir API key remain environment-only (constitution III)
  - countdown starts at `۰۲:۰۰` and ticks, in Persian digits
  - phone field locks **readOnly, not disabled** — the 007 bug that dropped it from FormData
  - `تغییر شماره` release control present
  - resend correctly **hidden** while a code is still valid, per the user's chosen wait-then-manual rule
  - RTL layout correct at 375×812

**Still requires the user, because SMS.ir is live and codes go to a real phone:**


**Final commit**: `docs(spec): record 008 verification`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational. No dependencies on other stories. **This is the MVP.**
- **User Story 2 (P2)**: Starts after Foundational. Runs the same decision function with the other intent; independently testable via Scenario 2.
- **User Story 3 (P3)**: Starts after Foundational. Reuses the `redirectTo` branch of the same decision.

### Within Each User Story

- Tests written and failing before implementation (T003)
- Pure logic before actions, actions before components, components before forms

### Critical Path

```text
T003 (truth table, fails) → T004 (decision fn) → T005 (tri-state) → T009 (intent prop)
                                                                       ↓
                                                            quickstart Scenario 1
                                              the only proof sign-in is fixed
```

T004 is the one task that matters most. It replaces a decision split across two files with one that is unit-testable — which is precisely what 007 lacked.

### Parallel Opportunities

```bash
# Phase 2 — independent files
Task: "T003 Create __tests__/lib/phone-otp-intent.test.ts"
Task: "T004 Create lib/phone-otp-intent.ts"
Task: "T007 Add keys to messages/fa.json"
```

```bash
# Phase 6 — independent files
Task: "T021 Verify message parity"
Task: "T022 Update docs if needed"
```

**Not parallel** — sequential: T007 → T008 (parity test fails between them); T009 → T010 (same file); T011 → T012 (same file); T014 alone; T016 → T017 (referral depends on the link existing).

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T008)
3. Phase 3: User Story 1 (T009–T013)
4. **STOP and VALIDATE**: quickstart Scenario 1 with real SMS
5. Deploy — the storefront is no longer locking out every returning shopper

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → sign-in works → **deploy** (fixes the lockout)
3. US2 → sign-up guard verified intact → deploy
4. US3 → referral and banned-account handling → deploy
5. Polish → full gate green

### Critical Delivery Note

**Scenario 1 requires real SMS delivery.** Without `SMSIR_API_KEY`, the master code `123456` verifies without touching the database, so a local run does not exercise the sending path this feature changes. Scenario 13 in 007 shipped past a green gate for exactly that reason. Do not report this feature done on local evidence alone (constitution V).

---

## Notes

- `[P]` = different files, no dependencies
- `[Story]` labels map to spec.md user stories for traceability
- Verify the decision test fails before implementing (T003 → T004)
- One commit per phase checkpoint, as the user asked
- Stop at each checkpoint and validate the story independently
- Avoid: vague tasks, same-file conflicts, cross-story dependencies that break independence
