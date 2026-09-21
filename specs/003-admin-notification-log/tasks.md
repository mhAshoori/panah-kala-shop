---
description: "Task list for 003-admin-notification-log — full notification log + complete toasts + admin page size"
---

# Tasks: Admin Notification Log

**Input**: Design documents `specs/003-admin-notification-log/`
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## Format: `[ID] [P?] [Story] Description`

- **[P]**: parallelizable (different files, no deps)
- **[Story]**: user story from spec.md (US1 log page, US2 toast copy, US3 server-safe page size)

## Path Conventions

Single Next.js codebase — real paths from plan.md. **No migration: reuse existing `Notification` table.**

---

## Phase 1: Setup

- [X] T001 Extract event-kind labels/detail building into pure helpers in `lib/notification-events.ts` (prisma-free): `kindKey` map ('order'|'payment'|'signup'|'question'|'stock' → fa/en key names), `buildEventBody(kind, payload)` returning {title, body, data} per contracts/notification-events.md — `order`: `${buyer} — ${items} قلم — ${total}`, `stock`: `${productName} — ${low?'کمبود موجودی':'ناموجود شد'}`

---

## Phase 2: Foundational

- [X] T002 Extend `lib/notifications.ts`: rename/extend `notifyAdminNewOrder` internals into `export async function recordNotification({ type, title, body, data? })` — one `prisma.notification.create`, never throws (try/catch + '[notify] record failed' log); after insert, `prisma.notification.count()` > 5000 → one bounded `deleteMany` ordered `createdAt asc` with `skip: 4999` (rolling cap FR-010)
- [X] T003 [P] Switch `fetchAdminActivitySince` in `lib/actions/notify.actions.ts` to read recorded rows: `prisma.notification.findMany({ where: { createdAt: { gt: since } }, orderBy: { createdAt: 'desc' }, take: 20 })` mapped to existing `AdminActivityEvent` shape (id, kind, href 001→orders 002, signup→users, question→support, stock→products per data-model href map, createdAtIso, refId from body/productName); delete the 5-table Promise.all

---

## Phase 3: [US1] Log page: all kinds shown with tags (P1)

**Goal**: /admin/notifications displays every recorded kind with tag, detail, timestamp, link, empty state.
**Independent Test**: trigger order/question/stock events → page lists all with correct tag + detail (quickstart Scenario 1).

- [X] T004 [US1] Add event recording call sites: `payment` where ZarinPal callback verifies paid (app/api/zarinpal), `signup` after non-admin `signUp` user create (lib/actions or auth register path), `question` when shopper posts a support message (support/chat store path), `stock` when product.stock is written ≤ LOW_STOCK_THRESHOLD (product update/create actions + stock decrement on order) — each calls `recordNotification(buildEventBody(...))`; compose titles/bodies from messages keys via site-locale where server-side strings needed (fa-first)
- [X] T005 [US1] Add kind-tag chip to `app/admin/notifications/admin-notifications-client.tsx` rows: badge styled per kind (order/payment/signup/question/stock), from `type` field, using new i18n keys `tagOrder/tagPayment/tagSignup/tagQuestion/tagStock` in messages/fa.json + en.json (FR-003)
- [X] T006 [US1] Ensure row detail (FR-004) + timestamp rendering (FR-005, fa/en locale aware) and per-kind href link (FR-006) on /admin/notifications rows
- [X] T007 [US1] Empty state: informative fa/en line when list.rows.length === 0 on /admin/notifications (quickstart Scenario 1.4)

**Checkpoint**: quickstart Scenario 1 passes — all kinds visible, tagged, linked.

---

## Phase 4: [US2] Complete toast copy (P1)

**Goal**: toasts carry the entity: product name for stock, order id for orders.
**Independent Test**: fire low-stock + order toasts, verify entity present (quickstart Scenario 2).

- [X] T008 [US2] Update toast poller `components/shared/admin/admin-notifications.tsx` to include `refId`/event detail from the log rows in the toast description: stock toast shows product name, order toast shows order id/total — keys `toastStockDetail('{{name}}')`/`toastOrderDetail('{{id}}')` in fa.json + en.json (FR-008)
- [X] T009 [P] [US2] Message-parity test additions in `__tests__/messages.test.ts` for the new keys (tag* + toast*Detail)

**Checkpoint**: quickstart Scenario 2 passes.

---

## Phase 5: [US3] Admin-adjustable page size (P2)

**Goal**: page size changeable by admin, Setting-persisted.
**Independent Test**: change size, reload, persists (quickstart Scenario 3).

- [X] T010 [US3] Add Setting default: in `app/admin/notifications/page.tsx` read `Setting('notificationsPageSize')` (zod-validated 10–100) and use it as fallback when `size` param missing; extend `parsePageSize` override call with this fallback
- [X] T011 [US3] Add page-size selector UI in `admin-notifications-client.tsx` (options 10/25/50/100) calling new server action `saveNotificationsPageSize(value)` in `lib/actions/notify.actions.ts` — requireAdmin, zod clamp 10–100, Setting upsert, revalidatePath('/admin/notifications') (FR-011 / SC-005)

**Checkpoint**: quickstart Scenario 3 passes.

---

## Phase 6: Tests (phase placed last per repo convention)

- [X] T012 [P] Unit tests for pure helpers in `__tests__/lib/notification-events.test.ts`: buildEventBody shape per kind (order body includes buyer+total+قلم; stock body includes product name + out/low wording), rolling-cap math helper, kind→href map
- [X] T013 [P] Unit test for pruned cap in `__tests__/lib/notification-prune.test.ts`: cap-detect logic (count > 5000 → prune target count = count-4999) as pure function used by recordNotification

---

## Phase 7: Polish & Validation

- [X] T014 Run quickstart.md Scenarios 1–4 in browser preview (log completeness, toast copy, page size persistence, server-safety network check)
- [X] T015 Full validation gate: `npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build`

---

## Dependencies & Execution Order

- Phase 1 (T001) → Phase 2 (T002, T003) → story phases
- US1 (T004–T007) core value; US2 (T008, T009) is small, depends on T001 helpers + T003 rows; US3 (T010, T011) independent of US1/US2 internals
- Tests last per repo convention (T012, T013)
- Phase 7 (T014/T015) gates before commit

### Parallel Opportunities

- T003, T009, T012, T013 are [P]

## Implementation Strategy

- **MVP**: Phase 1–3 (log page shows full history with tags) — shippable alone
- Then US2 toast completeness, then US3 page size; tests after

## Notes

- No schema/migration changes; reuse `Notification`, `Setting`.
- Server-safety guardrail: every read bounded (≤100 page, ≤20 poll), poll stays 30s, writes only at event time; the 002 loop bug is already fixed (commit 9ff3960) — keep away from re-creating per-tick subscriptions.
- Commit per logical group; run validation gate before each commit.
