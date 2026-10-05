# Contract: Code Request Decision Logic

The single place where "should this number get a code?" is answered. Everything else obeys it.

---

## `lib/phone-otp-intent.ts`

Client-safe module: no `node:` imports, no Prisma, no server-only dependencies. Both auth forms are `'use client'`, so anything imported from here lands in the browser bundle.

```ts
export type OtpIntent = 'sign-in' | 'register';
export type PhoneAccountStatus = 'active' | 'none' | 'banned' | 'unknown';

export type OtpDecision = {
  canSend: boolean;
  /** null when the code may be sent; otherwise the message key to show */
  messageKey: string | null;
  /** where to send the shopper, when the answer is a redirect */
  redirectTo: 'sign-in' | 'sign-up' | null;
};

export function decideOtpSend(
  intent: OtpIntent,
  status: PhoneAccountStatus
): OtpDecision;
```

### Truth table — exhaustive, and the unit test's whole body

| intent | status | canSend | messageKey | redirectTo | Requirement |
|---|---|---|---|---|---|
| `sign-in` | `active` | ✅ | `null` | `null` | FR-001 |
| `sign-in` | `banned` | ✅ | `null` | `null` | FR-008 |
| `sign-in` | `none` | ❌ | `phoneNotRegistered` | `sign-up` | FR-004 |
| `sign-in` | `unknown` | ❌ | `phoneCheckFailed` | `null` | FR-009 |
| `register` | `active` | ❌ | `phoneAlreadyRegistered` | `sign-in` | FR-006 |
| `register` | `banned` | ❌ | `phoneAlreadyRegistered` | `sign-in` | FR-006 |
| `register` | `none` | ✅ | `null` | `null` | FR-006 |
| `register` | `unknown` | ❌ | `phoneCheckFailed` | `null` | FR-009 |

Eight rows, all of them asserted. There is no default branch — an unhandled combination is a type error, not a silent pass.

### The two rules that were previously wrong

| Row | Old behaviour | Correct |
|---|---|---|
| `sign-in` + `active` | refused: *"already registered — please sign in"* (while on the sign-in page) | **send the code** — this is the expected case |
| `sign-in` + `none` | refused by a second rule in the caller, no code | refuse with *"not registered"* and a link to sign-up |

Both are FR-001 and FR-004. Everything else was already right.

### `banned` is treated as registered on purpose

On **sign-up**, banned is refused exactly like active: the number is taken, and that is all the shopper needs to know. On **sign-in**, a code is sent and the refusal happens at verification with a specific message, so a banned person is not told to go and register (FR-008). Treating banned as "unregistered" would point them at sign-up, where they would hit "already registered" — a confusing dead end for someone who simply cannot use the account.

---

## `checkPhoneRegistered` — widened return

```ts
// lib/actions/user.actions.ts
export async function checkPhoneRegistered(
  phone: string
): Promise<{ account: PhoneAccountStatus }>;
```

| Return | When | Requirement |
|---|---|---|
| `'active'` | account exists, not banned | — |
| `'none'` | no account for this number | — |
| `'banned'` | account exists and is banned | FR-008 |
| `'unknown'` | throttle tripped, or query failed | FR-009 |

Two call sites exist (`signup-form.tsx`, `credentials-signin-form.tsx`); both are updated in the same change.

**The throttle must return `'unknown'`**, never `'none'`. It currently returns `{ registered: false }` after 10 lookups, which claims the number is unregistered on the strength of a lookup that never ran — a false statement to the shopper, and a route into a duplicate-account error on sign-up.

---

## `PhoneOtpSection` — new prop, no logic

```ts
type Props = {
  mobile: string;
  onMobileChange: (v: string) => void;
  name?: string;
  otpFieldName: string;
  intent: OtpIntent;              // NEW — replaces `registerCheck`
};
```

The `registerCheck` callback is **removed**. The component now:

1. normalizes the number,
2. calls `checkPhoneRegistered`,
3. passes the result to `decideOtpSend(intent, status)`,
4. shows `decision.messageKey` (or navigates to `decision.redirectTo`) when refused,
5. otherwise sends the code.

The component holds **no conditional of its own** about whether a number is registered (FR-003, FR-007). Any such conditional reintroduces the two-file split that caused this bug.

### On release, state resets

Releasing the phone field clears the pending code, the countdown and the cooldown. No verdict is retained (research.md R5, FR-010).

---

## Sign-up referral carries the number

When `redirectTo === 'sign-up'`, the link includes the number so the shopper does not retype it (FR-005):

```
/sign-up?mobile=9123456789
```

The sign-up form reads `mobile` from the query string into its existing phone state on mount.

---

## Contract Tests

`__tests__/lib/phone-otp-intent.test.ts` — exhaustive over the truth table:

1. All 8 rows asserted explicitly (not snapshot — a snapshot would pass unchanged if the table itself were wrong).
2. `sign-in` + `active` → `canSend: true` — **the regression this feature exists to fix.**
3. `sign-in` + `none` → `canSend: false` with `phoneNotRegistered`.
4. `register` + `active` → `canSend: false` with `phoneAlreadyRegistered` — guards against the fix over-correcting and weakening sign-up.
5. `register` + `none` → `canSend: true`.
6. `unknown` refuses on **both** intents.
7. `banned` behaves as registered on `register`, and as sendable on `sign-in`.
8. No row returns a `messageKey` when `canSend` is true, or a `messageKey` of `null` when it is false.
9. The function is pure: same inputs give equal outputs across repeated calls (no hidden state, no clock).

Every row asserted, no snapshot. A snapshot test would have passed on the broken code — it was the *absence* of an explicit assertion that let 007 through.
