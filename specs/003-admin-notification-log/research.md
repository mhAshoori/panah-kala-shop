# Research: Admin Notification Log

## R1 — New NotificationEvent table vs reuse existing Notification model
**Decision**: REUSE the existing `Notification` model (prisma/schema.prisma:307). It already has `type`, `title`, `body`, `data Json`, `isRead`, `createdAt`, `@@index([isRead, createdAt])`. The `/admin/notifications` page + `getNotifications` lister already exist (lib/notifications.ts, app/admin/notifications/page.tsx). The 002-chatbox-ux toast poller currently reconstructs events by querying 5 tables — instead extend the existing write path (`notifyAdminNewOrder`) into a generic `recordNotification()` used at each event site, so FR-007 is satisfied with the table already in the DB.
**Rationale**: Constitution VII (reuse before inventing); avoids a second overlapping table and a duplicate migration.
**Alternatives**: new `NotificationEvent` table — rejected: duplicates existing model + page; derive-only from source tables — rejected: FR-007 requires recorded events.

## R2 — Event kinds recorded
**Decision**: kinds = `order` (exists today), plus `payment` (paidAt on order), `signup` (new non-admin user), `question` (unread fromAdmin:false support message), `stock` (product hits LOW_STOCK_THRESHOLD or 0). Recorded at event time from the existing server-action code paths (order placement already calls notifyAdminNewOrder; add one `recordNotification()` call at the other 4 sites).
**Rationale**: matches FR-003 enumeration and the 002 kinds.

## R3 — Cap implementation (rolling 5,000)
**Decision**: prune inside `recordNotification()` after each insert, best-effort and non-blocking: when a `count()` exceeds 5,000, one bounded `deleteMany` ordered by `createdAt asc`, `skip: 4999` removes the overflow only.
**Rationale**: server-safe (single bounded statement only when over cap), satisfies FR-010 without a cron job.

## R4 — Page-size persistence
**Decision**: reuse the existing `parsePageSize` + `size` search-param pattern already on the notifications page; persist the admin's chosen size as a `Setting` row (`notificationsPageSize`), zod-clamped 10–100; the page control uses the Setting default when `size` param absent.
**Rationale**: Constitution VII + FR-011; the `Setting(key,value)` table already exists.

## R5 — Toast completeness
**Decision**: the 30s toast poller (admin-notifications.tsx) reads the *recorded rows* (lib/notifications.ts lister, bounded take ≤20) instead of reconstructing from 5 tables — toasts carry detail loaded with the row: `order` body already contains buyer/count/total; `stock` body includes the product name. Copy keyed via fa/en messages with `{{entity}}` interpolation.
**Rationale**: single source of truth — log rows ARE the toast payload; no extra DB load (same 30s poll, one bounded query).

## R6 — Server-safety
**Decision**: writes only at event time (1 insert per event); reads bounded (take ≤ pageSize max 100 for the page, ≤20 for the poll); poll interval unchanged at 30s; prune-only deleteMany when over cap.
**Rationale**: spec FR-009 / SC-003.
