# Phase 1 Data Model: Whole-Toman Integer Money Storage

**Feature**: 005-money-int-migration | **Date**: 2026-09-25

All column definitions below are transcribed from the live
[`prisma/schema.prisma`](../../prisma/schema.prisma) with line numbers, and the
count was verified against the file (17 money columns, 5 non-money `Decimal`
columns, 22 `Decimal` columns total).

---

## 1. Money columns: `Decimal(12,2)` → `Int`

Whole Toman. `Int` is Prisma's 32-bit signed integer mapping to PostgreSQL
`integer` (int4). **Money values are never negative** in this schema, so the
usable range is `0 … 2,147,483,647` Toman.

### Product (2 columns)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 76 | `price` | `Decimal @default(0) @db.Decimal(12, 2)` | `Int @default(0)` | **has default** |
| 77 | `compareAtPrice` | `Decimal? @db.Decimal(12, 2)` | `Int?` | none |

`price` is the selling price in Toman. `compareAtPrice` is the price before
discount; `null` means "not discounted". Semantics are unchanged — only the
storage type changes. The discount percentage is **derived**, never stored
(FR-013).

### ProductVariant (2 columns)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 141 | `price` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 142 | `compareAtPrice` | `Decimal? @db.Decimal(12, 2)` | `Int?` | none |

Per-variant prices follow the same relationship as the parent. The parent's
`price`/`stock` are derived from variants on write (see
[lib/variants.ts](../../lib/variants.ts)); that derivation is unchanged.

### Cart (5 columns)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 158 | `itemsPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 159 | `shippingPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 160 | `taxPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 161 | `totalPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 163 | `couponDiscount` | `Decimal @default(0) @db.Decimal(12, 2)` | `Int @default(0)` | **has default** |

Computed by [`lib/cart/pricing.ts`](../../lib/cart/pricing.ts) and written with
`.toFixed(2)`. **Invariant (SC-004)**: `totalPrice === itemsPrice + shippingPrice +
taxPrice`, and `itemsPrice` is already net of `couponDiscount`.

### Order (5 columns)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 175 | `itemsPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 176 | `shippingPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 177 | `taxPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 178 | `totalPrice` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 180 | `couponDiscount` | `Decimal @default(0) @db.Decimal(12, 2)` | `Int @default(0)` | **has default** |

The permanent record of what the shopper paid (FR-011). Columns mirror Cart
exactly, so the same no-residual invariant applies.

### OrderItem (1 column)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 208 | `price` | `Decimal @db.Decimal(12, 2)` | `Int` | none |

Unit price captured at purchase time. **Note**: `Σ orderItems.price × qty` does
*not* equal `Order.itemsPrice` when a coupon applies, because
`couponDiscount` is stored separately on the order. Any balance check must
subtract it.

### Coupon (2 columns)

| Line | Column | Current | New | Default |
|---|---|---|---|---|
| 342 | `value` | `Decimal @db.Decimal(12, 2)` | `Int` | none |
| 344 | `minCartTotal` | `Decimal @default(0) @db.Decimal(12, 2)` | `Int @default(0)` | **has default** |

`value` is **dual-purpose** and its meaning is given by `type` (line 341):
`type = 'percent'` → an integer 1–99; `type = 'fixed'` → a Toman amount. Both
uses are already whole numbers, so a single `Int` column is correct and the
coupon model is unchanged (FR-007). `minCartTotal` is compared against
`Cart.itemsPrice`; `0` means no minimum.

### Conversion totals

- **17 money columns** converted across **6 models**.
- **4 columns carry a default** and need `DROP DEFAULT` / `SET DEFAULT` around
  the `ALTER`, because the `USING` expression is not applied to a column's
  default value: `Product.price`, `Cart.couponDiscount`, `Order.couponDiscount`,
  `Coupon.minCartTotal`.

---

## 2. Non-money `Decimal` columns: explicitly OUT OF SCOPE

These stay `Decimal` and keep the `$extends` stringification untouched. Changing
them would be scope creep — they genuinely need sub-unit precision.

| Line | Column | Type | Why it stays |
|---|---|---|---|
| 78 | `Product.rating` | `Decimal(3,2)` | A 0.00–5.00 rating; 2 decimals are meaningful |
| 85 | `Product.lengthCm` | `Decimal?(8,2)` | Physical measurement, centimetre precision |
| 86 | `Product.widthCm` | `Decimal?(8,2)` | Physical measurement |
| 87 | `Product.heightCm` | `Decimal?(8,2)` | Physical measurement |
| 88 | `Product.weightG` | `Decimal?(10,2)` | Physical measurement, sub-gram precision |

**Consequence**: the `$extends` transform in [`db/prisma.ts`](../../db/prisma.ts)
is **fully retained**. Its five non-money entries are load-bearing; its four money
entries become harmless no-ops that keep prices arriving as `string` (see
research.md R-003).

---

## 3. Migration shape

One file, applied by `npx prisma migrate deploy`. Prisma wraps each migration
file in a transaction on PostgreSQL, so the whole conversion is atomic.

Per column, using the Product `price` as the template (the three-statement form
applies only to the four defaulted columns; all others need one statement):

```sql
ALTER TABLE "Product" ALTER COLUMN "price" DROP DEFAULT;
ALTER TABLE "Product" ALTER COLUMN "price" TYPE integer USING round("price"::numeric, 0)::integer;
ALTER TABLE "Product" ALTER COLUMN "price" SET DEFAULT 0;
```

`round(x, 0)` on `numeric` breaks ties away from zero, which is half-up for all
non-negative money. The `USING` clause is not strictly required (the
`numeric → int4` cast is assignment-level and already rounds) but is supplied so
the rounding rule is explicit and reviewable per FR-003.

**Cost**: `numeric → int` is a full table + index rewrite under
`ACCESS EXCLUSIVE`, not MVCC-safe. Tables are small; the lock is brief. The
rewrite-skip optimization does not apply because contents change.

### Pre-flight audit (must return zero rows before migrating)

```sql
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
```

Also check order balance, since `OrderItem.price` and `Order.totalPrice` are
rounded by separate ALTERs:

```sql
SELECT o.id FROM "Order" o
WHERE o."totalPrice" <> (
  COALESCE(SUM(i."price" * i.qty), 0) + o."shippingPrice" + o."taxPrice" - o."couponDiscount"
)
GROUP BY o.id, o."totalPrice", o."shippingPrice", o."taxPrice", o."couponDiscount";
```

Zero rows across both ⇒ the conversion is provably lossless. Any non-zero row ⇒
**stop**, reconcile by hand, and only then migrate.

---

## 4. Validation rules after conversion

### Money entry (server boundary)

| Rule | Where | Requirement |
|---|---|---|
| Whole numbers only | `lib/validator.ts` `currency` | Must reject `49.99`; regex becomes `/^\d+$/` (FR-008) |
| int4 ceiling | `lib/validator.ts` `currency` | Must reject `> 2_147_483_647` (FR-002) |
| Product price positive | `insertProductSchema` | `price` > 0 |
| Stock non-negative | `insertProductSchema` | `stock >= 0` (unchanged) |
| At least one image | `insertProductSchema` | unchanged |
| Coupon percent range | `lib/coupon.ts` | `1…99`, clamped; `>= 100` refused |
| compareAtPrice > price | `insertProductSchema` refine | unchanged — no discount when absent or `<= price` |

The current validator's own error message reads *"Price must have exactly two
decimal places (e.g., 49.99)"* — fractional prices are presently the **intended**
input, so this message and the regex both change.

### Discount derivation (R-006, consumed by 004)

```
compareAtPrice = Math.round(price * 100 / (100 - percent))
```

- `percent` 0 → no discount, `compareAtPrice` cleared.
- `percent >= 100` → refused.
- `percent <= 99` → derived value is rounded half-up.
- **Overflow guard on the derived value**, not on `price`: derived
  `compareAtPrice` must be `<= 2_147_483_647`. At `percent = 33` the safe price
  ceiling is `1_438_814_043`. A naive `price <= int4max` check passes and then
  overflows on write.

**Known and accepted**: the badge recomputed from the stored integer pair can be
**lower** than the typed percent — 48.8% of `(price 1–500, percent 1–30)` pairs
disagree, worst case 30 points. This is inherent to storing two integers and
deriving a third. The guarantee is that the badge **never overstates** the
saving, which the floored `getDiscount` percentage guarantees.

---

## 5. Data volume and lifecycle

- **Volume**: a solo store; all seven tables are small enough that a
  `ACCESS EXCLUSIVE` rewrite is a sub-second lock. The pre-flight audit
  (section 3) is the cost that buys certainty.
- **Lifecycle**: conversion is one-way and irreversible. It rewrites historical
  order values, so it is isolated in its own commit and reviewed on its own.
- **Idempotency**: `USING round(...)` is provably idempotent — a second run
  finds no fractional values. No migration test is needed; that would test
  Postgres's `round()`, not this codebase.
- **Int4 ceiling**: `Σ(price × qty)` with unbounded `qty`
  (`lib/validator.ts:159` has no maximum) can exceed the ceiling. PostgreSQL
  raises `integer out of range` rather than wrapping, so the failure is loud —
  but capping price in the validator moves it to a form-level error instead of a
  checkout-time failure.
- **Stale JSON**: `Notification.data` (`prisma/schema.prisma:312`) and
  `Cart.items` keep `"49000.00"`-style strings. They render correctly through
  existing formatters that drop the fraction, so no migration — follow-up
  cleanup, not this change.
