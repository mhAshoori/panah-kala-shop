# Contract: UI Behaviour — Countdown, Phone Lock, Resend, Toast

Client-visible behaviour for both the sign-up and sign-in phone flows. Applies to `app/(auth)/sign-up/signup-form.tsx` and `app/(auth)/sign-in/credentials-signin-form.tsx`.

RTL note: this is a Persian-first RTL storefront. Use logical properties (`start`/`end`, `ms-`/`me-`) per constitution I. Any directional icon needs `rtl:-scale-x-100`.

---

## 1. Code Request Lifecycle

### Before a code is sent

- Phone field is editable and enabled.
- The send-code control is disabled until exactly 10 digits are entered.
- No countdown, no resend control.

### On successful send

- A countdown begins at 120 seconds, starting from the moment the send succeeded.
- The resend control is **not** available yet.

### On failed send

- No countdown starts. The failure message is shown in place.
- The shopper may retry immediately.

---

## 2. Countdown (FR-017, FR-006)

| Property | Value |
|---|---|
| Duration | 120 seconds, derived from the same constant the server enforces |
| Ticks | Once per second |
| Starts | When the send request resolves successfully |
| Ends | Reaching zero, **or** the shopper submits the code |

| State | Display |
|---|---|
| Active | Remaining time in `mm:ss`, Persian digits |
| Expired | Expired-code message; resend control becomes available |
| Submitted | Countdown stops; the shopper's outcome is shown |

**Server authority**: the countdown is an affordance, not the enforcement point. A code past its 2 minutes is rejected server-side regardless of what the countdown shows (FR-006). A shopper whose device clock drifted sees a rejection, not a bypass.

**Rounding**: display `Math.ceil` of remaining milliseconds, so the countdown reads `2:00` immediately after sending and `0:00` at expiry — never showing `0:01` for a code that has already expired.

---

## 3. Phone Field Lock (FR-018, FR-019)

Once a code has been successfully sent, the phone number field becomes read-only.

| Rule | Detail |
|---|---|
| Purpose | A code is issued to one specific number. Letting the number change underneath an outstanding code invites submitting a code against the wrong number — which fails confusingly at best |
| Release control | An explicit button (`changeNumber`) returns the field to editable |
| On release | The pending code for the previous number is discarded and the countdown resets |
| On re-send | Requesting a code for a new number invalidates the previous one, server-side, independent of what the client does (FR-007) |

**Enforcement is server-side**: if the phone number is tampered with in the request despite the disabled field, verification still fails, because the code was issued to the original number (FR-012). The lock is a UX guard; the check is a security boundary.

Accessibility: the disabled field is announced as read-only; the release button is a real focusable button, not a link.

---

## 4. Resend (FR-020, FR-021)

| Rule | Detail |
|---|---|
| Availability | Enabled once the current code has expired (countdown reaches zero) |
| Cool-down | A short wait between code requests, enforced server-side; the control shows the remaining cool-down rather than disappearing |
| Replacement | Each request invalidates the previous code; only the newest works |
| Expiry reset | Each resend restarts the 120-second countdown from that send |
| Rate limit | Requests beyond the configured limit show a wait time, not a generic failure (FR-009) |

The resend control is **never** available while a code is still valid. This is the user-selected behaviour: wait for expiry, then resend manually. It prevents draining SMS credit while still letting a shopper recover from a code that never arrived without waiting out a further cool-down.

---

## 5. Sign-up Outcome Handling (FR-003, FR-016, SC-002)

**Every** completed sign-up attempt ends in exactly one of three states. There is no fourth state where the shopper is left on the form with no feedback.

| Outcome | Display | Destination |
|---|---|---|
| Account created, session established | Nothing to read; navigation happens | `/user/profile` |
| Account created, session **not** established | `sonner` toast: account was created, not signed in yet, with a sign-in action | `/sign-in` |
| Failure before account creation | Inline form error with the specific reason | stays on the form, shopper can correct and retry |

### The fallback toast

This is a rare condition that must not occur in normal operation — a shopper who signs up becomes signed in immediately (clarification session). When it does happen:

- The account is **kept**, never deleted or rolled back.
- The toast states plainly that the account was created and that they need to sign in.
- The toast offers a direct sign-in action.

**Never** rendered for email-mode sign-up, which takes the same shared session path and therefore shares this behaviour.

---

## 6. Session Verification Before Navigation (FR-023)

Both forms MUST confirm a session actually exists before navigating, rather than inferring success from the request completing.

The sign-in form already does this correctly: it calls the session endpoint with caching disabled and only navigates when a session is present. The sign-up form does not — it navigates on action success alone.

Both MUST follow the same discipline. Rationale in research.md R3: a request completing without error does not imply a session cookie was written.

---

## 7. Failure Messages (FR-009)

Each distinct condition gets its own message. A generic failure is not acceptable — it is what made the original defect invisible.

| Condition | Message |
|---|---|
| Wrong code | Code is not valid |
| Expired code | Code has expired — request a new one |
| Number not registered (sign-in) | This number is not registered — sign up |
| Number already registered (sign-up) | An account already exists for this number |
| Delivery failed | The message could not be sent — try again |
| Rate limited | Too many attempts — wait N seconds |
| Banned account | This account has been suspended |
| OAuth provider error | Google sign-in failed — return to sign-in with the reason |
| OAuth misconfigured | Google sign-in is unavailable — use your number or email |

Runtime fallback: a missing translation key MUST fall back to a generic error rather than rendering an empty or broken message. The sign-in form already has this guard (`t.has(key)`); reuse it rather than inventing a second mechanism.

---

## 8. Google OAuth Landing (FR-025)

A successful Google sign-in lands the shopper on `/user/profile`, matching the phone sign-up behaviour. Every new shopper completes the same profile step regardless of how they authenticated.

| Condition | Behaviour |
|---|---|
| Successful Google sign-in | `/user/profile` |
| Provider returns an error | Return to `/sign-in` with a specific message and a working alternative (mobile code or email/password) — never leave the shopper on a provider error page |
| Redirect URI not registered | Show `googleSignInUnavailable` with the alternatives |

The redirect URI the application sends MUST exactly match a registered value — same scheme, host, port, and path (`https://panahkalashop.com/api/auth/callback/google`). The code fix cannot register it; the Google Cloud console must list the callback path under **Authorized redirect URIs**. Both halves are required; see quickstart Scenario 6.

---

## Accessibility

- Countdown text is announced politely rather than assertively — a per-second assertive announcement would flood a screen reader.
- The resend control exposes its disabled state and its remaining wait to assistive technology.
- The phone field lock is conveyed as read-only state, not merely visual greying.
- Errors are associated with their field where one exists.
- All new copy exists in both Persian and English (constitution IV); the parity test enforces it.
