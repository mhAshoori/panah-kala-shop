# Quickstart: 002-chatbox-ux validation

Prereq: `npm run dev` on :3000; seeded DB (`npm run db:seed`). Sign-in credentials from seed.

## Desktop layout (FR-1)

1. Open storefront at ≥ 640 px viewport. Open chat.
2. Verify panel's outer edge is visibly inset from the browser viewport's right edge (not flush) — both fa (RTL) and en (LTR).
3. Repeat in `/admin` (admin chat panel).

## Mobile top-center + backdrop (FR-2, FR-3)

1. DevTools → 375 px viewport. Open chat.
2. Verify panel is top-anchored, centered horizontally, backdrop dims the page.
3. Tap the backdrop → panel closes. Verify launcher still works afterwards.

## Keyboard suppression (FR-4)

1. Real device (or DevTools mobile emulation won't show a real keyboard — use a real phone if available).
2. Tap launcher → panel opens, no virtual keyboard.
3. Tap the input field → keyboard appears.

## Cross-side freshness (FR-5)

1. Two sessions: shopper (storefront, support tab, signed in) + admin (`/admin/support`).
2. Shopper sends a message. Within ~10 s admin's inbox shows the thread message without reload.
3. Admin replies. Within ~10 s shopper's widget shows the reply without reload.

## Admin toasts (FR-6/7)

1. While signed-in admin browses any admin page, place an order via storefront checkout (or wait for seed event).
2. Within ~30 s a sonner toast appears with text + link to `/admin/orders`.
3. Sign in as non-admin user in another browser → no toasts.
4. Place 2+ quick orders → toasts not stacked unboundedly (aggregate beyond cap).

## Localization (FR-8)

1. Switch language fa ↔ en (admin settings or as available). Verify toast + panel strings render.
2. Run `npm test` — fa/en parity test green.

## Gate

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```
