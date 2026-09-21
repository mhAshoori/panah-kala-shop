# Quickstart: Admin Notification Log

## Prereqs
- dev server (`npm run dev`); signed-in admin session; seeded DB with products/orders.

## Scenario 1 — Log page completeness (US1 / FR-003, FR-004, FR-005)
1. As shopper: place an order (COD path /checkout). As admin: open /admin/notifications → newest row tagged "order", showing buyer + total, linking to /admin/orders, locale-aware timestamp.
2. As shopper: send a support question. Admin: /admin/notifications shows a "question" row with user name + excerpt.
3. Set a product stock to 0 (or below threshold), trigger/reload: a "stock" row appears naming that product.
4. Empty DB → page shows an informative empty state (not blank/crash).

## Scenario 2 — Toast copy complete (US2 / FR-008)
1. Create/drop a product to low stock with admin panel open ≤30s → toast includes the product name (not a generic "کمبود موجودی").
2. Trigger an order → toast identifies the order (id/total).
3. Toggle language → fa/en both complete.

## Scenario 3 — Page size (FR-011 / SC-005)
1. /admin/notifications → change page size control to 25 → list shows up to 25 rows; reload → still 25 (Setting-persisted).
2. Size 100 → bounded query ≤100 rows, no lag.

## Scenario 4 — Server-safety (US3 / SC-003)
1. Dev-tools network tab; browse /admin for 2 min → notification-related requests ≤ 4 (30s cadence).
2. Server console: no per-navigation writes; writes only on actual events.

## Validation gate
`npx tsc --noEmit` → `npm run lint` → `npm test` → `npm run build` green before commit; browser verification per scenarios above.
