# Research: Storefront Chat Box UX & Admin Notifications

Feature: `002-chatbox-ux` · Date: 2026-09-20

## R1. Panel positioning fix (≥ 640 px inset from viewport edge)

**Decision**: Tighten the sm+ classes on the panel container to add inset from the viewport end edge instead of relying on `sm:start-5`/`inset-x-4` alone — current root cause is `inset-x-4 bottom-4` fallback combined with `sm:left-auto sm:right-auto` resets plus `sm:start-5` which in LTR collapses to the physical left and leaves the panel flush against the right edge as seen in the screenshot. Use explicit logical inset on both sides (`sm:inset-x-5 sm:bottom-5` with the existing `sm:w-[380px]`) so start/end offsets survive RTL/LTR without physical resets.

**Rationale**: One class change per panel fixes both locales; matches plan's "logical properties only" constraint.
**Alternatives**: portal-based positioning (rejected — overkill); recalculated JS positions (rejected — CSS covers it).

## R2. Small-screen top-center + backdrop (mobile sheet pattern)

**Decision**: Reuse the existing mobile-menu-sheet interaction pattern (dimmed fixed backdrop, top-anchored panel, backdrop tap closes). Implement inline in both chat components (no shadcn Sheet needed since the panel is already a fixed custom element): `fixed inset-0 bg-black/50` backdrop div (z-40) + panel changes from `bottom-4` to `top-4 start-1/2 -translate-x-1/2` on `max-sm`, or simpler: keep `inset-x-4` but anchor `top-4 bottom-auto`, plus `mx-auto max-w-[380px]`. Backdrop click → `setOpen(false)`; panel sits above backdrop (higher z).

**Rationale**: matches the spec's stated UX ("behave like mobile user menu"); close-on-backdrop already familiar to users.
**Alternatives**: wrapping in shadcn Sheet (rejected — restructure for no functional gain).

## R3. Keyboard suppression on open

**Decision**: Remove/gate the `inputRef.current?.focus()` effect that runs on `open` — do not autofocus on touch devices. Programmatic `element.focus()` inside a click handler pops the mobile keyboard; deferring via requestAnimationFrame/timeout does too. Simplest correct behavior: on open, focus only for non-touch (`!('ontouchstart' in window)` pointer check is heuristic) OR don't autofocus at all (keyboard appears only on explicit input tap, which is what the user asked for). Choose: **no autofocus** — matches spec FR-4 exactly and deletes code (the effect) rather than adding it.

**Rationale**: user explicitly asked "keyboard pops up right after open — prevent it; when user taps input, keyboard shows". Deleting autofocus achieves both with zero added logic.
**Alternatives**: `inputMode`/readonly-then-focus tricks (rejected — fragile across iOS versions).

## R4. Cross-side message freshness

**Decision**: Storefront widget already polls `fetchMySupportThread` at 10 s while open (`chat-widget.tsx:95`). Add the same 10 s start-when-open poll to the admin support inbox (`admin-support-client.tsx`), refreshing the full threads list (cheap read-only server action, already authz'd). No SSE/websocket needed at ~10 s freshness bar.

**Rationale**: clones the existing proven pattern (constitution VII); admin inbox is currently static server-rendered.
**Alternatives**: SSE channel or router.refresh() (rejected — heavier or full-page ripples).

## R5. Admin activity toasts with links

**Decision**: New `admin-notifications.tsx` client component mounted once in `app/admin/layout.tsx` (admin-only surface, so logged-in admin is guaranteed by layout). It polls a new read-only server action (e.g. `fetchAdminActivitySince(timestamp)`) gated by `requireAdmin()` returning counts/new rows since last poll for: new orders, payment success/failures, signups, unread support messages (user questions), low-stock items. Emit sonner toasts, each with a link (`<a>` inside toast description using `next/link`) to `/admin/orders`, `/admin/orders?payment=...`, `/admin/users`, `/admin/support`, `/admin/products`. Track last-seen timestamp + shown IDs in component state (session-scope, FR-7). Cadence 30 s. Debounce/cap: max ~4 toasts per poll tick, aggregate the rest ("N more orders placed").

**Rationale**: sonner already in stack; poller pattern identical to R4; no push infra needed at this freshness bar.
**Alternatives**: SSE/broadcastChannel (rejected — YAGNI); per-page embedding (rejected — layout mount covers all admin pages).

## R6. i18n keys

**Decision**: New keys under a `notifications` (and reuse existing `assistant`) namespace in both `messages/fa.json` and `messages/en.json`. Persian authored first (fa-first store), English mirrored; parity test guards.

**Rationale**: constitution IV (non-negotiable); parity test enforced.
**Alternatives**: none — fixed convention.

## R7. Accessibility & edge cases

- Backdrop must not trap focus: panel close button reachable; Esc closes panel as a bonus (already wired? verify in tasks — cheap addition via keydown listener).
- Poll timers must clean up on unmount/panel close (existing pattern stays).
- Toast cap + aggregation to avoid stacking.
- Launcher must sit above backdrop or be hidden while open (choose: backdrop covers launcher too; reopen via panel's own close + fresh launch — verify in tasks).
