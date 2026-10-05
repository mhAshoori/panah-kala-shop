# Feature Specification: Phone Sign-Up Authentication Fix

**Feature Branch**: `007-fix-phone-signup-auth`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "on production, where there are real api keys for the SMS.ir using phone registration, when a new user signs up using phone number, after entering the code which was sent to him, nothing happens and he stays not logged in the sign-up page. that's wrong. he must get redirected to /user/profile. inspect the sign-in sign-up features overall see if there are some unwanted behaviors."

## Problem Statement

A shopper who registers a new account by mobile number on the live site receives a valid SMS code, enters it, presses the sign-up button, and **nothing happens**. The page stays on the sign-up form and they are never signed in. They cannot complete account creation, and the account row that was created for them is left behind occupying the mobile number — so a retry is rejected with "this account already exists," dead-ending the shopper entirely.

The failure is silent: no success toast, no error message, no redirect. It only appears once real SMS delivery is configured; in local development (where a fixed master code short-circuits verification) the flow appeared to work, which is why the defect survived to production.

A full inspection of the sign-in and sign-up features was requested at the same time; this spec covers the blocking defect plus the unwanted behaviours found alongside it.

## Root Cause (confirmed by code inspection)

The one-time code is **consumed twice** in a single sign-up attempt:

1. `signUpUser` verifies the code to decide whether the account may be created — this deletes the stored code so it cannot be replayed. **Correct in isolation.**
2. `signUpUser` then calls the SMS sign-in provider to establish the session. That provider verifies the *same* code again. The row is already gone, so verification fails, no session cookie is written, and the provider reports "not signed in."
3. The action treats that as "account exists but auto sign-in failed" and sends the shopper to the sign-in page.

Two additional defects make the dead end unrecoverable and the symptom invisible:

- **The consumed code is not restored.** The shopper has a valid registered account and a valid code, but the code can never be used again — signing in requires a fresh code, and the shopper does not know they are being bounced.
- **The failure is silent.** When the sign-in call returns an error instead of throwing, the "already signed in, move on" logic runs as if nothing happened, and the page renders with no message and no redirect.

Why development never caught it: the verification helper accepts a fixed master code when no SMS provider is configured, so the second verification **succeeds anyway**. The double-consume only breaks when codes come from a real gateway.

## Clarifications

### Session 2026-10-05

- Q: When a shopper's account has just been created but the signed-in state can't be established, should the system keep that new account or remove it? → A: B — keep the account, send the shopper to sign-in, and tell them the account was created so they can sign in with a fresh code. Additionally: surface a toast notification explaining what happened, because this condition is rare and must not normally occur — a new user who signs up must become signed in immediately.
- Q: How long should a verification code sent by SMS stay valid before it is rejected? → A: 2 minutes. The countdown starts the moment the code is sent, and while the code is being entered the phone number field is disabled so the code cannot be attributed to a different number — the shopper can deliberately release it with an explicit button if they want to change the number.
- Q: How far should this feature go in preventing the same "silent failure" class from recurring elsewhere in sign-in and sign-up? → A: Fix the shared sign-in path too — one session-creation path for both flows, both forms verify a session actually exists before navigating, and the unused duplicate sign-in code is removed. Sign-in and sign-up receive the same treatment so neither half can fail silently.
- Q: What should happen after someone signs in with Google? → A: Send to `/user/profile`, matching the phone sign-up behaviour so every new shopper lands in the same place. Google sign-in is currently blocked in production because the registered redirect URI does not match the callback URI the application actually uses, so fixing that mismatch is in scope.
- Q: With codes expiring after 2 minutes, how should a shopper get a new code? → A: Resend with a wait, then manual — a resend control becomes available once the countdown ends, a short cool-down between codes limits how fast codes can be requested, and each resend replaces the previous code.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Phone sign-up creates a working account (Priority: P1)

A shopper registers a new account with their mobile number. They receive a verification code by SMS, enter it, and press the sign-up button. The account is created, they are signed in, and they land on their profile page where they can complete their details.

**Why this priority**: Account creation by mobile is a primary acquisition path on an Iranian storefront. Today it is completely broken in production with no way for the shopper to recover without support intervention. Nothing else matters until this works.

**Independent Test**: Fully testable on its own — register with a mobile number on a site with real SMS delivery configured, enter the received code, and confirm the shopper reaches `/user/profile` signed in. Delivers a complete, working account-creation journey.

**Acceptance Scenarios**:

1. **Given** a mobile number with no existing account and real SMS delivery configured, **When** the shopper receives and submits the correct code, **Then** the account is created, the shopper is signed in, and they are taken to `/user/profile`.
2. **Given** an account that was just created by mobile sign-up, **When** the shopper later signs in with the same mobile number and a freshly requested code, **Then** they are signed in successfully and taken to their requested destination.
3. **Given** the shopper submitted the correct code, **When** the result is any non-error outcome, **Then** the shopper is always either signed in on the destination page or shown a clear message — never left on the sign-up form with nothing happening.

---

### User Story 2 - Sign-up failures are explained and recoverable (Priority: P2)

When something does go wrong — a wrong code, an expired code, a delivery failure, or an account that already exists — the shopper is told what happened in plain language and told what to do next. They are never left guessing, and never left unable to try again.

**Why this priority**: The defect above is partly a *reporting* defect — the same silent failure would hide any other cause. Repairing the messaging makes the flow trustworthy and makes future faults diagnosable instead of invisible.

**Independent Test**: Testable on its own — submit wrong, expired, and mismatched codes plus a duplicate-account registration, and confirm each produces a specific, actionable message and a viable next step.

**Acceptance Scenarios**:

1. **Given** an incorrect code is submitted, **When** the request completes, **Then** a "code is not valid" message is shown and the shopper can request a new code and try again.
2. **Given** a code older than its validity period is submitted, **When** the request completes, **Then** a "code has expired" message is shown and a new code can be requested.
3. **Given** a mobile number that already has an account, **When** the shopper attempts to sign up, **Then** the shopper is told the account exists and is directed to sign in, without leaving a duplicate record.

---

### User Story 3 - Sign-in behaves consistently with sign-up (Priority: P3)

Signing in by mobile is audited alongside sign-up for the same class of defect, so that both halves of the account journey behave the same way: one code, one verification, one clear outcome.

**Why this priority**: Sign-in currently works in production, so this is hardening rather than a live outage. It matters because the same code path and the same messaging surface are shared, and a fix applied to only one side would leave the other inconsistent.

**Independent Test**: Testable on its own — sign in with a correct, wrong, expired, and unregistered number, and confirm each outcome is reported clearly and the correct destination is reached.

**Acceptance Scenarios**:

1. **Given** a registered mobile number and a correct fresh code, **When** the shopper submits it, **Then** they are signed in and taken to their requested destination.
2. **Given** an unregistered mobile number, **When** the shopper requests a code, **Then** they are told the number is not registered and directed to sign up, without an error.
3. **Given** the same shopper signs in by mobile twice, **When** each sign-in occurs, **Then** each requires its own fresh code and neither consumes the other's.

---

### Edge Cases

- **Code already used**: the shopper submits a code they already submitted once. It is rejected as invalid, and the account that was created by that first submission is unaffected and still sign-in-able with a fresh code.
- **Code expires between account creation and sign-in**: the code is valid when the account is created but expires moments later. The shopper is not left with a stranded account.
- **Countdown reaches zero while the shopper is typing**: the code is rejected with an "expired" message, the phone number field is released for editing, and a new code can be requested.
- **Shopper changes the phone number while a code is outstanding**: the field stays locked until they deliberately release it; releasing it discards the pending code so a code issued to the previous number can never be submitted against a new one.
- **Shopper edits the number field directly by bypassing the disabled state**: the server still rejects the attempt, because the number and the code must match the number the code was actually issued to.
- **Google sign-in is attempted from a `www.` address or by direct server address**: the application sends the redirect URI for the address it believes it is served from. If that does not match a registered redirect URI, the shopper is told plainly that sign-in is unavailable and given a working alternative (mobile code or email and password), instead of landing on a provider error page.
- **Provider returns an error during Google sign-in**: the shopper is returned to the sign-in page with a specific message naming the cause, and is not left on a provider page with no way back.
- **Expired codes are accepted today**: codes carry an expiry timestamp that is written but **never read**, so a code stays valid indefinitely until used. After this feature, a code past its validity period is rejected with a distinct "expired" message.
- **Delivery never arrived**: the shopper requests a code that does not arrive. Requesting again replaces the previous code, and the most recent code is the only one accepted.
- **Rate limiting**: too many code requests or too many failed verification attempts. The shopper is told how long to wait rather than shown a generic failure.
- **Session establishment fails after the account is created**: the account exists and is correct, but the signed-in state cannot be established. This is a rare condition that must not occur in normal operation — a shopper who signs up must become signed in immediately. When it does occur, the created account is **kept** (never deleted or rolled back), and the shopper is shown a toast notification explaining that their account was created but they are not signed in yet, plus a direct path to sign in with a fresh code.
- **Dev/test environments with no SMS provider configured**: the existing fixed master code continues to work, and the code path being fixed behaves identically in both configured and unconfigured environments (this is what let the defect reach production).
- **Banned account**: verification succeeds but the account is banned. Sign-in is refused with a clear message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST verify a submitted one-time code exactly once per sign-up attempt, and MUST NOT require the same code to be presented a second time to establish the session.
- **FR-002**: System MUST establish the signed-in session for a successful mobile sign-up using the credential already proven by the verified code, without a second verification of that code.
- **FR-003**: System MUST NOT silently succeed: every completed sign-up attempt MUST end in exactly one of — the shopper signed in and redirected to the destination, or a specific actionable message shown on the form.
- **FR-004**: System MUST treat a verification pass with no explicit error as failure when no signed-in session exists, and MUST NOT continue as if sign-in succeeded.
- **FR-005**: System MUST keep the shopper's account, unaltered and never deleted or rolled back, when session establishment fails after the account is created, and MUST direct the shopper to a path that signs them in.
- **FR-016**: When an account has been created but the shopper is not signed in, System MUST display a toast notification telling the shopper that their account was created successfully but they are not signed in yet, and MUST offer the sign-in path from that notification. This is a rare fallback that must not occur during normal sign-up.
- **FR-006**: System MUST reject a one-time code more than 2 minutes after it was sent, MUST distinguish that case from an incorrect code in the message shown, and MUST measure the 2-minute period from the moment the code was sent.
- **FR-007**: System MUST accept only the most recently issued code for a mobile number; requesting a new code MUST invalidate the previous one.
- **FR-017**: System MUST display the remaining time as a visible countdown that starts the moment the code is sent and reaches zero at expiry.
- **FR-018**: While a code is being entered, System MUST prevent the phone number from being edited, so a submitted code can never be applied to a number different from the one it was sent to. The shopper MUST be given an explicit control to release the phone number field and change the number if they choose to.
- **FR-019**: Releasing the phone number field to change the number MUST invalidate the pending code for the previous number.
- **FR-020**: System MUST offer a resend control for the verification code that becomes available once the current code has expired, and MUST enforce a cool-down between code requests so codes cannot be requested faster than the cool-down allows.
- **FR-021**: Each resend MUST replace the previous code, so only the most recently issued code can be used, and MUST report the new expiry from the moment the new code was sent.
- **FR-008**: System MUST NOT consume a one-time code before it has been fully validated for the operation being performed.
- **FR-009**: System MUST report the following sign-up and sign-in failures with distinct, plain-language messages: incorrect code, expired code, unregistered number, existing account, delivery failure, rate limit reached, and banned account.
- **FR-010**: System MUST report a new code as invalidating any earlier code for the same number.
- **FR-011**: Sign-in by mobile MUST reject an unregistered number with a "not registered, please sign up" message rather than a generic failure.
- **FR-012**: System MUST NOT allow one sign-in attempt to consume a code issued for a different purpose.
- **FR-013**: Every new user-facing message introduced by this feature MUST exist in both the Persian and English message catalogues.
- **FR-014**: System MUST verify the corrected sign-up journey end-to-end in a browser against a site with real SMS delivery configured, covering: successful registration, wrong code, expired code, and repeat submission of a used code.
- **FR-015**: System MUST leave no partially-created account behind when sign-up fails before the account is created, and MUST leave no account stranded in an unconfirmed state when sign-up fails after it is created.
- **FR-022**: Sign-in and sign-up MUST establish the signed-in session through one shared path, so a single fix applies to both and neither can diverge into a silent failure.
- **FR-023**: Both the sign-in and sign-up forms MUST confirm that a signed-in session actually exists before navigating away, and MUST report failure if it does not.
- **FR-024**: The duplicate, unused sign-in implementation that exists alongside the shared path MUST be removed, so there is only one way an account is signed in.
- **FR-025**: Google sign-in MUST complete successfully on the live site and land the shopper on `/user/profile`, with no provider-side error.
- **FR-026**: The redirect URI the application sends to the sign-in provider MUST exactly match a redirect URI registered for that provider, with matching scheme, host, port, and path. When they differ, the application MUST show an actionable message rather than the provider's raw error page.
- **FR-027**: The address the application believes it is served from MUST be derived from the live site configuration, so a deployment behind the domain, with or without the `www.` prefix, produces the correct redirect URI.

### Key Entities

- **One-time code record**: A short-lived, single-use secret issued to a mobile number; holds the code (stored hashed), the number it belongs to, its purpose, and the moment it stops being valid. Consuming it invalidates it permanently.
- **Shopper account**: The registered identity, identified by either an email address or a mobile number; at least one contact method is always present. An account may be signed out or banned.
- **Sign-in attempt**: One submission of a contact method plus a secret; ends in exactly one outcome — signed in, or a specific reported failure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of first-time mobile registrations on a site with real SMS delivery end with the shopper signed in on their profile page.
- **SC-002**: 100% of mobile sign-up attempts produce a visible outcome — either a redirect to the destination page or a specific message. Zero attempts end with the shopper still on the sign-up form and no feedback.
- **SC-003**: A shopper who registers by mobile can complete the whole journey — request code, enter code, reach the profile page, save their details — in under 2 minutes.
- **SC-004**: Zero accounts are left stranded by a failed sign-up: every account created by a sign-up attempt can subsequently be signed into with a freshly requested code, and no created account is ever deleted or rolled back as a result of a sign-up failure.
- **SC-005**: Every distinct failure mode listed in FR-009 is reachable and produces its own distinct message, verified by test.
- **SC-006**: A code cannot be accepted more than once, and a code more than 2 minutes after it was sent cannot be accepted at all, verified by test.
- **SC-008**: The remaining validity time is visible to the shopper at all times from the moment a code is sent until it is entered or expires, and the phone number cannot be edited while a code is outstanding except through an explicit release control.
- **SC-007**: Sign-up and sign-in by mobile behave identically in an environment with no SMS provider configured and one with a live gateway, so no defect of this class can pass local testing and fail in production.
- **SC-009**: Google sign-in completes without a provider error for a shopper arriving at either the bare domain or the `www.` address, and lands them on `/user/profile`.

## Assumptions

- The existing SMS gateway integration, its credential storage, and its code issuance remain as they are; this feature changes what happens after a code is submitted, not how codes are sent.
- Account creation still verifies the code before creating the account — a wrong code must not leave an unverified account row behind, which would block the shopper from ever registering.
- The fixed master code used in development and CI continues to exist so the journey stays testable without a live gateway; it is not valid in production.
- Rate limiting, guest-to-account cart merging, and banned-user refusal already work in the sign-in flow and are retained.
- Sign-in and sign-up share the same messaging surface, so both are covered by the same fixes.
- The storefront's other account features (password reset, profile contact change, profile editing) are out of scope except where they share the one-time code verification behaviour.
- Success criteria are verified against a site configured with real SMS delivery; environments without a gateway verify the same code path using the master code.

## Out of Scope

- Changing how codes are generated, delivered, or formatted.
- Adding a new account contact method or changing which contact methods are supported.
- Redesigning the sign-in or sign-up screens, their layout, or their copy beyond the messages required to report outcomes.
- Any change to checkout, cart, order, or admin panel behaviour.
