# Contract: Server Actions & Verification Helpers

Public interfaces this feature adds or changes. Signatures are the contract; implementations belong in `tasks.md`.

---

## `lib/sms/verify-otp.ts` — split verification

The current module exports one function that both validates and destroys the code. It exports two instead, so a call site states its intent.

### `checkSmsOtp`

Verifies a code is currently valid. **Does not delete.** Authorizes an action (e.g. "may this account be created?") without spending the credential.

```ts
export type OtpVerdict = 'valid' | 'invalid' | 'expired' | 'notFound';

export async function checkSmsOtp(
  phone: string,   // +989XXXXXXXXX
  code: string     // 6 digits
): Promise<OtpVerdict>
```

| Verdict | Meaning | Caller reports |
|---|---|---|
| `valid` | A matching, unexpired row exists | — proceed |
| `expired` | A matching row exists but its expiry has passed | "code has expired" |
| `invalid` | No matching row (wrong code, wrong number, never issued) | "code is not valid" |
| `notFound` | Same as `invalid` — reserved for a consumed code | "code is not valid" |

`expired` vs `invalid` is what makes FR-006's "distinct message" possible. A wrong code and an already-consumed code both report `invalid` and share a message — that is correct and avoids leaking which codes existed. `notFound` exists as a separate literal only so callers can distinguish consumption when it matters; it maps to the same user-facing message as `invalid`.

**Dev fallback**: when no SMS provider is configured, the fixed master code `123456` returns `valid` **without touching the database**, matching current behaviour so local dev and CI stay testable.

### `consumeSmsOtp`

Verifies and destroys in one operation. Exactly one call per sign-up attempt, at session establishment.

```ts
export async function consumeSmsOtp(
  phone: string,
  code: string
): Promise<OtpVerdict>
```

Returns the same verdict set as `checkSmsOtp`, but on `valid` the row is deleted atomically.

**Contract rule**: `consumeSmsOtp` MUST be called at most once per sign-up or sign-in attempt. Calling it after another `consumeSmsOtp` returned `valid` in the same attempt MUST NOT happen — the row is gone, so the second call returns `invalid`. That is the defect being fixed, and it is now structurally impossible to do by accident because `signUpUser` calls `checkSmsOtp` (not `consume`) before creation.

### Invariant

> `consumeSmsOtp` and `checkSmsOtp` MUST both reject a code whose stored expiry has passed (FR-006). Currently `expires` is written and never read — this is the security gap being closed.

---

## `lib/otp.ts` — lifetime

```ts
export const OTP_TTL_MS = 2 * 60 * 1000;  // was 5 minutes
```

Applies to `otp:`-prefixed records only. Password-reset tokens keep `RESET_TOKEN_TTL_MS` (15 minutes), which is already enforced.

The countdown shown in the UI MUST derive its duration from this same constant so the displayed value cannot drift from what the server enforces.

---

## `lib/actions/user.actions.ts`

### `signUpUser` — rewritten

```ts
export async function signUpUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState>
```

Input fields read from `formData` (unchanged): `name`, `mode` (`'email' | 'phone'`), `email`, `mobile`, `password`, `confirmPassword`, `otpCode`, `callbackUrl`.

Phone-mode sequence:

| Step | Action | On failure |
|---|---|---|
| 1 | Rate limit (`signup:{email}` — note: keyed on email even in phone mode; existing behaviour, see note below) | `{ success: false, message: tooManyAttempts }` |
| 2 | Parse + validate against `signUpFormSchema` | `{ success: false, message: <validation> }` |
| 3 | Duplicate check on email OR mobile | `{ success: false, message: accountExists }` |
| 4 | **`checkSmsOtp`** (non-consuming) | `expired` → expired message; `invalid`/`notFound` → invalid code message. **No account created.** |
| 5 | Create the account | propagated error |
| 6 | `recordNotification({ type: 'signup', ... })` | never blocks sign-up |
| 7 | **Establish session**, consuming the code exactly once | see below |
| 8 | `redirect('/user/profile')` | — |

**Session-establishment outcomes in phone mode:**

| Outcome | Behaviour |
|---|---|
| Session established | `redirect('/user/profile')` |
| Session not established | **Keep the account** (never delete — clarification option B). Return a state carrying a toast that says the account was created but they are not signed in, plus the sign-in path. |
| Stale auth cookie cleared | Return `{ success: false, message: '', retry: true }` — existing convention, client re-submits once |

**Key contract change**: the current code calls `redirect('/sign-in?...')` when session establishment fails. That is replaced by returning an actionable state. A redirect gives the shopper no explanation; the toast does (FR-016).

> Note on step 1: `signUpUser` rate-limits on `signup:{email}`, which is the literal string `'unknown'` for a phone-only sign-up because `email` is empty. Every phone sign-up therefore shares one bucket. This is pre-existing and out of scope to fix here, but it is noted because it makes the phone sign-up rate limit effectively global.

### `establishSmsSession` — corrected

```ts
async function establishSmsSession(phone: string, code: string): Promise<boolean>
```

Current implementation discards the return value of the sign-in call and returns `true` unconditionally on no-throw. Contract:

- Call the SMS provider with `redirect: false`.
- **Inspect the returned URL**: failure iff it carries an `error` query parameter **or** its pathname matches the sign-in page.
- Return `false` on failure. Never infer success from the absence of a thrown exception.
- Rethrow Next.js redirect errors unchanged.
- On a non-credentials error, clear stale auth cookies and raise the existing retryable-sign-in signal.

Rationale in research.md R3 — Auth.js v5 converts a credentials failure into a returned URL rather than a throw when `redirect: false`, so exception-only checking misses every failure.

### Shared session path

`establishCredentialsSession` and `establishSmsSession` MUST share one implementation of the success-detection rule described above, differing only in provider id and payload (FR-022). `establishCredentialsSession` already implements this rule correctly; `establishSmsSession` must be brought onto it and the shared logic extracted so the two cannot drift apart again.

### `signInWithCredentials` — deleted

No caller exists (verified by grep across the repository: the only match is its own definition). It duplicates `establishCredentialsSession` with a subtly different, weaker success check. Removed per FR-024 so there is exactly one way an account is signed in.

Its helper `establishCredentialsSession` survives, refactored into the shared path above.

### Unchanged (explicitly)

`requestPhoneOtp`, `checkPhoneRegistered`, `SignOutUser`, `SignOut` behaviour, the credentials provider's `authorize()`, and the SMS provider's `authorize()` keep their current signatures. The provider's `authorize()` continues to call `consumeSmsOtp` — that is the one legitimate consumption point.

---

## `types/index.ts` — `ActionState`

```ts
export type ActionState = {
  success: boolean;
  message: string;
  retry?: boolean;          // existing
  toast?: 'accountCreatedNotSignedIn';  // new discriminated value
};
```

The `toast` discriminator exists so the client renders a `sonner` toast rather than an inline form error. A `toast` state is one where the shopper's account **was** created — it must never be paired with `success: false` in a way that implies the account was rolled back.

---

## Message Keys (bilingual parity required)

New keys, added to **both** `messages/fa.json` and `messages/en.json` under the `auth` namespace. `__tests__/messages.test.ts` fails the suite on divergence.

| Key | Purpose |
|---|---|
| `otpExpired` | Code was valid but its 2 minutes elapsed |
| `accountCreatedNotSignedIn` | Account exists, shopper is not signed in — toast text |
| `signInToContinue` | Call to action accompanying the above toast |
| `resendCode` | Label for the resend control |
| `resendIn` | Countdown format for the resend cool-down |
| `changeNumber` | Explicit control to release the locked phone field |
| `otpCountdown` | Countdown format for the active code |
| `googleSignInFailed` | Provider-side OAuth error, returned to the sign-in page |
| `googleSignInUnavailable` | Redirect URI misconfigured; offer email/phone instead |

Persian is the default locale. All copy must be natural Persian, not transliterated English (constitution I, IV).

---

## Contract Tests

Pure logic in `lib/sms/verify-otp.ts` and `lib/otp.ts` gets Jest coverage in `__tests__/`. Required cases:

1. A correct unexpired code returns `valid`.
2. An expired code returns `expired` (distinct from `invalid`) — **this is the new enforcement**.
3. A wrong code returns `invalid`.
4. `checkSmsOtp` does not delete the row; a subsequent `consumeSmsOtp` with the same code still succeeds.
5. `consumeSmsOtp` deletes; a second `consumeSmsOtp` returns `invalid`.
6. A code issued to number A does not verify number B.
7. `OTP_TTL_MS` is 2 minutes.
8. With no SMS provider configured, master code `123456` verifies without a database round-trip.
