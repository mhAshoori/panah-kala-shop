# Phase 0 Research: Phone Sign-Up Authentication Fix

Six technical decisions resolved. Each states what was chosen, why, and what else was evaluated.

---

## R1. Split one-time-code verification into a non-consuming check and a consuming consume

**Decision**: `lib/sms/verify-otp.ts` exports two functions instead of one:

- `checkSmsOtp(phone, code)` — verifies the code is currently valid. **Does not delete.**
- `consumeSmsOtp(phone, code)` — verifies and deletes in one atomic operation.

`signUpUser` calls `checkSmsOtp` to decide whether the account may be created. Session establishment consumes the code exactly once, by whichever path actually establishes the session.

**Rationale**: The double-consume is the root cause, and it is structural: one function that both decides and invalidates cannot safely be called twice in one flow. Splitting the responsibility makes each call site state its intent. The atomicity that `consumeSmsOtp` gets from `delete`-then-catch stays with the consume path, which is the only place that needs single-use semantics.

**Alternatives considered**:

- *Re-issue the code between the two steps* — rejected. Sends a second SMS per registration, doubles SMS cost, and delays sign-up for no benefit.
- *Add a `consume: boolean` flag parameter* — rejected. A boolean flag at a call site is a comment that can lie; two named functions cannot. The call site reads as either "may I?" or "use it up", which is exactly the distinction that was missed.
- *Pass a pre-verified flag from `signUpUser` to the provider* — rejected. Server actions and the Auth.js provider `authorize()` are separate call frames; threading a trust flag across them means a flag that bypasses verification, which is a security regression.

---

## R2. Keep verify-before-create ordering; consume exactly once at session establishment

**Decision**: The account is created only after `checkSmsOtp` passes. The code is consumed once, when the session is established.

**Rationale**: Creating the account first and verifying second is worse: a wrong code would leave an unverified account row occupying the mobile number, and the shopper's retry would be rejected with "account exists" — a permanent dead end requiring support intervention. That is exactly the class of bug being fixed. Verification must therefore gate creation.

This creates the ordering constraint that caused the original defect: the code must be proven *before* creation, yet the session can only be established *after* creation (there is no account to sign in otherwise). Splitting check from consume (R1) resolves it cleanly — the proof happens before, the consumption happens once, at session establishment, with no second verification needed because the credential is already proven.

**Alternatives considered**:

- *Create the account, then verify, then delete the account on failure* — rejected. Deleting on failure is a destructive rollback that can fail itself, and the user explicitly chose keep-and-notify (clarification session, option B): a created account is never deleted or rolled back.
- *Defer account creation to the first authenticated action* — rejected. Far larger change (lazy provisioning), adds a second code path, and violates "no dead ends" in spirit by leaving accounts in an unconfirmed limbo state.

---

## R3. Detect silent success by inspecting the returned URL, not the return shape

**Decision**: `establishSmsSession` must inspect what the sign-in call returns. Auth.js v5 with `redirect: false` returns `{ url }`. On failure the URL is the configured error page carrying `?error=...`; on success it is the callback URL with no error marker. Verified against the installed `@auth/core` source: on a `CredentialsSignin` error it builds `${origin}${errorPage}?error=${type}` and returns `Response.json({ url })` when not redirecting.

The fix: treat the attempt as failed when the returned URL contains an `error` query parameter **or** points at the sign-in page. Never treat "no exception thrown" as success.

**Rationale**: `signIn()` resolving does not mean a session cookie was written — this is precisely the trap the current code fell into. `establishCredentialsSession` already inspects the URL (`new URL(result)`, checks for `error` and `/sign-in`); `establishSmsSession` ignored the return value entirely. Unifying them onto one code path removes the asymmetry that allowed one flow to check and the other not to.

Additionally, the forms must verify a session exists before navigating — the sign-in form already does this correctly via `/api/auth/session`; the sign-up form does not.

**Alternatives considered**:

- *Always check `/api/auth/session` after the server action* — rejected as the primary mechanism: it is an extra network round-trip on every successful sign-up. Correct, but the URL check is sufficient and free; session verification is retained on the **client** before navigation, where a round-trip is already inherent to the navigation.
- *Catch and inspect exceptions only* — rejected. Auth.js converts `CredentialsSignin` into a returned URL rather than throwing when `redirect: false`, so exception-only checking misses the failure entirely. This is the bug.

---

## R4. Enforce the 2-minute expiry inside `consumeSmsOtp`, not only in the UI

**Decision**: `OTP_TTL_MS` changes from 5 minutes to 2 minutes (`lib/otp.ts`), and both `checkSmsOtp` and `consumeSmsOtp` reject a record whose `expires` is in the past. An expired code reports a distinct outcome so the message can distinguish "expired" from "incorrect" (FR-006, FR-009).

**Rationale**: The `expires` column is written by `requestPhoneOtp` and read **nowhere** — confirmed by grep across `lib/sms/` and `lib/actions/user.actions.ts`. Today a code is valid forever until used. A client-side countdown alone would be a UI affordance with no enforcement behind it; anyone bypassing the browser gets an unlimited-lifetime code. Enforcement belongs in the one function both paths route through.

The existing `expires` column makes this free — no migration (constitution VI).

**Alternatives considered**:

- *Enforce in the UI only, leave the server permissive* — rejected. That is the current state of affairs for the server and it is a security gap; FR-006 requires enforcement.
- *Delete expired rows on a schedule* — rejected as unnecessary complexity. Rejecting at read time is sufficient; cleanup is an optimisation, not a correctness requirement, and the table is tiny.
- *Keep 5 minutes and only add the countdown* — rejected. The user chose 2 minutes explicitly in clarification.

---

## R5. Derive the OAuth redirect URI from `NEXT_PUBLIC_SITE_URL`; register the callback path

**Decision**: The application derives its own base URL from `NEXT_PUBLIC_SITE_URL` (the variable already used throughout the codebase for SEO, emails, and the security headers), falling back to `AUTH_URL` then `http://localhost:3000`. The redirect URI sent to Google is that base plus the provider callback path. The Google Cloud console must list `https://panahkalashop.com/api/auth/callback/google` under **Authorized redirect URIs** and `https://panahkalashop.com` (plus the `www.` variant if used) under **Authorized JavaScript origins**.

**Rationale**: The registered URI is `https://panahkalashop.com` — the origin, not the callback. Auth.js sends `{base}/api/auth/callback/google`, so Google's literal string comparison finds no match and returns `redirect_uri_mismatch`. This is a two-sided problem: the console entry is wrong **and** `NEXTAUTH_URL`/`AUTH_URL` on the VPS is still likely the template default `http://localhost:3000`, which would make Auth.js redirect the browser to localhost. Both must be corrected.

Note `NEXT_PUBLIC_SITE_URL` is already the codebase's canonical site-address variable (`lib/seo.ts`, `lib/email/*`, `next.config.ts`, `lib/actions/user.actions.ts`) — reusing it satisfies constitution VII (reuse existing patterns) and avoids introducing a second source of truth.

**Alternatives considered**:

- *Add a dedicated `AUTH_TRUST_HOST`/`AUTH_URL` config* — rejected. Auth.js already reads `AUTH_URL`/`NEXTAUTH_URL` itself; adding another variable duplicates it and creates a third way for the base URL to be wrong.
- *Use a relative redirect URI* — rejected. Google's OAuth 2.0 for web apps requires absolute URIs.
- *Register only the origin and add both `www.` and bare hosts* — rejected as the sole fix. The origin entry does not cover the callback path; the callback URI is a separate list that must be populated.

---

## R6. Leave the in-memory rate limiter alone; document the deployment caveat

**Decision**: No change to `lib/rate-limit.ts`. The resend cool-down (FR-020) uses the existing `rateLimit` helper, as `requestPhoneOtp` already does.

**Rationale**: `rateLimit` is a fixed-window in-memory `Map` with a sweep. It resets on every deploy/restart and is not shared across processes. On a single VPS instance that is acceptable, and the deployment target *is* a single instance. Swapping it for Redis is a known future task already tracked in `docs/PRODUCTION_UPGRADE_PLAN.md` §4.B (the file's own header says exactly this). Changing it here would be speculative work for a scale this store does not have, and would violate constitution VII.

**Alternatives considered**:

- *Move to a persistent/Redis store now* — rejected. New dependency, new failure modes, no benefit at single-instance scale. Already documented as a production-upgrade item.
- *Skip the resend cool-down because the rate limit already exists* — rejected. The existing limit is 3 requests / 10 minutes keyed on the phone; with a 2-minute code lifetime, a shopper who mistypes twice could exhaust it and be locked out of a legitimate retry. The cool-down needs to be its own, shorter window so a resend after expiry is possible but rapid-fire requests are not.
