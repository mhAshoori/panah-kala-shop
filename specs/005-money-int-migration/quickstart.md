# Quickstart Validation Guide: Whole-Toman Integer Money Storage

**Feature**: 005-money-int-migration | **Date**: 2026-09-25

Runnable scenarios that prove money is whole Toman end to end. Each maps to a
requirement in [spec.md](spec.md); no implementation detail is duplicated here.

---

## Prerequisites

- Dev database reachable (Neon in dev — **requires a working VPN/proxy**; see
  the `EAI_AGAIN` DNS failure pattern in the project log history).
- `.env` present with `DATABASE_URL`.
- Node 22, dependencies installed.
- Working tree clean, on the `005-money-int-migration` branch.

```bash
git status --short
```

---

## Scenario 1 — Automated gate (fastest signal)

Runs the full validation gate required before any commit.

```bash
npx tsc --noEmit && npm run lint && npm test
```

**Expected**: type check clean; lint clean apart from the pre-existing
`no-unused-vars` / `no-location-assign` warnings; Jest reports all suites passing
with the updated money expectations (see [data-model.md](data-model.md) §4 for
the exact values the amended tests assert).

**Fails if**: any test still expects a two-decimal money value — those are the
tests that encode the old representation and are the intended early warning.

---

## Scenario 2 — Pre-flight audit (must run BEFORE migrating)

Confirms no stored money value carries a fractional Toman, so the conversion is
provably lossless.

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT 'Product.price' AS col, count(*) FROM "Product" WHERE "price" <> trunc("price")
UNION ALL SELECT 'Product.compareAtPrice', count(*) FROM "Product" WHERE "compareAtPrice" <> trunc("compareAtPrice")
UNION ALL SELECT 'ProductVariant.price', count(*) FROM "ProductVariant" WHERE "price" <> trunc("price")
UNION ALL SELECT 'ProductVariant.compareAtPrice', count(*) FROM "ProductVariant" WHERE "compareAtPrice" <> trunc("compareAtPrice")
UNION ALL SELECT 'Cart.itemsPrice', count(*) FROM "Cart" WHERE "itemsPrice" <> trunc("itemsPrice")
UNION ALL SELECT 'Cart.shippingPrice', count(*) FROM "Cart" WHERE "shippingPrice" <> trunc("shippingPrice")
UNION ALL SELECT 'Cart.taxPrice', count(*) FROM "Cart" WHERE "taxPrice" <> trunc("taxPrice")
UNION ALL SELECT 'Cart.totalPrice', count(*) FROM "Cart" WHERE "totalPrice" <> trunc("totalPrice")
UNION ALL SELECT 'Cart.couponDiscount', count(*) FROM "Cart" WHERE "couponDiscount" <> trunc("couponDiscount")
UNION ALL SELECT 'Order.itemsPrice', count(*) FROM "Order" WHERE "itemsPrice" <> trunc("itemsPrice")
UNION ALL SELECT 'Order.shippingPrice', count(*) FROM "Order" WHERE "shippingPrice" <> trunc("shippingPrice")
UNION ALL SELECT 'Order.taxPrice', count(*) FROM "Order" WHERE "taxPrice" <> trunc("taxPrice")
UNION ALL SELECT 'Order.totalPrice', count(*) FROM "Order" WHERE "totalPrice" <> trunc("totalPrice")
UNION ALL SELECT 'Order.couponDiscount', count(*) FROM "Order" WHERE "couponDiscount" <> trunc("couponDiscount")
UNION ALL SELECT 'OrderItem.price', count(*) FROM "OrderItem" WHERE "price" <> trunc("price")
UNION ALL SELECT 'Coupon.value', count(*) FROM "Coupon" WHERE "value" <> trunc("value")
UNION ALL SELECT 'Coupon.minCartTotal', count(*) FROM "Coupon" WHERE "minCartTotal" <> trunc("minCartTotal");
SQL
```

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT o.id FROM "Order" o
WHERE o."totalPrice" <> (
  COALESCE(SUM(i."price" * i.qty), 0) + o."shippingPrice" + o."taxPrice" - o."couponDiscount"
)
GROUP BY o.id, o."totalPrice", o."shippingPrice", o."taxPrice", o."couponDiscount";
SQL
```

**Expected**: every count is `0`, and the order-balance query returns no rows.

**If not zero**: **stop**. Do not run the migration. A fractional value means a
historical row would be silently rounded, and an unbalanced order means
`totalPrice` and the line items were already inconsistent. Reconcile by hand
first, then re-run.

---

## Scenario 3 — Apply the migration

```bash
npx prisma migrate deploy
npx prisma generate
```

**Expected**: `migrate deploy` reports the one money migration applied; `prisma
generate` regenerates the client under `lib/generated/prisma/`.

**Both commands are required.** `migrate deploy` does not regenerate the client,
and a stale client keeps deserializing the new integer columns as decimals — the
quietest failure mode in this change.

**Note**: `numeric → int` takes an `ACCESS EXCLUSIVE` lock and rewrites the
tables. On a small store this is sub-second. Do not run it during a sale.

**Forbidden**: `npx prisma db push` — it would bypass the migration history and
is prohibited by the constitution.

---

## Scenario 4 — Storage is now integer (FR-001)

```bash
npx prisma db execute --stdin --schema prisma/schema.prisma <<'SQL'
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE (table_name, column_name) IN (
  ('Product','price'), ('Product','compareAtPrice'),
  ('ProductVariant','price'), ('ProductVariant','compareAtPrice'),
  ('Cart','itemsPrice'), ('Cart','shippingPrice'), ('Cart','taxPrice'),
  ('Cart','totalPrice'), ('Cart','couponDiscount'),
  ('Order','itemsPrice'), ('Order','shippingPrice'), ('Order','taxPrice'),
  ('Order','totalPrice'), ('Order','couponDiscount'),
  ('OrderItem','price'), ('Coupon','value'), ('Coupon','minCartTotal')
)
ORDER BY table_name, column_name;
SQL
```

**Expected**: all 17 rows report `data_type = 'integer'`.

**Also expected**: `Product.rating`, `Product.lengthCm`, `widthCm`, `heightCm`
and `weightG` still report `numeric` — they are out of scope by design.

---

## Scenario 5 — Re-run the pre-flight audit (idempotency, SC-006)

Repeat Scenario 2 verbatim.

**Expected**: identical output — all zeros. `USING round(...)` is idempotent by
construction, so a second run is a no-op.

---

## Scenario 6 — Storefront shows whole Toman (FR-010, User Story 1)

```bash
npm run dev
```

1. Open a product page, e.g. `/product/<a-real-slug>`.
2. Read the price.

**Expected**: a whole Toman amount with thousands separators and **no decimal
digits**. The rendered value matches the stored integer exactly.

**Fails if**: `.00` appears, or a value differs from the stored price — both mean
a `.toFixed(2)` site or a stale generated client survived.

---

## Scenario 7 — Discount badge is consistent (FR-010, 004 dependency)

1. Open a product that has `compareAtPrice` set.
2. Compare the displayed badge percentage, the sale price and the
   price-before-discount against the stored integers.

**Expected**: `percent === floor((compareAtPrice − price) / compareAtPrice × 100)`,
and the badge is **never higher** than the actual saving.

**Known and accepted**: the badge can be *lower* than a percentage an admin typed
(48.8% of price/percent pairs, per [research.md](research.md) R-006). This is
inherent to storing two integers; the guarantee is "never overstates", which is
what 004's FR-013 now says.

---

## Scenario 8 — Checkout records an exact order (SC-004, SC-005)

1. Add a product to the cart and proceed to checkout.
2. Pay with COD (or ZarinPal sandbox).
3. Open the order in `/admin/orders/<id>`.

**Expected**:
- Every line-item price, the items subtotal, shipping, tax, coupon discount and
  total are whole Toman with no decimals.
- `totalPrice === itemsPrice + shippingPrice + taxPrice` exactly.
- If a coupon applied, `itemsPrice` is already net of `couponDiscount`, so
  `Σ(items) + shipping + tax − couponDiscount === totalPrice`.
- The amount sent to ZarinPal equals the recorded `totalPrice`. A mismatch would
  return gateway code `-50`.

---

## Scenario 9 — Coupons behave (FR-006, FR-007)

1. Create a percent coupon (e.g. `15`) and a fixed coupon (e.g. `10000` Toman).
2. Apply each to a cart whose subtotal is `999999` Toman.
3. Check the resulting discount and total.

**Expected**:
- Percent 15 on 999999 → discount `150000` (not `149999.85`), and
  `itemsPrice === 999999 − 150000 === 849999` with no residual.
- Fixed 10000 on 999999 → discount `10000`.
- A percent coupon of `1` on a subtotal of `10` → discount `0` (rounds to zero,
  handled, not an error).

---

## Scenario 10 — Fractional input is refused (FR-008)

In the admin product form, try to save a product with:

- a price of `100.5` → rejected with a message about whole Toman;
- a price of `100` → accepted;
- a coupon value of `10.50` → rejected.

**Expected**: fractional money never reaches the database, and the stored value
is never a silently rounded one. This is the check that proves the
`.toFixed(2)` removal actually landed — without it, Prisma would coerce the
string and the save would appear to succeed.

---

## Scenario 11 — Overflow is refused, not truncated (FR-002)

Try to save a product with a price above `2,147,483,647`.

**Expected**: rejected at the form/validator with a clear message — **not** a
database `integer out of range` error during checkout, and never a wrapped or
truncated value.

---

## Scenario 12 — AI assistant and structured data agree (FR-012)

1. Ask the storefront assistant for a product's price.
2. Inspect the product page's JSON-LD block.

**Expected**:
- The assistant reports the same whole Toman value the storefront displays.
- The JSON-LD `price` is that value × 10 in `IRR` (the Toman→IRR relationship is
  unchanged by this feature, per FR-015).

---

## Scenario 13 — Seed still loads (commit 3)

```bash
npm run db:seed
```

**Expected**: 13 products with per-variant prices load with no type errors. The
seed supplies integers, not `"59000.00"` strings.

---

## Full pre-commit gate

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

All four must pass. The build is the final gate before any commit, per project
convention.
