# Feature Specification: Guard the development one-time-code bypass

**Feature Branch**: `009-guard-dev-otp-bypass`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "in recent messages, the agent 'Product Manager' has found some reviewing stuff in the codebase. check it out and make some reconsiderations if needed."

## Problem

The store keeps one-time sign-in codes testable without a message-delivery service by
accepting a fixed code when no service is configured. That convenience is currently
unconditional, so it also applies to a deployed store.

The consequence is that anyone who knows the fixed code can sign in as any account —
including an administrator — without ever proving they control that phone number. The
code is a constant in the source, and the source is in a public repository.

A second, smaller lie travels with it: when no service is configured, the store reports
that a message was sent when nothing was sent. A shopper waits for a code that will never
arrive, and is given no reason.

Both behaviours exist for local development and automated checks. Neither is acceptable
in a store that real people shop in.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A deployed store never accepts a code it did not send (Priority: P1)

A store owner is about to open the store to real shoppers. They need certainty that
knowing a fixed, publicly documented code cannot be used to sign in as any customer or
administrator.

**Why this priority**: Without this, every account in the store is open to anyone who
guesses. No other feature matters until this is closed.

**Independent Test**: Deploy the store without configuring a message service, then
attempt to sign in with the fixed code. Sign-in must fail. Repeat with a service
configured and a code that was never sent — sign-in must also fail.

**Acceptance Scenarios**:

1. **Given** a deployed store with no message-delivery service configured, **When** a
   person signs in using the fixed development code, **Then** access is refused and no
   session is created.
2. **Given** a deployed store with a message service configured, **When** a person
   enters a code that was not sent to that phone number, **Then** access is refused.
3. **Given** a local or automated-check environment, **When** the fixed code is entered,
   **Then** the flow proceeds normally without a message service, so development and
   automated checks keep working.

---

### User Story 2 - A shopper is told the truth when a code cannot be sent (Priority: P2)

A shopper requests a sign-in code and waits for it. Either a real message arrives, or the
shopper is told plainly that none was sent and is offered another attempt.

**Why this priority**: A shopper told to wait for a message that will never arrive has no
way to recover and no way to know what went wrong. This is the difference between a
recoverable dead end and a silent one.

**Independent Test**: Deploy the store without a message service, request a code, and
confirm the store reports failure and offers a retry — rather than reporting success.

**Acceptance Scenarios**:

1. **Given** a store that cannot deliver a message, **When** a shopper requests a code,
   **Then** they are told it could not be sent and offered a way to try again.
2. **Given** a store that cannot deliver a message, **When** the request is recorded,
   **Then** it is never recorded as a successful send.

---

### Edge Cases

- A shopper holds a genuine, sent code that expires before they type it — refused as
  expired, distinct from refused as unknown.
- A shopper enters the fixed code on a deployed store that *does* have a service
  configured — refused, because nothing was sent for that code.
- The store is deployed but the environment is misreported as non-production — this must
  fail closed. A guessed code is refused.
- A genuine code happens to equal the fixed development code — it must still be
  accepted, because it was actually sent.
- A code lookup fails because the store cannot reach its database — refused, never
  treated as a match.
- Repeated failed attempts are still refused at the limit, and the limit itself does not
  depend on the fixed code being available.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: A deployed store MUST NOT accept any sign-in code that was not sent to the
  phone number being signed in.
- **FR-002**: The fixed development code MUST be accepted only in an environment that the
  store has positively identified as non-production. Absent that identification, it MUST
  be refused.
- **FR-003**: When no message-delivery service is configured, sign-in by one-time code
  MUST fail. It MUST NOT fall back to any fixed or guessable value.
- **FR-004**: The store MUST report a message as sent only when a message was actually
  sent.
- **FR-005**: When a message cannot be sent, the shopper MUST be told so and MUST be
  offered a way to try again.
- **FR-006**: A failed code lookup — a lookup that errors, times out, or cannot be
  completed — MUST be treated as a refusal, never as a match.
- **FR-007**: The store MUST NOT derive whether it is a production deployment from any
  value a shopper can influence.
- **FR-008**: Accounts that exist today MUST continue to work exactly as they do. This
  change affects only how codes are judged, never which accounts are recognised.

### Key Entities

- **One-time code**: A short numeric credential delivered to a phone number to prove
  control of it. Single-use and time-limited. May or may not have actually been sent.
- **Code verification request**: A shopper's attempt to sign in with a code. Succeeds only
  against a code genuinely sent to that number.
- **Deployment environment**: Whether the store is running for real shoppers or for
  development and automated checks. Determined by the store's own configuration.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a deployed store with no message service configured, zero sign-in
  attempts succeed using the fixed development code.
- **SC-002**: No account in a deployed store can be accessed without a code that was
  actually delivered to that account's own phone number.
- **SC-003**: Every refused sign-in by code names the actual reason — wrong or expired
  code, code not delivered, no such account, or account suspended — rather than a single
  generic message.
- **SC-004**: No shopper is ever told a code was sent when no code was sent.
- **SC-005**: A shopper who cannot receive a code sees a clear reason and a way to retry
  on their first attempt, without contacting support.
- **SC-006**: Local development and automated checks continue to exercise the complete
  sign-in flow with no message service configured.

## Assumptions

- The store already has a reliable signal for whether it is deployed for real shoppers,
  and that signal is set by whoever deploys it, not by anything a shopper controls.
- Where no such signal is present, the store fails closed.
- The fixed development code stays in use for local development and automated checks. It
  is not being removed; it is being made unable to apply to a deployed store.
- Accounts, sessions, order history, and every other existing capability are untouched.
- Choosing *how* the store identifies its own environment is an implementation decision,
  not part of this specification. The behaviour above is what is fixed.

## Out of Scope

- Replacing the mock code with a real message provider. This feature assumes no provider is
  configured and makes that safe; wiring a provider is separate work.
- Changing how many codes a shopper may try, or how long a code stays valid.
- Any change to email or social sign-in.
- Removing sign-in by one-time code from the product.