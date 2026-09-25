# Quickstart: Admin Discount Method Selection

**Feature**: `006-admin-discount-modes`

Runnable validation for the feature end to end. Scenarios 1–7 are automated;
**8–17 are the browser-preview verification the user asked for**, covering both
the admin panel and the storefront.

## Prerequisites

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
npm run dev
```

Admin credentials: see `.env.example` / the seeded admin account. The dev
server is on `:3000`; a stale process is cleared with
`netstat -ano | findstr :3000` then `taskkill //PID <pid> //F`.

No migration to apply — this feature changes no schema. If the dev DB is stale
from a previous branch, `npx prisma migrate deploy` is harmless but not
required.

## Part 1 — Automated (scenarios 1–7)

```bash
npx jest __tests__/lib/discount-math.test.ts
npx jest __tests__/lib/variants.test.ts
npx jest __tests__/lib/validator.test.ts
npx jest __tests__/lib/messages.test.ts
```

### Scenario 1 — The common cases stay exact

| Input | Expected derived selling price | Badge |
|---|---|---|
| base 4500, 10% | **4050** | 10% |
| base 1000, 25% | **750** | 25% |
| base 100, 10% | **90** | 10% |

Exact figures must not drift. The bump step in `deriveSellPrice` is a no-op
here.

### Scenario 2 — The sub-100-Toman bump (the case plain floor gets wrong)

| Input | Plain floor gives | Badge on that | **Required** | Badge on that |
|---|---|---|---|---|
| base 99, 10% | 89 | 10% | **89** (no bump) | 10% |
| base 49, 25% | 36 | **26%** ❌ overstates | **37** | **24%** |

This is research.md R-001 and it is the single most important check in the
feature. If the implementation floors without bumping, scenario 2 fails on
`base 49, 25%` with a badge of 26% against a typed 25%.

Note the required case reads **24%, one below** the typed 25%. That is correct
and is the deliberate trade in FR-008: understating the saving is always safe,
overstating it is not. The bump stops the overstatement; it does not attempt to
restore the exact figure, because no integer selling price on a 49-Toman base
produces exactly 25%.

### Scenario 3 — The inverted safety invariant

Across a matrix of base prices (1, 49, 50, 99, 100, 555, 999, 1000, 4500,
32990, 999999) × percents (1, 2, 3, 5, 10, 15, 25, 33, 50, 75, 90, 99),
recompute the badge from the derived pair and assert
**badge ≤ typed percent**. This is FR-008 and FR-022 as an executable check.
004's version of this test asserted the same property in the opposite
derivation direction; it must be replaced, not kept alongside.

Expected: **0 violations**. Plain floor fails this with 668.

### Scenario 4 — Price mode round-trips

`derivePercent(4500, 3900) === 13`, and `deriveSellPrice(4500, 13) === 3915`
(truncated, so 1 Toman above 3900 — a price-mode-entered 3900 is stored as
**typed**, and re-deriving it in percent mode is not expected to reproduce it
exactly. That asymmetry is the reason `resolveMode` exists: it loads a
4,500 / 3,900 pair in **price** mode so the admin's own numbers reappear).

### Scenario 5 — Invalid input is refused

| Input | Expected |
|---|---|
| percent `100` | refused, field named |
| percent `12.5` | refused, whole-number requirement stated |
| price mode, selling `5000` against base `4500` | refused, not swapped |
| price mode, selling `4500` against base `4500` | **saved as no discount** (R-007) |
| base `50`, percent `1` | **warned, saved** (advisory, FR-018) |

### Scenario 6 — Variant agreement

| Purchasable variants | `variantsAgree` | `classifyProduct` |
|---|---|---|
| `[{1000, 1111}, {1000, 1111}]` | true | `uniformDiscount` |
| `[{1000, 1111}, {1000, null}]` | false | `partialDiscount` |
| `[{1000, 1111}, {2000, 2500}]` | false | `partialDiscount` |
| `[{4500, 3900}, {9000, 7800}]` | **true** (same ratio, float equality fails) | `uniformDiscount` |
| `[{1000, null}]` | — | `noDiscount` |

### Scenario 7 — Bilingual parity

`npx jest __tests__/messages.test.ts` passes. The new keys exist in both files,
and the "تخفیف در برخی از تنوع‌ها" literal is the fa side of the `product`-namespace
key added for the partial-variation note.

---

## Part 2 — Browser preview (scenarios 8–17)

The user asked for a browser-preview test in **both** the storefront and the
admin panel at the end of the process. These are the scenarios. Each names the
page, the setup, and the expected result, so the pass is evidenced rather than
asserted.

### Admin panel

#### Scenario 8 — Not on sale: the controls do not exist

- **Where**: `/admin/products/create`
- **Do**: look at the price area with the toggle untouched.
- **Expect**: one base-price field. **No** method control, **no** derived value,
  **no** on-sale state showing as active. This is FR-001 and FR-003.

#### Scenario 9 — Percentage mode derives the selling price

- **Do**: turn on the on-sale switch, confirm the method control appears, select
  **percentage**, type base `4500`, type `10`.
- **Expect**: discounted price **4,050** and saving **450** update live without
  saving. Switch to **price** mode: the same pair reappears, percentage now
  editable at `10`, discounted price read-only at 4,050. FR-004, FR-005, FR-006,
  and the no-drift requirement of FR-021.

#### Scenario 10 — Price mode types the number the admin knows

- **Do**: base `4500`, method **price**, discounted price `3900`.
- **Expect**: discount **13%** and saving **600** live. Save, reopen the editor.
- **Expect**: base 4500, discounted price **3900** — the admin's own numbers,
  reloaded, not a re-derived 3915. This is `resolveMode` (R-002) working.

#### Scenario 11 — The 1% warning, and that it does not block

- **Do**: base `50`, method **percentage**, percent `1`.
- **Expect**: the advisory warning appears naming the 1 percent minimum. Saving
  **succeeds**. Reopening shows base 50, percent 1 — the typed value was not
  raised to a minimum and not discarded. FR-018, FR-019.

#### Scenario 12 — Invalid input is refused with the field named

- **Do**: try percent `100`, then `12.5`, then a price-mode selling price
  **above** the base.
- **Expect**: each refused, each naming the offending field, each leaving the
  typed numbers on screen so nothing is retyped. FR-017, FR-020.

#### Scenario 13 — Per-row methods on a multi-variant product

- **Where**: a product that already has two combinations.
- **Do**: on row 1, on sale + percentage + 10%. On row 2, on sale + price +
  3900 against base 4500. Save, reload.
- **Expect**: every row round-trips **exactly**. Row 1 did not become row 2's
  method. Clearing row 2's discount left row 1 alone. FR-012, FR-013, FR-030.

#### Scenario 14 — An existing product loads without being rewritten

- **Where**: a product saved under 004, whose stored pair reads 9% rather than a
  round 10%.
- **Expect**: opens, is shown on sale, pre-sets a method, shows both stored
  numbers **unchanged**. Confirm the DB row is byte-identical afterwards. FR-010,
  FR-024.

### Storefront

#### Scenario 15 — Uniform discount renders the ordinary badge

- **Do**: set **all** purchasable variants of a product to the same ratio, save,
  view its card on the homepage and in a category listing.
- **Expect**: the existing percentage badge and the struck-through original
  price, exactly as before this feature. FR-022.

#### Scenario 16 — Differing variant discounts render the note, not a percentage

- **Do**: set variant 1 to 10% and variant 2 to 25% on the same product, save,
  view its card.
- **Expect**: the note **"تخفیف در برخی از تنوع‌ها"**, **no** percentage badge,
  and **no** struck-through price. FR-016, R-006. This is the scenario that
  would have shown a wrong 10% badge before 004's A-002 was fixed.

#### Scenario 17 — A sub-1% discount renders nothing

- **Do**: set a product to a discount too small to produce a percentage (the
  one warned about in scenario 11), save, view its card.
- **Expect**: **no** discount indicator of any kind — no badge, no note, no
  strike-through. The price shown equals the price charged at checkout. FR-019,
  FR-023.

#### Scenario 18 — JSON-LD still correct

- **Where**: the product detail page, view-source.
- **Expect**: `price` is the selling price × 10 in IRR, and where an original
  price exists `referencePrice` is that × 10. Unchanged by this feature, checked
  because the storefront surface changed around it.

## Part 3 — The gate

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

All four pass, **and** scenarios 8–18 have been walked in a real browser with
the results recorded, before the feature is reported done (constitution
principle V).

## Known non-goals for this walkthrough

- The product detail page is left alone — it already lists per-combination
  prices, so the partial-variation note is a listing-only addition (Assumptions).
- The AI assistant's tool output (`lib/ai/tools.ts`) reads product-level
  `compareAtPrice` and will read no badge for a partial-variation product. That
  is correct, not a defect: there is no single percentage to report.
