# Quickstart Validation Guide: Product Required Fields & Unified Discount Input

**Feature**: 004-product-required-discount | **Date**: 2026-09-25

Runnable checks that prove required fields are enforced and the discount
field behaves. See [data-model.md](data-model.md) for the rules and
[research.md](research.md) for why the two discount rules exist.

---

## Prerequisites

- Dev server running: `npm run dev` (port 3000).
- Database reachable — **dev uses Neon, which needs a working VPN/proxy**
  from Iran; a `EAI_AGAIN` DNS error means the network, not the code.
- Sign in as the seeded admin (`admin@example.com` / `123456`).

```bash
git status --short
```

---

## Scenario 1 — Automated gate

```bash
npx tsc --noEmit && npm run lint && npm test
```

**Expected**: type check clean; lint clean apart from the ~15 pre-existing
`no-unused-vars` / `no-location-assign` warnings; all Jest suites pass.

**Fails if**: `__tests__/lib/discount.test.ts` still asserts half-up — that
test must be rewritten to floor as part of this feature (see research.md
R-002). Its current title is `uses half-up rounding for the derived
price-before-discount`.

---

## Scenario 2 — Money inputs reject fractional Toman

1. Open `/admin/products` → **Add product**.
2. In the price field type `100.5`.
3. Try to save.

**Expected**: the save is refused. The field's `step` is now `1`, so the
browser's own step validation blocks it before submission.

**Why it matters**: with the old `step='0.01'` this passed the browser and
failed server-side on the zod `/^\d+$/` check, producing a confusing toast
about a field the admin believed was valid.

---

## Scenario 3 — Mandatory fields block submission

On the Add-product form, submit with each of these empty in turn:

| Field to empty | Expected |
|---|---|
| Product name | submit blocked by the browser |
| نام محصول | blocked |
| Main category (no selection) | blocked |
| Sub category | blocked |
| برند | blocked |
| Price | blocked |
| Stock | blocked |
| Description | blocked |
| توضیحات | blocked |
| **Images** | **refused server-side with a toast naming images** — this is the one field with no browser-level gate, so it is the only case that reaches the server |

**Expected for all ten**: no product is created, and the submission is
refused. For the image case the message must identify the image field.

---

## Scenario 4 — Optional fields never block

1. Fill only the mandatory fields, leaving dimensions, weight and banner
   empty.
2. Save.

**Expected**: the product is created, and its storefront detail page shows
no dimensions or weight section (FR-007).

---

## Scenario 5 — Blank stock is refused, not silently zero

1. Clear the stock field and submit.

**Expected**: refused. Before this change `Number('')` became `0`, so a blank
stock quietly produced a product that could never be sold.

**Confirm the boundary too**: stock `0` is accepted (a product may exist
out of stock); stock `-1` is refused.

---

## Scenario 6 — Price must be positive

1. Try to save with price `0`.

**Expected**: refused with a field-specific message. Zero and negative
prices are not sellable (FR-005).

---

## Scenario 7 — The discount field derives both prices

1. Set price `1000`, discount `10`.

**Expected**:
- the derived price-before-discount shows `1111` (floor of 1111.11)
- the sale price stays `1000`
- the storefront badge for that product shows `9`, never more

2. Change the discount to `25`.

**Expected**: derived price-before-discount updates immediately to `1333`
(floor of 1333.33), without saving.

3. Clear the discount field.

**Expected**: price-before-discount clears; the product saves with no
discount.

---

## Scenario 8 — Discount boundaries

| Input | Expected |
|---|---|
| discount `0` | saved as no discount, no badge |
| discount `99`, price `1000` | derived price-before-discount `100000` |
| discount `100` | **refused** — would divide by zero |
| discount `120` | **refused** — yields a negative base |
| price `1000`, discount `10`, then raise price to `2000` | discount preserved; price-before-discount recomputed to `2222`; badge still `9` |

---

## Scenario 9 — The 100 Toman floor

1. Set price `50` and try to enter a discount of `10`.

**Expected**: refused with a message explaining that discounts need a price
of at least 100 Toman.

**Why**: at price 50 a 10% discount needs a price-before-discount of 55.55,
which cannot be stored as a whole Toman — the badge would either vanish or
overstate. Both outcomes mislead the shopper.

2. Set price `100` and enter `1`.

**Expected**: accepted; derived price-before-discount `101`; the badge shows
`0`, so no badge is rendered — this is the accepted cost of the floor, and
the product simply has no visible discount.

---

## Scenario 10 — Editing an existing discounted product

1. Find a product with a discount (or set one via the admin form first).
2. Reopen it for editing.

**Expected**: the discount field is pre-filled with the percentage derived
from the stored pair, and the two prices are shown as read-only values. The
field is the only editable one of the three.

---

## Scenario 11 — Variant discounts are independent

1. Open a product that has variants.
2. Set a different discount percentage on two different variants.

**Expected**:
- each variant stores its own price and price-before-discount
- neither variant's discount changes the other
- the product-level discount field does **not** propagate — parent values
  are recomputed as min-price / min-compareAt, not copied
- a variant whose price-before-discount is not greater than its price is
  refused (this refine did not exist before)

---

## Scenario 12 — Storefront consistency

1. Save a product with a discount, then open it on the storefront.

**Expected**: the displayed sale price, the struck-through
price-before-discount, and the badge all match the values the admin set. The
badge percentage equals `floor((before − price) / before × 100)` and is
never higher than the percentage typed.

---

## Scenario 13 — Bilingual strings

Switch the site language between fa and en in the admin header.

**Expected**: every new label (discount field, derived price hint, floor
error) appears in both languages, with no raw key visible. A missing key in
either file fails `__tests__/messages.test.ts`.

---

## Scenario 14 — Admin list still works

1. Open `/admin/products`.

**Expected**: the list renders, prices show as whole Toman with no decimals,
and products with a discount show a badge consistent with their detail page.

---

## Full pre-commit gate

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

All four must pass. `npm run build` is the final gate before any commit.
