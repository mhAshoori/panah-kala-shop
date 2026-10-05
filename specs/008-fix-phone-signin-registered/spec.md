# Feature Specification: Fix Phone Sign-In for Registered Numbers

**Feature Branch**: `008-fix-phone-signin-registered`

**Created**: 2026-10-05

**Status**: Draft

**Input**: User description: "one bug found in 007's process, flow that found bug: a new user signs up, everything is ok and he gets redirected to the user/profile. after log out, now the user wants to sign in with the phone number he signed up earlier, BUT HE CAN'T. after entering his phone, he sees warning: 'این شماره موبایل قبلاً ثبت شده است — وارد شوید' so it seems the sign in process is ruined now. we have to fix it."

## Problem Statement

A shopper registers a new account with their mobile number, succeeds, and reaches their profile page. Later they sign out and return to sign in **using that same mobile number**. They cannot.

As soon as they enter their number and request a code, the page refuses: *"This mobile number is already registered — please sign in."* They are on the sign-in page, trying to sign in, being told to sign in. There is no way forward: the message is a dead end that contradicts where the shopper already is.

The result is that **phone sign-in is unusable for every existing account**. Only accounts that were never registered this way would pass. In practice that means the phone sign-in feature is broken entirely, and every new account created through sign-up is permanently unable to return to the store by the method they registered with.

## Root Cause (confirmed by code inspection)

Both auth forms share one phone-and-code component. That component asks a callback whether the number is already registered, and **if the number is registered, it refuses to send a code** — a rule that makes sense only when registering an account, and is exactly backwards when signing in.

On the sign-in page I passed a check that does two things:

1. If the number is **registered**, the component refuses to send the code and shows *"already registered — please sign in."*
2. If the number is **not** registered, it shows *"this number is not registered — please sign up."*

Together those two branches mean the sign-in page rejects **both** kinds of number. Registered numbers get the "sign in" message on the sign-in page; unregistered numbers get the "sign up" message and no code. Neither can proceed. The sign-in-by-phone flow has no working path at all.

The correct behaviour is the inverse, and simple: **on the sign-in page, a registered number is the expected case and MUST proceed to receive a code.** Only an unregistered number is a problem there, and the response is to point the shopper at sign-up.

This was introduced while building the previous feature, when the shared component was given a single "is this number taken?" hook for both forms. The hook was wired to reject-on-registered for both, and the sign-in caller added a second rejection on top for the unregistered case. Neither branch was tested in a browser.

## Clarifications

### Session 2026-10-05

- Q: Should a code be sent when a shopper signs in with a number that has no account? → A: No — show a message and point them to sign up. Saves SMS credit and gives an immediate answer instead of making them wait for a code that cannot work.
- Q: The sign-in page tells a visitor whether a phone number is registered, so anyone can discover which numbers hold accounts at this shop. Is that acceptable? → A: Yes, reveal it. The user prefers the fast path for real shoppers over withholding the fact. This is a deliberate trade of enumeration resistance for faster feedback and lower SMS spend, and is accepted for this store. The existing throttle on that lookup stays, so it cannot be used to enumerate numbers at scale.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A registered shopper signs in by mobile (Priority: P1)

A shopper who registered by mobile number returns to the store, opens sign-in, chooses the phone option, and enters their number. A code is sent. They enter it and are signed in, reaching the page they originally asked for.

**Why this priority**: This is the entire point of signing in. Every account created by phone sign-up is currently locked out of returning by phone — the shop loses them permanently. Nothing else matters until this works.

**Independent Test**: Create an account by phone sign-up, sign out, then sign back in with that same number and a freshly received code. Confirm the code is sent, and that the shopper is signed in on completing it.

**Acceptance Scenarios**:

1. **Given** a number that already has an account, **When** the shopper opens phone sign-in and requests a code, **Then** a code is sent and no warning is shown.
2. **Given** a number that already has an account, **When** the shopper enters the correct code, **Then** they are signed in and reach their intended destination.
3. **Given** a number that already has an account, **When** the request completes, **Then** no message is shown telling the shopper the number is already registered — that message is reserved for the sign-up page.

---

### User Story 2 - Sign-up still refuses numbers that are taken (Priority: P2)

The sign-up page keeps the protection it has: a number that already has an account cannot be used to register a second one, and the shopper is pointed to sign in instead.

**Why this priority**: The two pages share one component, so any fix must not weaken sign-up. This is the guard that stops the fix for Story 1 from opening a duplicate-account hole.

**Independent Test**: Attempt to register with a number that already has an account and confirm the code is not sent and the shopper is directed to sign in.

**Acceptance Scenarios**:

1. **Given** a number that already has an account, **When** the shopper tries to register with it, **Then** no code is sent and the message directs them to sign in.
2. **Given** a number with no account, **When** the shopper tries to register with it, **Then** a code is sent and registration can proceed.

---

### User Story 3 - A number with no account is directed to sign-up (Priority: P3)

A shopper who tries to sign in with a number that has never registered is told plainly that the number is not registered, and is offered the way to register — without a code being sent to a number that cannot sign in.

**Why this priority**: Without this the sign-in page would send codes to numbers that can never authenticate, wasting SMS credit and leaving the shopper waiting for a code that leads nowhere.

**Independent Test**: Request a code on sign-in for a number with no account and confirm no code is sent and the shopper is directed to register.

**Acceptance Scenarios**:

1. **Given** a number with no account, **When** the shopper requests a code on the sign-in page, **Then** no code is sent and they are told the number is not registered and directed to sign up.
2. **Given** that message, **When** the shopper follows it, **Then** they arrive at the sign-up page with the number already filled in.

---

### Edge Cases

- **Shopper registered by email, then tries to sign in by phone**: the number is not on their account, so sign-in refuses and points to sign-up. Correct — that number genuinely has no account.
- **Number belongs to a banned account**: the code may be sent, but sign-in is refused on verification. The shopper must not be told the number is unregistered, because it is registered.
- **Both forms on the same page**: the sign-in and sign-up pages each mount the shared component independently; one page's rules must never leak into the other.
- **Number field locked with a code outstanding, then the shopper switches intent**: releasing the number and moving to the other form must clear any pending state, so a stale "already registered" verdict is never reused.
- **Check fails or the lookup is slow**: the shopper must get a clear message and the ability to retry, never a silent hang.
- **The same number is entered on both pages in the same session**: each page decides independently from a fresh lookup; no cached verdict from one form may suppress a code on the other.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On the sign-in page, a mobile number that already has an account MUST proceed to receive a verification code. No warning may be shown.
- **FR-002**: On the sign-in page, the warning "this number is already registered — please sign in" MUST NOT appear. That message belongs only to registration.
- **FR-003**: The decision to send a code MUST be driven by which page the shopper is on, so the same number behaves correctly on each page without either page's rules affecting the other.
- **FR-004**: On the sign-in page, a mobile number with no account MUST NOT receive a code, and the shopper MUST be told the number is not registered and directed to sign up.
- **FR-005**: When the sign-in page directs a shopper to sign up because the number is unregistered, the sign-up page MUST arrive with that number already filled in.
- **FR-006**: On the sign-up page, a number that already has an account MUST NOT receive a code, and the shopper MUST be directed to sign in.
- **FR-007**: The rule that decides whether a code is sent MUST be stated once and shared by both pages, so the two cannot drift apart again. Each page supplies only its own intent.
- **FR-008**: A banned account MUST be treated as registered for the purpose of deciding whether to send a code, and MUST be refused at sign-in with a specific message rather than being reported as unregistered.
- **FR-015**: System MUST reveal on the sign-in page whether a number holds an account, accepting that this permits enumerating registered numbers. The existing throttle on that lookup MUST be retained so the disclosure cannot be harvested at scale, and the disclosure MUST NOT be widened to any other surface.
- **FR-009**: If the lookup that decides whether a code can be sent fails or times out, the shopper MUST be given a clear message and the ability to retry, and MUST NOT be left waiting.
- **FR-010**: Releasing the number field, or leaving and returning to the page, MUST clear any pending decision, so no stale verdict is reused.
- **FR-011**: Every user-facing message introduced or moved by this feature MUST exist in both the Persian and English message catalogues.
- **FR-012**: System MUST verify in a browser, against a site with real SMS delivery, that a number can register, sign out, and then sign back in — the round trip that currently fails.
- **FR-013**: System MUST verify in a browser that sign-up still refuses an already-registered number, so the fix does not weaken registration.
- **FR-014**: System MUST leave no account created or altered by a refused code request; refusing to send a code MUST NOT change any account.

### Key Entities

- **Shopper account**: Identified by mobile number and/or email. A number either has an account or does not; at most one account per number.
- **Verification code request**: A decision to send a code to a number, made in the context of a specific page — registering or signing in. The same number yields opposite decisions depending on that context.
- **Intended destination**: The page the shopper meant to reach, carried from where they started. Signing in must honour it rather than always landing on one fixed page.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of shoppers who registered by mobile can sign back in using that same number, verified in a browser against a real SMS gateway.
- **SC-002**: Zero sign-in attempts by a registered number are refused or blocked by a message about registration.
- **SC-003**: No verification code is sent to a number that cannot use it — an unregistered number on sign-in, or a registered number on sign-up.
- **SC-004**: The round trip — register, sign out, sign in with the same number — completes successfully end to end.
- **SC-005**: Sign-up continues to refuse an already-registered number in every case it did before this change.
- **SC-006**: A shopper is never shown a message that contradicts the page they are on — no instruction to sign in while already on the sign-in page, and no instruction to sign up for a number that has an account.
- **SC-007**: Both messages are reachable and distinct, and neither is reachable from the wrong page.

## Assumptions

- The verification code sending, expiry, resend and session creation introduced by the previous feature are unchanged and already working; this feature changes only the decision of whether to send a code, and where the sign-up referral leads.
- The account created by sign-up is correct and usable — the shopper reaches their profile page successfully. The failure is confined to returning afterwards.
- The sign-up page's existing protection against duplicate numbers is intentional and must be preserved.
- The fix belongs in the shared phone-and-code component and its two callers, not in a new separate form.
- Banned accounts remain sign-in-blocked; this feature must not create a route around that.
- Revealing whether a number is registered on the sign-in page is accepted for this store (see Clarifications). The throttle on that lookup is the only protection against bulk enumeration and is not in scope to strengthen.
- Success is verified against a site with real SMS delivery, since a locally-configured master code bypasses the sending path and cannot exercise this decision.

## Out of Scope

- Changing verification code generation, delivery, expiry, or resend timing.
- Changing how accounts are created, what data they hold, or the sign-up form's fields.
- Adding or changing any other sign-in method (email and password, Google).
- Changing profile, checkout, cart, order, or admin panel behaviour.
- Redesigning the sign-in or sign-up pages beyond the messages this feature requires.
