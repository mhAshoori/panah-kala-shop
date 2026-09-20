---
title: Storefront Chat Box UX & Admin Notifications
lang: en
id: 002
---

# Storefront Chat Box UX & Admin Notifications

## Description & Context

The floating store-support chat box (storefront assistant widget, admin panel reuses the same launcher pattern) has layout and interaction problems across screen sizes, and the underlying assistant/chat panel needs faster cross-view updates plus admin-facing activity notifications. This feature fixes positioning, small-screen behavior, keyboard handling, message freshness, and adds logged-in-admin toast notifications with referral links.

Affected components: `components/shared/chat-widget.tsx`, `components/shared/assistant/chat-widget.tsx`, `components/shared/assistant/admin-chat.tsx`.

## Problem Statement

- On medium/large screens the chat panel's right border sits flush against the browser viewport's right edge (no inset/margin) — it looks glued to the screen edge and collides with page scrollbars.
- On small screens the panel should anchor to the TOP of the viewport, span nearly full width, and behave like the existing mobile menu sheet: a dimmed backdrop over the rest of the page, tapping the backdrop closes the panel.
- On mobile, opening the chat via the launcher button immediately focuses the input, which pops the phone keyboard before the user intends to type. Keyboard should only appear when the user taps the input field.
- Messages sent by a shopper do not show up promptly for the admin (and vice versa) without a manual page reload — the message list needs revalidation/refresh so both sides see new messages quickly.
- A logged-in admin should receive toast notifications for storefront activities (e.g., "new order placed", "a user asked a question — respond"), each with a link to the relevant admin page.

## User Stories

1. **P1 — As a shopper on desktop/tablet**, the chat panel is inset from the viewport edge so it never touches the right border of the browser window.
2. **P1 — As a shopper on a small screen**, the chat panel appears anchored to the top-center of the viewport with a dimmed backdrop; tapping the backdrop closes it.
3. **P1 — As a shopper on mobile**, tapping the launcher opens the chat WITHOUT popping the keyboard; the keyboard appears only when the user taps the message input.
4. **P2 — As a shopper or admin in a chat**, new messages from the other side appear quickly without a manual reload.
5. **P2 — As a logged-in admin**, I get a toast notification for store events (new order, new question/message) with a link that takes me to the relevant admin page.

## Functional Requirements

| ID | Requirement |
|----|-------------|
| FR-1 | On viewports ≥ 640 px, the open chat panel must have a visible inset (margin) separating its edge from the browser viewport's right edge; it must never be flush. |
| FR-2 | On small viewports (< 640 px, phones), the open chat panel anchors to the top-center of the viewport. Positioning must use logical properties consistent with the RTL/fa default. |
| FR-3 | On viewports < 640 px, a dimmed backdrop covers the page behind the open chat panel; tapping the backdrop closes the panel (same interaction as the existing mobile menu sheet). |
| FR-4 | Opening the chat via the launcher button must not auto-focus the message input on touch/mobile devices, so the on-screen keyboard does not pop up automatically. Focusing the input by direct tap must still work normally and trigger the keyboard. |
| FR-5 | The chat message list (both storefront and admin variants) auto-refreshes in the background (~5–10 s interval) while the panel is open, so a message sent by one side becomes visible to the other within ~10 seconds without tabs focus, reopen, or page reload. |
| FR-6 | When a signed-in admin user is browsing, major store events produce a toast notification containing a short human-readable message and a referral link. Order events (placed, payment success/failure) link to the orders list page; question/message events link to the answer source; user-signup and low-stock events link to the users list and product stock page respectively. Events are detected by a periodic background poll (same cadence family as FR-5 refresh) while the admin browses; events already shown in the current session are not re-shown. |
| FR-7 | Notifications must not fire for non-admin users, and must not duplicate an event already shown in the current session. |
| FR-8 | All new user-facing strings are added to both `messages/fa.json` and `messages/en.json` (key parity maintained). |
| FR-9 | Existing page layout, z-index layering (chat stays above page content), portal structure, and other features must remain unaffected — no regressions outside the chat/notification scope. |

## Acceptance Scenarios

- Given a viewport ≥ 640 px and the chat open, When the page is viewed, Then the panel's edge is clearly inset from the viewport edge.
- Given a viewport < 640 px and the chat open, When the page is viewed, Then the panel is anchored top-center and a backdrop dims the page; tapping the backdrop closes the panel.
- Given a mobile device and the chat closed, When the launcher is tapped, Then the panel opens and the on-screen keyboard does not appear; When the input is then tapped, Then the keyboard appears.
- Given a shopper sends a message, When the admin's panel/page is open, Then the message appears within ~10 seconds without manual reload (and vice versa).
- Given a signed-in admin, When a new order is placed (or a payment result, signup, question, or low-stock event occurs), Then a toast appears with text and a link to its relevant admin page (order events → orders list). Given a non-admin, When the same event occurs, Then no toast appears.

## Edge Cases

- Backdrop + launcher overlap: launcher must stay reachable or the backdrop close must not trap the user.
- Refresh/poll must not duplicate messages or lose scroll position excessively.
- Toast events arriving while admin is mid-navigation must not crash or stack unboundedly (cap concurrent toasts).
- RTL and LTR layouts both render correctly (logical properties, no hardcoded left/right).

## Constraints & Assumptions

- No payment/auth/data-model changes required; notification plumbing may reuse existing server actions/paths rather than new DB tables.
- Mobile keyboard behavior relies on standard browser focus semantics; iOS/Android quirk verification is part of acceptance testing.
- Live update mechanism should be the lightest option that meets the few-seconds freshness bar (polling/refetch acceptable).

## Clarifications

### Session 2026-09-20
- Q: Scope beyond the original layout fix? → A: User extended scope in the request to include: backdrop/sheet-like mobile behavior, keyboard suppression on open, message revalidation between storefront and admin, and admin toast notifications with links.
- Q: How quickly must shopper messages appear admin-side without reload? → A: A few seconds via background auto-refresh while panel is open (~5–10 s).
- Q: Which store activities trigger admin toasts? → A: All major events: orders, payments, new user signups, low stock (plus customer questions).
- Q: How are toast events delivered to a browsing admin? → A: Periodic background poll while admin browses.
- Q: What viewport width defines "small screen" behavior? → A: Below 640 px.
- Q: Where should a new-order toast's link point when admin wants to look right away? → A: The orders list page.

## Success Criteria

- All three P1 layout/keyboard scenarios pass on real mobile + desktop preview breakpoints.
- Cross-side message visibility achieved without manual reload.
- Admin receives link-bearing toasts for order/question events; non-admins receive none.
- Full validation gate passes: `tsc --noEmit`, `lint`, `test`, `build`.
