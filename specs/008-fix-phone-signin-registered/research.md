# Phase 0 Research: Fix Phone Sign-In for Registered Numbers

Five technical decisions. Each states what was chosen, why, and what else was evaluated.

---

## R1. One pure decision function, replacing the boolean callback

**Decision**: Create `lib/phone-otp-intent.ts` exporting a pure function:

```ts
type OtpIntent = 'sign-in' | 'register';
type OtpDecision = { canSend: boolean; messageKey: string | null; };
function decideOtpSend(intent: OtpIntent, registered: boolean): OtpDecision
```

`PhoneOtpSection` takes an `intent: OtpIntent` prop and holds **no decision logic**. Both callers pass one value and stop making their own judgments.

**Rationale**: The bug is not a wrong condition — it is that the decision was spread across two files, each adding its own rejection. The component refused on `registered === true`; the sign-in caller *also* refused on `registered === false`. Neither file was wrong on its own; together they refuse everything.

A boolean callback (`registerCheck`) carries the answer but not the question. The component cannot know that "registered" means the wrong thing on the sign-in page. Passing the **intent** — what the shopper is trying to do — lets one function answer for both pages, and makes it impossible for a caller to add a second, contradictory rule.

Making it pure and standalone is what makes the truth table testable. This is the specific reason 007 shipped this bug past a fully green gate: the logic lived inline in a `'use client'` component behind a callback, so the only way to check it was a browser, and the browser check that ran tested sign-up, not sign-in.

**Alternatives considered**:

- *Keep `registerCheck` and fix the two conditions* — rejected. Smallest diff, and it fixes today's symptom. But it leaves the answer split across two files with no single place asserting the truth table, which is exactly the shape that produced this bug. The third time one of these is added is when it breaks again.
- *Pass `canSend: boolean` precomputed by each caller* — rejected. Same split-decision problem, one layer up: the component would trust a boolean it cannot check.
- *Move the whole form into one component per mode* — rejected. Duplicates the countdown, lock and resend logic that 007 deliberately unified.

---

## R2. Tri-state lookup instead of a boolean

**Decision**: Replace `checkPhoneRegistered`'s `{ registered: boolean }` with a three-way outcome: the number has an account, has no account, or is banned — plus a distinct failure state when the lookup cannot be trusted.

**Rationale**: `checkPhoneRegistered` currently collapses three different situations into `registered: false`:

1. genuinely unregistered,
2. **banned account** — the shopper exists and must be refused at sign-in, not told to register,
3. **throttle tripped** — the call returns `{ registered: false }` without checking anything, so a rate-limited lookup is indistinguishable from "no account".

Case 3 is the sharpest: after 10 lookups the page tells every shopper their number is unregistered and points them to sign up, which is both wrong and a way to push someone into a duplicate-account error. FR-008 and FR-009 cannot be satisfied with a boolean that cannot express the difference.

**Alternatives considered**:

- *Add a separate banned-account check* — rejected. A second server round-trip per code request for a case that is already visible in the same row the first query reads.
- *Return `registered: true` when throttled, to avoid the false "unregistered"* — rejected. Safer in the leakage direction, but it would then send a code to a number that may have no account, producing exactly the dead end the user chose to avoid in Clarification 1.

---

## R3. Failure toasts alongside inline errors

**Decision**: Where an auth attempt fails with something the shopper should notice — a wrong or expired code, a failed code lookup, a rate limit — show a `sonner` toast in addition to the inline error.

**Rationale**: The user asked for success/failure feedback via toast. Inline errors already exist and are not wrong, but they are tied to the form: the moment the shopper navigates away, or the toast-less inline message is missed while they are looking at the code they just typed, the feedback is gone. A toast floats above both and survives navigation.

Failures only. Inline errors stay as well — removing them would be a regression for anyone who missed the toast.

**Alternatives considered**:

- *Toast instead of inline error* — rejected. Replaces a working, visible, form-associated message with a transient one. Accessibility basics are not to be simplified away.
- *Toast for every failure including validation* — rejected. Field-level validation (e.g. "number too short") belongs next to the field. A toast for every keystroke-triggered validation is noise.

---

## R4. Success toast on sign-in only, raised after navigation settles

**Decision**: Sign-in raises a success toast once the session is verified and navigation has completed. Sign-up does **not** raise a success toast.

**Rationale**: The two forms navigate differently, and this asymmetry is forced by the code, not a preference:

- Sign-in navigates client-side (`router.push(callbackUrl)` at lines 96 and 144) after `verifySession()` confirms a real session. A toast raised just before `router.push` is unmounted with the form and never seen — the common failure mode. It must be raised after the navigation settles, on the destination page.
- Sign-up is redirected **on the server**: `signUpUser` calls `redirect('/user/profile')`, which never returns to the client. There is no client code that survives to raise a toast. Adding one would mean moving the redirect to the client — a real behavioural change to the flow 007 just fixed, for a cosmetic gain.

Sign-up's success is already visible: the shopper lands on their profile page, signed in. That is the strongest possible confirmation, and a toast that says "signed up successfully" on top of it is redundant.

**Alternatives considered**:

- *Move the sign-up redirect to the client so it can toast* — rejected. It would trade a server-guaranteed navigation for a client-side one, weakening exactly the guarantee 007's FR-023 established, to add a redundant message.
- *Toast before navigating on sign-in* — rejected. It would not be seen. This is the bug R4 exists to avoid.
- *No success toast anywhere* — rejected. The user asked for it, and on sign-in it is genuinely useful when the destination is not obviously an authenticated page.

---

## R5. No stale-verdict caching

**Decision**: The intent decision is recomputed on every code request. Nothing is memoised across requests, and releasing the phone field clears all pending state.

**Rationale**: FR-010 requires that a stale verdict is never reused. A shopper who enters a number, releases the field, types a different number, and requests a code must get a decision for the **new** number. Caching the first verdict would apply one number's answer to another — the same class of confusion that produced the original dead end, where the answer did not match the situation.

Recomputing is free: the decision itself is local, and the lookup behind it is already throttled.

**Alternatives considered**:

- *Cache the lookup result per number for the page's lifetime* — rejected. Saves one lookup on resend, at the cost of the class of bug this feature exists to eliminate. Not worth it for a resend that is already rate-limited.
