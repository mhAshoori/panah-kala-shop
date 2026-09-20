---
description: "Task list for 002-chatbox-ux — chat box UX fixes + admin notifications"
---

# Tasks: Storefront Chat Box UX & Admin Notifications

**Input**: Design documents `specs/002-chatbox-ux/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, quickstart.md ✓
**Tests**: Per user request — small Jest tests for new pure logic, placed at the END (final phase).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no deps)
- **[Story]**: user story from spec.md (US1 desktop inset, US2 mobile top+backdrop, US3 keyboard, US4 freshness, US5 admin toasts)

## Path Conventions

Single Next.js codebase — paths from plan.md Source Code tree.

---

## Phase 1: Setup

- [x] T001 Add new i18n keys (notifications namespace: orderPlaced, paymentReceived, paymentFailed, userSignedUp, questionAsked, lowStock, moreEvents) to `messages/fa.json` and `messages/en.json` — both files, identical keys (parity test)

---

## Phase 2: Foundational

- [x] T002 Create read-only server action `fetchAdminActivitySince(sinceIso)` in `lib/actions/notify.actions.ts` — `requireAdmin()` gate, returns new orders / payment events / signups / unread support msgs / low stock, each with id, createdAt, title fields; no DB writes
- [x] T003 [P] Add Esc-closes-panel keydown handling shared pattern ready for both chat panels (helper or inline hooks in `components/shared/assistant/chat-widget.tsx` and `admin-chat.tsx`)

---

## Phase 3: [US1] Desktop inset positioning (P1)

**Goal**: Panel edge visibly inset from viewport on ≥640 px.
**Independent Test**: Open chat at ≥640px, see gap between panel and browser edge.

- [x] T004 [US1] Fix panel positioning in `components/shared/assistant/chat-widget.tsx` — replace `inset-x-4 bottom-4 … sm:left-auto sm:right-auto sm:bottom-5 sm:start-5` with `sm:inset-x-5 sm:bottom-5` (logical both-sides inset, keep `sm:w-[380px]`); keep launcher untouched
- [x] T005 [US1] Apply same positioning fix to `components/shared/assistant/admin-chat.tsx` panel classes

**Checkpoint**: Desktop inset verified both panels, RTL + LTR.

---

## Phase 4: [US2] Mobile top-center + backdrop (P1)

**Goal**: Panel top-anchored on <640px with dimmed backdrop; backdrop click closes.
**Independent Test**: 375px viewport: panel top-center, dimmed page, tap backdrop → closes.

- [x] T006 [US2] In `chat-widget.tsx` mobile classes: anchor panel to top (`top-4 bottom-auto` range → `fixed top-4 start-1/2 -translate-x-1/2` on `max-sm`, keep `inset-x-4 max-w` widths) and keep RTL-safe
- [x] T007 [US2] Add backdrop div (`fixed inset-0 bg-black/50 z-40`) rendered only when panel open on small screens, panel z-50 above it, `onClick` backdrop → `setOpen(false)` in `chat-widget.tsx`
- [x] T008 [P] [US2] Apply same mobile top-anchor + backdrop to `components/shared/assistant/admin-chat.tsx`
- [x] T009 [US2] Verify launcher stays reachable when panel closed after backdrop-close (no trapped state)

**Checkpoint**: Mobile sheet-like UX matches mobile-menu-sheet pattern.

---

## Phase 5: [US3] Keyboard suppression (P1)

**Goal**: Mobile keyboard doesn't pop on open; appears only on input tap.
**Independent Test**: Real phone: open chat → no keyboard; tap input → keyboard.

- [x] T010 [US3] Delete the autofocus-on-open effect (`useEffect` calling `inputRef.current?.focus()` on `open`) in `components/shared/assistant/chat-widget.tsx`
- [x] T011 [P] [US3] Delete same autofocus effect in `components/shared/assistant/admin-chat.tsx`

**Checkpoint**: No virtual keyboard on open; normal focus on input tap.

---

## Phase 6: [US4] Cross-side message freshness (P2)

**Goal**: Shopper↔admin messages visible within ~10 s without reload.
**Independent Test**: Two sessions: shop message appears admin inbox ≤10s; admin reply appears shop widget ≤10s.

- [x] T012 [US4] Add 10s interval poll to `app/admin/support/admin-support-client.tsx`, calling existing admin thread-fetch action while any open thread or page visible; clean up timer on unmount; merge into existing `threads` state without flicker (preserve draft reply text)
- [x] T013 [US4] Verify storefront widget's existing 10 s poll (`chat-widget.tsx:95`) surfaces admin replies — no change expected unless bugs found; fix if found

**Checkpoint**: quickstart.md "Cross-side freshness" scenario passes.

---

## Phase 7: [US5] Admin activity toasts (P2)

**Goal**: Signed-in admins get link-bearing toasts for store events while browsing.
**Independent Test**: Place order during admin session ≤30s → toast with link to /admin/orders.

- [x] T014 [US5] Create `components/shared/admin/admin-notifications.tsx` — client poller mounted in `app/admin/layout.tsx`: polls T002 action every 30s, emits sonner toasts with `next/link` referral per event (orders → `/admin/orders`, payments → orders filtered, signups → `/admin/users`, questions → `/admin/support`, low stock → `/admin/products`)
- [x] T015 [US5] Dedupe + cap in same file: track shown event IDs in state; max 4 toasts per poll tick, aggregate overflow as "N more …" toast using i18n `moreEvents` key
- [x] T016 [US5] Toast copy uses new i18n keys; verify strings exist in both fa.json + en.json

**Checkpoint**: quickstart.md "Admin toasts" scenario passes; non-admin sessions produce zero toasts.

---

## Phase 8: Tests (tests requested: add tiny new-feature tests at the end)

- [x] T017 [P] Add `__tests__/lib/notify-activity.test.ts` — unit test for `fetchAdminActivitySince` pure diffing/aggregation helper (per-tick cap, dedupe IDs, aggregate overflow message) with mocked prisma/where clauses; pure logic only
- [x] T018 [P] Add jest assertion to existing parity test scope confirming new `notifications` keys exist in BOTH `messages/fa.json` and `messages/en.json`

---

## Phase 9: Polish & Validation

- [x] T019 Run quickstart.md validation scenarios in browser preview (desktop inset, mobile top+backdrop, keyboard suppression, cross-side freshness, admin toasts, RTL/LTR)
- [x] T020 Run full validation gate: `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build`

---

## Dependencies & Execution Order

- Phase 1 (T001) → Phase 2 (T002, T003) → all story phases
- Phases 3–7 follow P1→P1→P1→P2→P2 order but are largely independent files:
  - T007, T008 independent of each other; T008 needs T004/T005 classes set first in same file
- Tests (Phase 8) intentionally at end per user instruction
- Phase 9 (T019 gate + T020 gate) must pass before commit

### Parallel Opportunities

- T003, T008, T011, T017, T018 are [P] safe (different files or self-contained)

## Implementation Strategy

- **MVP**: Phases 1–5 = pure UI fixes (T001 → T010) — shippable after Phase 5 checkpoint without notification plumbing
- Incremental: add Phase 6 (freshness), then Phase 7 (toasts), tests last

## Notes

- No migrations, no DB writes.
- Reuse existing sonner, existing poll pattern, existing authz guards.
- Commit per logical group; run validation gate before each commit.
