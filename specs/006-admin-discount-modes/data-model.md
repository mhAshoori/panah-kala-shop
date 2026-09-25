# Data Model: Admin Discount Method Selection

**Feature**: `006-admin-discount-modes`

**Schema change: NONE.** This feature changes how the administrator *expresses* a
discount, not how it is stored. Every field below already exists from
005-money-int-migration and 004-product-required-discount.

## Stored fields (unchanged)

### `Product`

| Field | Type | Null | Notes |
|---|---|---|---|
| `price` | `Int` | no | Selling price, whole Toman. `DEFAULT 0`, but the validator requires > 0. |
| `compareAtPrice` | `Int` | **yes** | Original price. `null` = no discount. Must be strictly `> price` when present. |

### `ProductVariant`

Identical shape: `price` (`Int`, not null), `compareAtPrice` (`Int`, nullable,
must be strictly `> price` when present).

### What is NOT stored

| Concept | Why not | How it is recovered |
|---|---|---|
| Discount method (percentage vs price) | Fully derivable from the pair; a stored flag is a second source of truth that can disagree with the price it describes (research.md R-002) | `resolveMode(price, compareAtPrice)` |
| On-sale state | Identical information — a product is on sale exactly when `compareAtPrice IS NOT NULL` | `compareAtPrice != null` |
| Discount percentage | Established in 004 FR-006: never stored as authoritative, always derived | `getDiscount(...)` → `percent` |
| Partial-variation flag | Would go stale on any variant write, and there are several write paths (admin form, order stock decrement, seed) | `classifyProduct(...)` at read time (R-005) |

## Derived values

All four are pure functions in `lib/discount-math.ts`, testable without a
browser (FR-026).

### `deriveSellPrice(base, percent) → number | null`

The percentage-mode derivation. **Floor-then-bump** (R-001):

```
sell = floor(base × (100 − percent) / 100)
while badge(sell, base) > percent:  sell += 1
```

The bump step is a no-op for every `base ≥ 100`; it exists solely to stop the
badge overstating in the sub-100-Toman regime (668 violations without it,
0 with it). Returns `null` for percent `0`/empty (no discount).

### `derivePercent(base, sell) → number | null`

The price-mode derivation. `floor((base − sell) / base × 100)`. This is
`percentToDiscount` under its existing name, with `base` and `sell` swapped
from the stored pair's orientation — the expression is identical, only the
argument names change, which is what keeps the form and the storefront from
disagreeing.

### `resolveMode(price, compareAtPrice) → 'percent' | 'price' | 'none'`

Percentage mode iff `deriveSellPrice(price, derivedPercent) === compareAtPrice`.
So a stored 4,500 / 3,900 pair, whose percent is 13, re-derives 3,915 ≠ 3,900
and loads in **price** mode — the mode that reproduces the admin's typed
numbers exactly. A stored pair that does round-trip loads in percent mode.

### `variantsAgree(purchasable) → boolean`

Cross-multiplication, never float equality (R-003):

```
cmpA × priceB  ===  cmpB × priceA
```

Guarded by `a × b > Number.MAX_SAFE_INTEGER → return false` (conservative —
disagreement, the safe direction) (R-004).

### `classifyProduct(product, purchasableVariants) → 'uniformDiscount' | 'partialDiscount' | 'noDiscount'`

The three states that drive the card (R-005, R-006):

| State | Condition | Card renders |
|---|---|---|
| `noDiscount` | no purchasable variant has a `compareAtPrice` | price only, unchanged |
| `uniformDiscount` | every purchasable variant is discounted **and** all agree on ratio | the existing percentage badge + struck-through original, unchanged |
| `partialDiscount` | some discounted, some not, or ratios differ | the note "تخفیف در برخی از تنوع‌ها", **no** percentage, **no** strike-through |

`purchasable` = variants with `stock > 0` **or** stock not tracked; in practice
the variants a shopper can actually buy. The product-level `price` /
`compareAtPrice` are **not** read by this function — they are an output of it
(see below), not an input.

## State transitions

Three, all in the form's local state. None of them is persisted as a flag.

| From | Event | To | Stored effect |
|---|---|---|---|
| not on sale | admin flips the switch on | on sale, mode preserved or defaulted to percent | none until a discount value is typed |
| on sale | admin types a percent or a selling price | same | `compareAtPrice` written as the **derived** value (percent mode) or the **typed** value (price mode) — in both cases a value the server re-derives and re-validates (R-009) |
| on sale | admin flips the switch off | not on sale | `compareAtPrice = null`; base price remains the selling price |

Switching method **never** moves data (FR-021): it only changes which single
field is editable and which is read-only. The same base price and the same
underlying pair are visible in both modes.

## Product-level aggregation (changed)

`recomputeParent` in `lib/variants.ts` currently takes
`min(compareAtPrice)` over non-null variant values, paired against
`min(price)`. This is the defect the 004 analysis pass raised as **A-002
(HIGH)** and that is unremediated: variants `[{1000, 1111}, {1000, null}]`
produce a parent of `{1000, 1111}` — a 9% badge on a product where only one of
two purchasable variants is discounted.

New rule (FR-015, clarification Q2):

```
price         = min(all variant prices)                          // unchanged
compareAtPrice = allAgreeOnRatio ? min(compared) : null          // CHANGED
```

The existing `min` pairing survives only inside the `allAgree` branch, where
it is correct because all ratios are identical.

## Validator deltas

`lib/validator.ts`, `insertProductSchema`:

| Rule | Current | After |
|---|---|---|
| `compareAtPrice` | `currency` (digits) + refine `> price` | unchanged |
| discount percentage | not present — the form submits a pre-computed `compareAtPrice` | server derives it; percent is validated as a whole number 1–99 when the mode is percent (FR-017) |
| selling price in price mode | not present | must be strictly `< price`; equality is **not** an error, it is no discount (R-007) |

The two-direction rule is the reason the server now re-derives rather than
trusting the hidden input (R-009): the submitted shape is
`{ price, onSale, discountMode, discountValue }`, and the server reconstructs
`compareAtPrice` itself.

## No migration

`.specify` records the money columns as `Int` already. No `migration.sql` is
authored, no `prisma generate` runs, and the listing's new `include` is
read-only. This is a deliberate part of the design, not an oversight: the two
concepts this feature adds (method, on-sale) are both derivable, and storing
either would create the second-source-of-truth problem R-002 describes.
