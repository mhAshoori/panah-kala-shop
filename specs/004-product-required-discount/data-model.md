# Phase 1 Data Model: Product Required Fields & Unified Discount Input

**Feature**: 004-product-required-discount | **Date**: 2026-09-25

**No schema change.** Every field this feature needs already exists, and
money is already `Int` (whole Toman) after 005-money-int-migration. This
document records what is already in the database, what changes in the form
contract, and the validation rules that tighten.

---

## 1. Entities as stored (unchanged)

### Product — the fields this feature governs

| Field | Prisma type | Required by spec | Current client gate | Server gate |
|---|---|---|---|---|
| `name` | `String` | yes (FR-004) | HTML `required` (form:289) | `.min(3)` (validator:15) |
| `nameFa` | `String` | yes | HTML `required` (300) | `.min(3)` (16) |
| `slug` | `String @unique` | yes | HTML `required` (313) | `.min(3)` (17) |
| `categoryId` | `String?` | **yes** (main category) | `<select required>` (344), no `name` | `resolveCategoryChain` throws (actions:710) |
| `subCategoryId` | `String?` | **yes** (sub category) | `<select required>` (367) | throws (actions:711) |
| `subSubCategoryId` | `String?` | no | not required (387) | — |
| `brand` | `String` | yes | HTML `required` (408) | `.min(3)` (19) |
| `description` | `String` | yes | HTML `required` (624) | `.min(3)` (21) |
| `descriptionFa` | `String` | yes | HTML `required` (635) | `.min(3)` (22) |
| `price` | `Int` | yes, **> 0** | HTML `required` (423), `step='0.01'` | `currency` digits-only, **no positivity rule** |
| `stock` | `Int` | yes, **>= 0 integer** | HTML `required` (449), `min='0'` | `z.coerce.number()` — **no `.int()`, no `.min(0)`** |
| `images` | `String[]` | yes, **>= 1** | **none** | `.min(1)` (34) |
| `compareAtPrice` | `Int?` | optional, derived | text input (430-438), `step='0.01'` | union with `''` → null (42-45) |
| `lengthCm` / `widthCm` / `heightCm` | `Decimal?` | **no** (FR-007) | optional (456-491) | loose union, no numeric check |
| `weightG` | `Decimal?` | **no** | optional (492-503) | loose union |
| `banner` | `String?` | **no** | optional | `z.string().nullable()` |
| `isFeatured` / `codAvailable` | `Boolean` | n/a | checkboxes | — |

`rating` and `numReviews` are system-owned and not editable here.

### ProductVariant — same rules, currently looser

| Field | Required | Server gate today | Gap |
|---|---|---|---|
| `price` | yes | `currency.transform(Number)` (validator:92) | none |
| `compareAtPrice` | optional | union → null (93-96) | **no `> price` refine** |
| `stock` | yes | `.int().min(0)` (97) | none |
| `key` | system | computed from value ids | — |
| `image` | optional | `.nullish()` (98) | no UI input despite the field existing |

### Derived parent values (why the parent percent field has limits)

`recomputeParent` (`lib/variants.ts:123-144`, called inside the transaction at
`product.actions.ts:691`) overwrites the parent row whenever variants exist:

- `price` = **min** of variant prices
- `compareAtPrice` = **min** of non-null variant `compareAtPrice`
- `stock` = **sum** of variant stock

So for a product with variants, the product-level price and discount fields
are display-only. The spec's per-variant independence (FR-015) is what makes
this consistent: nothing cascades, and the parent's numbers are a summary of
the variants rather than a second source of truth.

---

## 2. What changes in the form contract

### Discount becomes one input, two derived values

```
  admin types:  discountPercent  (0–99, integer, optional)
  form derives: compareAtPrice = floor(price * 100 / (100 - discountPercent))
                display label: "price before discount" (read-only)
  admin types:  price
  form derives: nothing — price is the input
```

Three cases, all derived from the typed percentage:

| `discountPercent` | Derived `compareAtPrice` | Result |
|---|---|---|
| empty or `0` | `null` | no discount; no badge |
| `1`–`99`, price `>= 100` | `floor(price * 100 / (100 - pct))` | badge `floor((cmp-price)/cmp*100)` — **never exceeds** the typed percent |
| `1`–`99`, price `< 100` | — | **refused** with a field-specific message |

The badge is not stored and not editable. It is recomputed from the two
stored integers by `getDiscount` (`lib/discount.ts:12-28`) wherever a price
is displayed, so the form and the storefront cannot disagree.

### Validation rules that change

| Rule | Before | After | Why |
|---|---|---|---|
| `price` | digits + max | digits + max + **`.min(1)`** | FR-005: a free product is not sellable; `0` currently passes |
| `stock` | `z.coerce.number()` | **`.int().min(0)`** | FR-006: `Number('')` is `0`, so a blank stock silently became zero |
| money input `step` | `step='0.01'` | **`step='1'`** | whole Toman; `0.5` currently passes HTML and dies on zod |
| variant `compareAtPrice` | no refine | **`> price` refine** | matches the parent rule; a "discount" that is not a discount is a data error |
| discount percent | n/a | **`0`–`99` integer; `>= 100` refused** | FR-011; `100` would divide by zero and `> 100` yields a negative base |
| price floor | n/a | **discount refused when `price < 100`** | R-001: prevents a typed discount silently rendering no badge |
| images | toast only | **decided at implementation** | R-003: the one mandatory field with no client gate |

### Rounding, stated once

- Derived `compareAtPrice` is **floor**, never half-up. Verified: across
  price 1–5000 × percent 1–99, floor yields **zero** overstatements
  (half-up yields 46).
- The badge is `floor` — the existing `getDiscount` behaviour, unchanged.
- A consequence, accepted deliberately: the badge may read *lower* than the
  typed percentage (999,999 at 33% shows 32). This is the visible cost of
  making overstatement impossible, and it matches FR-013's revised wording.

---

## 3. State transitions

No lifecycle changes. A product is drafted → saved; the discount field's
only state question is its round-trip:

- **New product**: percent empty → no discount.
- **Existing discounted product**: the form derives the percent from the
  stored pair on load, so the admin sees what they set. That derivation is
  `floor((cmp - price) / cmp * 100)` — the *badge*, not the originally typed
  value. If the price is then edited, FR-017 recomputes `compareAtPrice`
  from the preserved percent, which can drift from the stored pair by a
  fraction of a percent. This is inherent to storing two integers and is
  accepted.
- **Clearing the field** clears `compareAtPrice` to `null`; the storefront
  stops showing a badge immediately.
