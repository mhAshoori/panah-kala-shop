# Quickstart: Phone Sign-Up Authentication Fix

Runnable validation for this feature. Each scenario states its prerequisites, the exact steps, and the expected outcome.

Related: [spec.md](spec.md) · [plan.md](plan.md) · [data-model.md](data-model.md) · [contracts/server-actions.md](contracts/server-actions.md) · [contracts/ui-behaviour.md](contracts/ui-behaviour.md)

---

## Prerequisites

| For | You need |
|---|---|
| Scenarios 1–3, 7 | `npm run dev` on `http://localhost:3000` — no SMS provider configured, master code `123456` is used |
| Scenario 4–6 | A deployment with `SMSIR_API_KEY` set and a reachable SMS sender line |

### The master-code trap

Without an SMS provider configured, the fixed master code `123456` short-circuits verification **without touching the database**. This is exactly why the original double-consume defect survived to production: locally, the second verification succeeds anyway.

**A passing Scenario 1 is therefore necessary but not sufficient.** Scenario 4 is the one that proves the defect is actually fixed. Do not report this feature done on local evidence alone (constitution V).

### Validation gate

Run in this order before every commit:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Expected: no new failures. The message-parity test must stay green — every new key goes into both `messages/fa.json` and `messages/en.json`.

---

## Scenario 1 — Phone sign-up completes and signs in (local)

**Covers** FR-001, FR-002, US1.

1. Open `http://localhost:3000/sign-up`.
2. Switch to phone mode.
3. Enter any unused 10-digit number.
4. Click **send code**.
5. Enter `123456`.
6. Click sign-up.

**Expected**:

- The shopper lands on `/user/profile`.
- The header shows them as signed in.
- The database contains exactly one account for that number.
- **No account was created and then deleted.**

```bash
npx prisma studio
```

Open the `User` table, filter by `mobile`. One row, with the name you entered.

---

## Scenario 2 — The code works exactly once (local)

**Covers** FR-008, US3 acceptance scenario 3.

1. Complete Scenario 1.
2. Sign out.
3. On the sign-up page, enter **the same number** and the **same code** `123456`.

**Expected**: rejected with "code is not valid".

The local master code does not exercise the database path, so to prove single-use semantics against real stored codes use Scenario 4. The local run still confirms the duplicate-account guard rejects the re-attempt.

---

## Scenario 3 — Countdown and phone lock (local)

**Covers** FR-017, FR-018, FR-019, FR-020.

1. On `/sign-up` phone mode, enter a 10-digit number.
2. Click **send code**.
3. Watch the countdown begin at `۲:۰۰` and tick down once per second.
4. Try to type into the phone field.
5. Click the **change number** control.
6. Edit the number.
7. Re-enter the original number and click **send code** again.
8. Observe the resend control.

**Expected**:

- The countdown starts at exactly `۲:۰۰` (never `۱:۵۹`).
- The phone field does not accept input while the code is outstanding.
- **change number** returns it to editable and resets the countdown.
- The resend control is **not** available while a code is still valid.
- Once the countdown reaches zero, the resend control becomes available with its cool-down remaining.

**Why step 8 matters**: the user selected "resend with a wait, then manual". A resend button that is available immediately during a valid code is the rejected alternative.

---

## Scenario 4 — Real SMS delivery, full journey (production or SMS-configured)

**Covers** FR-001, FR-002, FR-006, SC-001, SC-007. **This is the scenario that proves the fix.**

Set `SMSIR_API_KEY` and `SMSIR_LINE_NUMBER` in the environment. Optionally set `SMSIR_DEBUG=1` to log the wire traffic server-side.

1. Open the site, go to `/sign-up`, switch to phone mode.
2. Enter a real, unused Iranian mobile number.
3. Click **send code**. Confirm the SMS arrives.
4. Note the time. Enter the received code immediately and submit.

**Expected**:

- The shopper lands on `/user/profile`, signed in.
- The database holds exactly one account for that number.
- Server logs show the code was verified **once** to authorize creation and consumed **once** to establish the session — not twice.

### The defect this catches

Before the fix, step 4 produced: account created, no session, silent failure on the form. After the fix: signed in on `/user/profile`. **If this scenario shows the old behaviour, the fix is incomplete regardless of what local testing says.**

---

## Scenario 5 — Expiry enforcement (production or SMS-configured)

**Covers** FR-006, FR-009, SC-006.

1. Request a code.
2. Wait more than 2 minutes without entering it.
3. Enter the now-expired code and submit.

**Expected**:

- Rejected with the **expired** message, distinct from the wrong-code message (FR-006 requires the distinction).
- No account is created.
- The resend control is available with its cool-down.
- After resending, the new code works and the countdown restarts.

Then, separately:

4. Request a code, enter a **wrong** code, submit.

**Expected**: rejected with the *invalid code* message, **not** the expired one. If both conditions show the same message, the verdict distinction is not implemented.

---

## Scenario 6 — Google OAuth redirect URI (production)

**Covers** FR-025, FR-026, FR-027, SC-009.

### The diagnosis first

The registered redirect URI is `https://panahkalashop.com` — the origin. Auth.js sends `{base}/api/auth/callback/google`. Google's comparison is literal, so the origin entry never matches and returns `redirect_uri_mismatch`. **Two things must both be correct.**

### Part A — application configuration

```bash
grep -E "NEXT_PUBLIC_SITE_URL|AUTH_URL|NEXTAUTH_URL|AUTH_TRUST_HOST" .env
```

`NEXT_PUBLIC_SITE_URL` must be `https://panahkalashop.com` with no trailing slash and no `www.` mismatch. If it is unset or still the template default, Auth.js builds callbacks from the wrong origin.

After changing any environment value, restart the service:

```bash
sudo systemctl restart panah
```

### Part B — Google Cloud console

In the OAuth client's **Authorized redirect URIs**, this exact string must be present:

```text
https://panahkalashop.com/api/auth/callback/google
```

**Authorized JavaScript origins** should contain:

```text
https://panahkalashop.com
https://www.panahkalashop.com
```

> The console change **cannot be made from the codebase**. If Part B is not done, the code fix alone will not unblock Google sign-in. This is recorded explicitly because it is the step most likely to be missed.

### Verify

1. Sign out.
2. Open `/sign-in`.
3. Click **sign in with Google**.
4. Complete Google's consent screen.

**Expected**: lands on `/user/profile`, signed in.

Also verify each origin independently — arrive at the bare domain and at the `www.` address in separate browser sessions and confirm both work.

---

## Scenario 7 — Failure messages are distinct and actionable

**Covers** FR-009, SC-005.

Work through each, confirming a **specific** message rather than a generic failure:

| # | Setup | Action | Expected |
|---|---|---|---|
| 1 | Phone mode | Submit an empty/short code | Validation message naming the requirement |
| 2 | Phone mode | Submit a wrong code | "code is not valid" |
| 3 | Phone mode | Sign up with a number that already has an account | "account exists", pointed at sign-in |
| 4 | Sign-in phone mode | Request a code for an unregistered number | "not registered", pointed at sign-up |
| 5 | Phone mode | Click send code four times rapidly | Rate-limit message **with a wait time** |
| 6 | Local | Sign in with a known-banned account | Refusal message |

**Any generic or blank message fails this scenario.** The original defect was invisible precisely because failures reported nothing.

---

## Scenario 8 — Email sign-up is unaffected (local)

**Covers** FR-022 — the shared session path must not regress the other mode.

1. `/sign-up`, email mode.
2. Register with a fresh email.
3. Confirm redirect to `/user/profile` and one database row.

Then confirm the **existing** email sign-in still works at `/sign-in`, since `signInWithCredentials` was deleted and its logic moved to the shared path.

```bash
npx tsc --noEmit
```

Must be clean — a deleted export with a lingering reference surfaces here.

---

## Regression sweep

After the fix, confirm these still work, since they share the touched code paths:

- [ ] Password sign-in (the credentials provider path was refactored into the shared session path)
- [ ] Password reset request and completion (shares `VerificationToken`)
- [ ] Profile email/mobile change (shares the verification and code-issuing logic)
- [ ] Guest cart merge on sign-in (runs in the JWT callback)
- [ ] Google sign-in (Scenario 6)
- [ ] Admin panel access for an admin account
- [ ] RTL layout of both auth pages at mobile width
