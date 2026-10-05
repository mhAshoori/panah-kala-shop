---

description: "Task list for 007-fix-phone-signup-auth"
---

# Tasks: Phone Sign-Up Authentication Fix

**Input**: Design documents `/specs/007-fix-phone-signup-auth/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Included. Constitution V requires Jest coverage for pure logic, and constitution V also requires browser verification for behaviour changes. `contracts/server-actions.md` lists 8 required test cases.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: run in parallel (different files, no dependencies)
- **[Story]**: user story this task belongs to (US1, US2, US3)
- Exact file paths in descriptions

## Path Conventions

- Single Next.js project at the repository root
- Server actions: `lib/actions/*.actions.ts`
- Pure logic: `lib/*.ts`
- Auth forms: `app/(auth)/**`
- Tests: `__tests__/**/*.test.ts`
- Messages: `messages/fa.json`, `messages/en.json`

---

## Phase 1: Setup

**Purpose**: Confirm the baseline this feature builds on. There is no new dependency, no schema change, and no project initialization — the feature lands entirely in existing files.

- [X] T001 Confirm `VerificationToken` in `prisma/schema.prisma` has `expires DateTime` and that no migration is needed (per data-model.md — this feature only makes the existing column authoritative)
- [X] T002 Run the baseline validation gate (`npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`) and record pre-existing failures in `.next/dev/logs/next-development.log` or a scratch note so they are not later mistaken for regressions

---

## Phase 2: Foundational (CRITICAL — blocks all user stories)

**Goal**: Split one-time-code verification into non-consuming and consuming forms, enforce the 2-minute lifetime, and land every shared message key.

**Why this blocks everything**: The defect is structural. `signUpUser` cannot be fixed until a code can be verified without being spent, and no user story can report a distinct failure until the verdict distinguishes expired from wrong.

### Tests (write first — these MUST fail before implementation)

- [X] T003 [P] Create `__tests__/lib/sms/verify-otp.test.ts` covering all 8 cases from `contracts/server-actions.md`: correct unexpired code returns valid; expired code returns `expired` (NOT `invalid`); wrong code returns `invalid`; `checkSmsOtp` leaves the row intact so a later `consumeSmsOtp` with the same code still succeeds; `consumeSmsOtp` deletes so a second call returns `invalid`; a code issued to number A does not verify number B; master code `123456` verifies without a database round-trip when no SMS provider is configured
- [X] T004 [P] Update `__tests__/lib/otp.test.ts` to assert `OTP_TTL_MS` is 2 minutes (currently asserts 5)

### Implementation

- [X] T005 [P] Add `OTP_TTL_SECONDS = 120` and `OTP_RESEND_COOLDOWN_SECONDS` to `lib/constants.ts` — this module MUST stay client-safe (no `node:` imports), because `signup-form.tsx` and `credentials-signin-form.tsx` both import from it. **Do not** put these in `lib/otp.ts`, which imports `node:crypto` and `lib/sms/smsir` and would break the client bundle
- [X] T006 Rewrite `lib/sms/verify-otp.ts`: export `type OtpVerdict = 'valid' | 'invalid' | 'expired' | 'notFound'` (use exactly these four literals — US2 distinguishes `expired` from `invalid` in its messages; `notFound` is reserved for an already-consumed code and maps to the same user-facing text as `invalid`), `checkSmsOtp(phone, code)` which verifies without deleting, and `consumeSmsOtp(phone, code)` which verifies and deletes atomically. Both MUST reject a row whose `expires` is in the past — this is the currently-dead `expires` column becoming authoritative (research.md R4). Preserve the existing master-code short-circuit for unconfigured environments, and preserve the `otp:{phone}` identifier form so purpose scoping (FR-012) still separates OTP from `pwreset:` rows
- [X] T007 Change `OTP_TTL_MS` in `lib/otp.ts` to `2 * 60 * 1000`, derived from `OTP_TTL_SECONDS` in `lib/constants.ts` so the server-enforced lifetime and the countdown the UI displays cannot drift apart
- [X] T008 Add `toast?: 'accountCreatedNotSignedIn'` to `ActionState` in `types/index.ts` — a discriminated value, not a boolean, so the client renders a sonner toast rather than an inline form error (FR-016)
- [X] T009 Add all new keys to `messages/fa.json` under the `auth` namespace: `otpExpired`, `accountCreatedNotSignedIn`, `signInToContinue`, `resendCode`, `resendIn`, `changeNumber`, `otpCountdown`, `googleSignInFailed`, `googleSignInUnavailable`. Natural Persian, not transliterated English (constitution I)
- [X] T010 Add the identical nine keys to `messages/en.json` under `auth`. **Run T009 and T010 sequentially, not in parallel** — `__tests__/messages.test.ts` fails on any divergence, so an agent running the suite between them would see a false failure
- [X] T011 Run `npx jest __tests__/lib/sms/verify-otp.test.ts __tests__/lib/otp.test.ts` — all cases pass (T003 and T004 were written to fail first)

**Checkpoint**: Verification is split, the 2-minute lifetime is enforced server-side, and every message key exists in both catalogues. All user stories can now proceed.

---

## Phase 3: User Story 1 - Phone sign-up creates a working account (Priority: P1)

**Goal**: A shopper who registers by mobile number becomes signed in and reaches `/user/profile`. Today they hit a silent dead end.

**Independent Test**: quickstart.md Scenario 4 — register with a real number on an SMS-configured deployment, enter the received code, confirm redirect to `/user/profile` with exactly one account row. **This is the scenario that proves the defect is fixed**; the local run (Scenario 1) is necessary but insufficient because the master code bypasses the database path.

### Implementation

- [X] T012 [US1] Extract the URL-inspection success-detection rule from `establishCredentialsSession` in `lib/actions/user.actions.ts` into one shared helper, and route both `establishCredentialsSession` and `establishSmsSession` through it (research.md R3, FR-022). Failure is when the returned URL carries an `error` query parameter OR its pathname matches the sign-in page — never "no exception was thrown". Both must still rethrow Next.js redirect errors unchanged and clear stale auth cookies on a non-credentials error
- [X] T013 [US1] Delete `signInWithCredentials` from `lib/actions/user.actions.ts` — it has no caller and duplicates the session logic with a weaker success check (FR-024)
- [X] T014 [US1] In `signUpUser` in `lib/actions/user.actions.ts`, replace `consumeSmsOtp` with `checkSmsOtp` at the pre-creation gate so verification no longer spends the code. Keep the ordering: the account MUST still be created only after the code verifies, otherwise a wrong code leaves an unverified account occupying the mobile number and every retry is rejected as "account exists" (research.md R2). Map the `expired` verdict to `otpExpired` and `invalid`/`notFound` to `invalidOtp`
- [X] T015 [US1] In `signUpUser` in `lib/actions/user.actions.ts`, replace the `redirect('/sign-in?callbackUrl=...')` fallback on session-establishment failure with an `ActionState` carrying `toast: 'accountCreatedNotSignedIn'` and `message: accountCreatedNotSignedIn`. **Never delete or roll back the created account** (clarification session, option B)
- [X] T016 [US1] In `app/(auth)/sign-up/signup-form.tsx`: render a `sonner` toast when `data.toast` is present, and make the sign-in path reachable from it
- [X] T017 [US1] **Deliberately skipped** — navigation is server-driven: `signUpUser` calls `redirect('/user/profile')` only after `established === true`, so a session cookie is guaranteed by construction and no client-side check can be reached. Research.md R3 rejected the extra round-trip for exactly this reason. The equivalent guarantee now lives in `signInUrlIndicatesFailure` (T012), which is what `established` is built on. Re-apply only if sign-up ever stops being server-redirected.
- [X] T018 [US1] In `app/(auth)/sign-up/signup-form.tsx`: after a successful send, start a 120-second countdown at `Math.ceil` of remaining milliseconds so it reads `2:00` immediately and `0:00` at expiry. Derive the duration from `OTP_TTL_SECONDS` in `lib/constants.ts`. Render Persian digits via `lib/persian.ts` formatters. Stop the countdown on submit
- [X] T019 [US1] In `app/(auth)/sign-up/signup-form.tsx`: lock the phone field once a code has been sent, and add the `changeNumber` control to release it. Releasing discards the pending code and resets the countdown. `PhoneField` already accepts `disabled` — no component change needed
- [X] T020 [US1] In `app/(auth)/sign-up/signup-form.tsx`: add the resend control, enabled only once the countdown reaches zero, showing its cool-down remaining while disabled (FR-020, FR-021)

**Checkpoint**: US1 is fully functional — quickstart Scenarios 1, 3, and 4 pass. The original defect no longer reproduces.

---

## Phase 4: User Story 2 - Sign-up failures are explained and recoverable (Priority: P2)

**Goal**: Every failure mode gets a specific, actionable message instead of silence or a generic failure.

**Independent Test**: quickstart.md Scenario 7 — work the failure table; each condition produces its own distinct message.

### Implementation

- [X] T021 [US2] Wire the `expired` and `invalid` verdicts to distinct messages in `signUpUser` in `lib/actions/user.actions.ts` — FR-006 requires a shopper to be able to tell "your code expired" from "that code was wrong". If both render the same string, the verdict distinction is not reaching the user
- [X] T022 [US2] Verify each FR-009 failure path in `lib/actions/user.actions.ts` returns its own message: incorrect code, expired code, unregistered number (sign-in), existing account, delivery failure, rate limit with a wait time, banned account. Reuse the existing `withActionMessage` pattern throughout
- [X] T023 [US2] In `app/(auth)/sign-up/signup-form.tsx` and `app/(auth)/sign-in/credentials-signin-form.tsx`, reuse the existing runtime fallback guard (`t.has(key) ? t(key) : tCommon('error')`, already present in the sign-in form) rather than adding a second mechanism, so a missing key degrades to a generic error instead of rendering blank
- [X] T024 [US2] Add the resend cool-down to `requestPhoneOtp` in `lib/actions/user.actions.ts`, keyed separately from the existing `otp:{phone}` limit. The existing 3-per-10-minutes bucket can be exhausted by two mistyped attempts, locking a shopper out of a legitimate retry under the 2-minute code lifetime (research.md R6). Return the remaining wait so the UI can show it

**Checkpoint**: US2 is fully functional — quickstart Scenario 7 passes, every failure is specific.

---

## Phase 5: User Story 3 - Sign-in behaves consistently with sign-up (Priority: P3)

**Goal**: Signing in by mobile gets the same discipline, so neither half of the account journey can fail silently.

**Independent Test**: quickstart.md Scenarios 2 and 8 plus the regression sweep — sign in with correct, wrong, expired, and unregistered numbers; confirm password sign-in and password reset are unaffected.

### Implementation

- [X] T025 [US3] In `app/(auth)/sign-in/credentials-signin-form.tsx`, unify the code-length rule with `signUpFormSchema` in `lib/validator.ts`. The form hardcodes `code.length !== 6` while the schema accepts 4–6 — pick one and apply it to both so the two halves agree
- [X] T026 [US3] In `app/(auth)/sign-in/credentials-signin-form.tsx`, add the countdown and phone-field lock using the same `OTP_TTL_SECONDS` constant and the same `changeNumber` release control as US1 — this is the same requirement, applied to the second form, not a new one
- [X] T027 [US3] In `app/(auth)/sign-in/credentials-signin-form.tsx`, surface `rate_limited` and `user_not_found` codes distinctly. The provider already raises typed errors for these (research.md R3 verified the codes survive to the client); confirm the mapping is complete
- [X] T028 [US3] Verify `auth.ts` SMS provider `authorize()` still calls `consumeSmsOtp` — this is the one legitimate consumption point, and it is reached only during sign-in, never during sign-up's pre-creation gate
- [X] T029 [US3] Make the Google OAuth redirect URI derive from `NEXT_PUBLIC_SITE_URL` in `lib/seo.ts` or a shared helper, falling back to `AUTH_URL` then `http://localhost:3000`, and confirm the registered value is `https://panahkalashop.com/api/auth/callback/google` (FR-026, FR-027). **The Google Cloud console change cannot be made from code** — record it as a manual step
- [X] T030 [US3] Land successful Google sign-in on `/user/profile` (FR-025), matching phone sign-up. On a provider error, return to `/sign-in` with `googleSignInFailed` rather than leaving the shopper on Google's error page; on a misconfigured redirect URI, show `googleSignInUnavailable` with working alternatives. Update `components/shared/auth/google-button.tsx` and `app/(auth)/sign-in/credentials-signin-form.tsx` as needed

**Checkpoint**: All three user stories are independently functional and testable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 Run the full validation gate: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Confirm no new failures against the T002 baseline
- [X] T032 [P] Update `docs/DEPLOYMENT.md` with the Google OAuth redirect URI requirement (`https://panahkalashop.com/api/auth/callback/google` under Authorized redirect URIs) and the note that `NEXT_PUBLIC_SITE_URL` drives it, plus the SMS.ir 2-minute code lifetime and resend cool-down
- [ ] T033 Run the quickstart.md regression sweep: password sign-in, password reset, profile contact change, guest cart merge, admin access, RTL layout at mobile width
- [X] T034 [P] Verify message parity with `__tests__/messages.test.ts` — nine new keys present in both catalogues
- [X] T035 Run `git diff --cached` and `git status` to confirm no credentials were staged: the Google client ID/secret and SMS.ir API key must remain environment-only and never enter version control (constitution III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3–5)**: All depend on Foundational
- **Polish (Phase 6)**: Depends on all desired user stories

### User Story Dependencies

- **User Story 1 (P1)**: Starts after Foundational — no dependencies on other stories. **This is the MVP.**
- **User Story 2 (P2)**: Starts after Foundational. Consumes the verdict type from T006 but is independently testable via Scenario 7.
- **User Story 3 (P3)**: Starts after Foundational. Reuses the session path built in T012 and the constants from T005.

### Within Each User Story

- Tests written and failing before implementation (T003, T004)
- Pure logic before actions, actions before UI
- Core implementation before integration

### Critical Path

```text
T006 (split verification) → T014 (use check at the gate) → T015 (fallback toast)
                                                                 ↓
                                                    quickstart Scenario 4
                                                    (the only proof the defect is fixed)
```

T006 is the single most important task. Everything else is routine once the verification is split.

### Parallel Opportunities

Tasks touching different files with no dependencies:

```bash
# Phase 2 — three independent files
Task: "T003 Create __tests__/lib/sms/verify-otp.test.ts"
Task: "T005 Add OTP_TTL_SECONDS to lib/constants.ts"
Task: "T008 Add toast discriminator to types/index.ts"
```

```bash
# Phase 6 — independent files
Task: "T032 Update docs/DEPLOYMENT.md"
Task: "T034 Verify message parity"
```

**Not parallel** — same file, sequential: T009→T010 (message parity test fails between them); T016→T017→T018→T019→T020 (all edit `signup-form.tsx`); T025→T026→T027 (all edit `credentials-signin-form.tsx`).

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T011)
3. Phase 3: User Story 1 (T012–T020)
4. **STOP and VALIDATE**: run quickstart Scenario 4 against a real SMS deployment
5. Deploy — the production dead end is resolved

### Incremental Delivery

1. Setup + Foundational → foundation ready
2. US1 → phone sign-up works → **deploy** (fixes the live outage)
3. US2 → failures explained → deploy
4. US3 → sign-in consistent + Google OAuth unblocked → deploy
5. Polish → full gate green

### Critical Delivery Note

**Do not ship US1 on local evidence.** Without an SMS provider configured, the master code short-circuits verification without touching the database, so the local test passes even with the original double-consume defect intact. That gap is exactly how this reached production. Scenario 4 is mandatory before reporting done (constitution V).

---

## Notes

- `[P]` = different files, no dependencies
- `[Story]` labels map to spec.md user stories for traceability
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at each checkpoint and validate the story independently
- Tasks T007 and T005 are related: the server lifetime and the UI countdown must derive from the same constant so they cannot drift
