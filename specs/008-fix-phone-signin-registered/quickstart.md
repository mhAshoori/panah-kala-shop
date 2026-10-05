# Quickstart: Fix Phone Sign-In for Registered Numbers

Runnable validation. Each scenario states prerequisites, steps, and expected outcome.

Related: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/decision-logic.md](contracts/decision-logic.md) · [contracts/toast-behaviour.md](contracts/toast-behaviour.md)

---

## Prerequisites

| For | You need |
|---|---|
| Scenarios 1–5 | `npm run dev` on `http://localhost:3000`, no SMS provider (master code `123456`) |
| Scenario 1, 6 | A deployment with `SMSIR_API_KEY` set and a reachable sender line |

### The master-code caveat, restated

Without `SMSIR_API_KEY`, the master code `123456` verifies **without touching the database**. The scenarios below that check the *decision* (whether a code is offered) are valid locally. Scenarios that depend on real delivery are marked.

### Validation gate

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Expect the new decision test to pass with **8 asserted rows** and no new lint warnings (baseline: 15 warnings, 0 errors).

---

## Scenario 1 — The round trip that fails today (REAL SMS)

**Covers** FR-001, FR-002, SC-001, SC-004. **This is the scenario the feature exists to fix.**

1. Open `/sign-up` → phone mode.
2. Enter an **unregistered** number.
3. Request a code, complete registration, confirm you land on `/user/profile`.
4. Sign out.
5. Open `/sign-in` → phone mode.
6. Enter **the same number** you just registered.
7. Request a code.

**Expected at step 7**: the code is sent. No warning. Enter the received code and confirm you are signed in on your intended destination.

**Before the fix**: step 7 shows *"این شماره موبایل قبلاً ثبت شده است — وارد شوید"* — "already registered — please sign in" — on the sign-in page, and no code is sent.

---

## Scenario 2 — Sign-up still refuses a taken number

**Covers** FR-006, SC-005, SC-007. Guards against the fix over-correcting.

1. Take a number already registered (from Scenario 1, or an existing account).
2. Open `/sign-up` → phone mode.
3. Enter it and request a code.

**Expected**: refused, no code sent, message directs to sign in.

The message here is correct and must **not** be removed. Only its appearance on the *sign-in* page was wrong.

---

## Scenario 3 — Sign-in refuses an unregistered number, with the number carried over

**Covers** FR-004, FR-005.

1. Open `/sign-in` → phone mode.
2. Enter a number that has **no** account.
3. Request a code.

**Expected**:

- No code is sent.
- The shopper is told the number is not registered and directed to sign up.
- Following that link arrives at the sign-up page **with the number already filled in**.

---

## Scenario 4 — The two pages never affect each other

**Covers** FR-003, FR-007, SC-006.

1. Open `/sign-in`, enter a **registered** number, request a code → sent (Scenario 1 behaviour).
2. Without reloading anything, navigate to `/sign-up`.
3. Enter **that same registered** number, request a code → refused (Scenario 2 behaviour).

**Expected**: the same number produces opposite, correct outcomes on the two pages, with no cached verdict carried between them (research.md R5, FR-010).

Repeat the reverse order — sign-up first, then sign-in — to catch a verdict cached in the other direction.

---

## Scenario 5 — Releasing the number discards the decision

**Covers** FR-010.

1. On `/sign-in`, enter a number with no account and request a code → refused.
2. Click **change number** (تغییر شماره).
3. Enter a number that **has** an account.
4. Request a code.

**Expected**: the second number proceeds and a code is sent. The first number's refusal must not be reused.

---

## Scenario 6 — Success toast survives navigation (REAL SMS)

**Covers** the sign-in success toast. This is the toast most likely to be silently broken.

1. Complete Scenario 1's round trip to the point of a signed-in destination.
2. Watch the **destination page**, not the sign-in page.

**Expected**: a success toast appears on the page you land on.

**Before the fix**: no toast exists. After a naive fix that toasts immediately before navigating: the toast is unmounted with the form and is never seen at all. Both look identical on the sign-in page, which is why the destination page is what must be inspected.

---

## Scenario 7 — Failure toasts and their messages

**Covers** the failure-toast contract, FR-009.

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | Registered number, sign-in | Enter `000000` | Error toast + inline error, "code not valid" |
| 2 | Request a code, wait >2 min | Enter the expired code | Toast, and the message must **differ** from #1 |
| 3 | Phone sign-in | Submit repeatedly past the limit | Toast with a wait time |
| 4 | Any code request | Make the lookup fail or throttle | "could not check — try again" — **not** "not registered" |

Row 4 matters most: a throttled lookup has not actually run, so claiming the number is unregistered is a false statement. Row 2 confirms FR-006's expired/invalid distinction survived this change.

---

## Scenario 8 — Email and Google paths unaffected

**Covers** regression safety.

- [ ] Email + password sign-up still lands on `/user/profile`
- [ ] Email + password sign-in still works
- [ ] Google sign-in still lands on `/user/profile` (needs the console redirect URI registered — see 007's `docs/DEPLOYMENT.md` §9b)
- [ ] Banned account is refused at sign-in with a specific message, **not** told to register (FR-008)

The banned-account row is a security requirement, not cosmetics: treating a banned account as unregistered points the shopper at sign-up, where they would hit "already registered".

---

## Scenario 9 — Unit tests

```bash
npx jest __tests__/lib/phone-otp-intent.test.ts
```

**Expected**: 8 truth-table rows plus the guard assertions, all passing. The two rows that matter most are `sign-in` + `active` → send, and `register` + `active` → refuse. If either fails, the feature is not fixed regardless of what any browser check shows.

```bash
npm test
```

**Expected**: full suite green, no regression from the widened `checkPhoneRegistered` return shape.

---

## Regression sweep

Both auth forms were edited. Confirm:

- [ ] Countdown still starts at `۲:۰۰` and ticks, in Persian digits
- [ ] Phone field still locks read-only (not `disabled` — that drops it from FormData, the 007 bug)
- [ ] Resend still unlocks only after expiry, with cool-down
- [ ] `name` field survives a failed submit
- [ ] RTL layout on both pages at mobile width
- [ ] Message parity: `__tests__/messages.test.ts` green with the new keys in both catalogues
