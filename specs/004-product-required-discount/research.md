# Phase 0 Research: Product Required Fields & Unified Discount Input

**Feature**: 004-product-required-discount
**Date**: 2026-09-25

Every claim below was verified against the code as it exists *after*
005-money-int-migration. That matters: the integer-money change already
removed the Decimal stringification, already made `couponDiscount` numeric,
and already tightened `currency` — so several things this feature would
normally need to plan are already done. One claim in the existing
`__tests__/lib/discount.test.ts` now actively contradicts the agreed design
and is recorded here as work to do, not work already done.

---

## R-001: The two discount rules solve different problems

**Decision**: derive `compareAtPrice` by rounding **DOWN**, and refuse
discounts below 100 Toman.

**Rationale**: these are not two versions of one rule. Brute-forcing
price 1–5000 against percentages 1–99:

| Derivation | Cases where the badge **overstates** the typed percent |
|---|---|
| half-up | **46** |
| floor | **0** |

So floor derivation alone is what actually guarantees "never overstates" —
the guarantee FR-013 makes. That is the whole justification for choosing
floor over half-up, and it is a stronger result than the "understatement is
acceptable" argument that decided the direction during planning.

The 100 Toman floor solves a *different* problem that floor derivation does
not touch. A typed discount can round to **nothing at all**: with floor
derivation, 204 of the price-1..300 × 1/2/3/5/10% combinations produce
`compareAtPrice <= price`, so `getDiscount` returns `null` and the badge
silently disappears. Minimum price that still yields a real badge:

| Typed discount | Price must be at least |
|---|---|
| 1% | 99 |
| 5% | 19 |
| 10% | 9 |
| 25% | 3 |
| 50% | 1 |

A flat 100 Toman floor is above every one of those thresholds, so it
guarantees the badge never vanishes for any percentage the admin can type.
The floor is derived from the arithmetic, not chosen for looking sensible.

**Alternatives considered**:
- *Floor derivation only, no price floor* — kills overstatement but leaves
  204 silent-vanish cases. Rejected: an admin who types 10% and sees no
  badge has no way to tell the cause.
- *Refuse out-of-range discounts instead of a price floor* — stricter and
  needs a per-percentage rule; the flat floor subsumes it at a fraction of
  the complexity. Rejected during clarification.
- *Keep half-up and accept overstatement* — directly violates FR-013. Rejected.

**Verified**: over statement count is 0 across all 50,000 floor-derivation
pairs, and no typed discount below the 100 floor can vanish.

---

## R-002: A live test now contradicts the agreed design

**Decision**: rewrite `__tests__/lib/discount.test.ts:60-64` from
half-up to floor.

**Rationale**: that test is titled *"uses half-up rounding for the derived
price-before-discount"* and asserts
`Math.round(999999 * 100 / 67) === 1492536`. R-001 chose floor. Left alone,
the test does not merely go stale — it would fail the moment the
derivation is implemented, and its title documents the *opposite* of the
agreed rule, so a future reader would reasonably conclude the design had
regressed. It must change as part of this feature, not after it.

Note the irony worth recording: half-up was chosen during 005 planning
*because* it kept a badge honest at high prices (999999 at 33% → 33 rather
than 32). That reasoning was sound **for a badge that can overstate**;
floor derivation is now preferred because it makes overstatement
impossible, accepting understatement as the price.

---

## R-003: Required fields are already marked — the gap is elsewhere

**Decision**: treat FR-001/FR-002 as *mostly satisfied*; the real work is
FR-003 (server boundary) plus the gaps below.

**Rationale**: `components/shared/admin/product-form.tsx` already carries
HTML `required` on `name` (289), `nameFa` (300), `slug` (313), the main
category select (344), the subcategory select (367), `brand` (408),
`price` (423), `stock` (449), `description` (624) and `descriptionFa` (635).
`subSubCategory` (387) is correctly optional, as are the four dimensions and
the banner.

What is actually missing:

1. **Images have no client-side enforcement at all.** The image list is a
   hidden `name='images'` JSON field (256) fed by `addImage` state (242-256,
   510-566). Nothing in the form stops a submit with zero images; only
   `images: z.array(z.string()).min(1)` (validator 34) stops it, and that
   surfaces as a toast, not a field error. FR-002's "identify the offending
   field" is unmet for the one mandatory field most likely to be forgotten.
2. **Server-boundary gaps.** `stock: z.coerce.number()` (33) has **no**
   `.int()` and **no** `.min(0)`, unlike the variant path (97). `Number('')`
   is `0`, so a blank stock silently becomes zero rather than being
   refused — which contradicts FR-006.
3. **No `price > 0` rule.** `currency` is `/^\d+$/` with a max
   (validator 10-13), so `price: '0'` passes. FR-005 requires a positive
   amount. Nothing enforces it.
4. **Category errors are English-only strings** thrown from
   `resolveCategoryChain` (`product.actions.ts:705-731`: "Main category is
   required", "Subcategory is required") rather than zod messages, so they
   do not flow through the bilingual `withActionMessage`/`formatError` path
   the constitution requires.

**Note on client validation**: the form has **no** zod, no react-hook-form
and no client-side schema — `useActionState` (131) plus a plain
`<form action={formAction}>` (254), with only a dirty-tracker on
`input`/`change` (174-194). Reusing zod on the client is therefore a new
dependency pattern for this form, which the constitution's principle VII
argues against; HTML `required` plus server-side zod is the existing idiom
and stays.

---

## R-004: No schema migration, and one real gotcha

**Decision**: 004 makes **no** Prisma change.

**Rationale**: the model already has everything required — `price`,
optional `compareAtPrice`, `stock`, `images`, and per-variant `price` /
`compareAtPrice`. Only the *form* changes, from two editable price fields to
one editable percentage with two derived read-only values.

**The gotcha**: every money input still carries `step='0.01'`
(`product-form.tsx` 419, 434; `options-editor.tsx` 365, 376). With whole
Toman, a typed `0.5` passes HTML validation and then dies on the zod
`/^\d+$/` check with a confusing message. The step must become `1` as part
of this work, or the form will keep inviting input the server refuses.

---

## R-005: Variant discounts need the same floor rule, and the same refine

**Decision**: apply FR-008/FR-009/FR-013/FR-015 to the variant editor
too, and add the missing cross-field refine.

**Rationale**: `components/shared/admin/options-editor.tsx` renders separate
`price` (363-371) and `compareAtPrice` (373-384) columns with no
percent concept at all. Two gaps:

- `variantInputSchema` (validator 78-99) has **no** `compareAtPrice > price`
  refine, though the parent `insertProductSchema` has one (53-57). A
  variant can currently store a "discount" that is not a discount.
- Parent price/compareAtPrice are **overwritten** by `recomputeParent`
  (`lib/variants.ts:123-144`, called at `product.actions.ts:691`) whenever
  variants exist: parent price = min, parent compareAtPrice = min of
  non-null. So a product-level percent field is only meaningful for
  products with no variants, and the plan must not imply otherwise.

---

## R-006: i18n needs four new keys in both files

**Decision**: add the new keys to `messages/fa.json` **and**
`messages/en.json`.

**Rationale**: the parity test `__tests__/messages.test.ts` fails the suite
on divergence (constitution IV, non-negotiable). Existing related keys:
`admin.price` (442), `admin.compareAtPrice` (443),
`admin.compareAtPriceHint` (444, "خالی = بدون تخفیف" / "Empty = no discount"),
`admin.stock` (445), storefront `discountOff` (116) and `discountSave` (117).
There is **no** existing key for a discount percentage — a new one is
required, and `compareAtPriceHint` becomes misleading once the field is
read-only and derived.

**Keys to add**: the discount-percent field label, a hint describing it
(replacing `compareAtPriceHint`'s role), a label for the derived
price-before-discount, and a validation message for the 100 Toman floor.
Both files, same key paths.

---

## R-007: Error surfacing stays as toasts

**Decision**: keep `formatError` → `toast.error`; do not add inline field
errors.

**Rationale**: `product-form.tsx:236-238` already surfaces
`state.message` via toast, and `formatError` (`lib/utils.ts:21-50`) renders
a ZodError as `"path: message"` — so a missing required field already
produces a message naming the field. FR-002's requirement that submission
"is refused and the field is flagged" is satisfied by HTML `required`
blocking the submit plus a toast naming the field. Building an inline-error
system would be a new pattern for one form, against principle VII.

**Exception**: the images case (R-003 item 1) has no client-side gate at
all, so it needs a deliberate decision at implementation time — either an
HTML-level gate on submit or accepting the toast as sufficient.
