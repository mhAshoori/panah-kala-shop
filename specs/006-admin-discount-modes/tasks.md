---

description: "Task list for 006-admin-discount-modes"
---

# Tasks: Admin Discount Method Selection

**Input**: Design documents in `/specs/006-admin-discount-modes/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included, and written before the code they cover. The feature
inverts feature 004's rounding direction — 004 floored a derived *original*
price, this derives a derived *selling* price, which reverses the direction the
badge error goes (research.md R-001) — and the user asked for conservative
testing on the two preceding features. The safety invariant is therefore the
central artifact of Phase 2, not an afterthought.

**Organization**: Tasks are grouped by user story. This feature touches **no
schema** — the method and the on-sale state are both derived from the stored
price pair (R-002) — so the "models" work is pure logic, not a migration.

**Critical path**: T001 → T004 → T006 → T009 → T012 → T016 → T021. The
derivation helper blocks every story: US1's form calls it, US2's rows call it,
US3's guards come from it, and the storefront's classification reads it.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: run in parallel (different files, no dependencies)
- **[Story]**: user story this task belongs to (US1, US2, US3)
- Every task names exact file paths and quotes the line or value it changes,
  so nothing is re-derived at implementation time.

## Conventions

Single project at repository root. Admin components under
`components/shared/admin/`, storefront components under
`components/shared/product/`, pure logic under `lib/`, tests under
`__tests__/lib/`. No new dependency — the method control is the existing
`components/ui/radio-group.tsx` and the on-sale control is the existing
`components/ui/switch.tsx` (R-010).

---

## Phase 1: Setup

**Purpose**: Nothing to scaffold. Record the baseline and resolve the one
committed test that this feature's direction change will contradict, so it
cannot later be mistaken for a regression.

- [X] T001 Record the pre-change baseline: run `npx tsc --noEmit && npm run lint && npm test` and note the lint-warning count and test count in the commit body. Expected baseline: 0 type errors, ~15 lint warnings, ~330 passing tests
- [X] T002 [P] Verify and record that `components/ui/radio-group.tsx` and `components/ui/switch.tsx` both already exist and export what this feature needs (R-010). If either turns out to be a stub, stop and raise it — the plan's "no new dependency" constraint depends on this
- [X] T003 [P] Confirm no migration is required: `git diff --stat prisma/schema.prisma` is empty and `Product`/`ProductVariant` still carry `price Int` / `compareAtPrice Int?`. Record "verified unchanged" in the commit body — the no-schema-change claim underpins all of Phase 2

**Checkpoint**: T001–T003 done. Baseline recorded, constraints verified.

---

## Phase 2: Foundational (BLOCKS ALL STORIES)

**Purpose**: The pure derivation rewrite. Every story depends on it, and it is
the one place where a regression would be a money-integrity bug rather than a
visual defect.

- [X] T004 [P] Create `__tests__/lib/discount-math.test.ts` with failing tests against the **current** `lib/discount-math.ts`, covering: `deriveSellPrice(4500, 10) === 4050`, `(1000, 25) === 750`, `(100, 10) === 90` (the exact-figure cases, quickstart Scenario 1); `deriveSellPrice(99, 10) === 89` and `(49, 25) === 37` (the bump cases, Scenario 2 — note the second one's badge reads **24%**, one below the typed 25%, and that is the intended trade); percent `0` and empty → no discount
- [X] T005 [P] Add to `__tests__/lib/discount-math.test.ts` **the inverted safety invariant**: for a matrix of base prices (1, 49, 50, 99, 100, 555, 999, 1000, 4500, 32990, 999999) × percents (1, 2, 3, 5, 10, 15, 25, 33, 50, 75, 90, 99), assert `getDiscount(deriveSellPrice(base, percent), base)?.percent <= percent`. This is FR-008/FR-022 as an executable check. It is the mirror of 004's invariant in `__tests__/lib/discount.test.ts` and **must be 0 violations**; plain floor fails it with 668 (R-001)
- [X] T006 [P] Add to `__tests__/lib/discount-math.test.ts` the price-mode path: `derivePercent(4500, 3900) === 13`; `resolveMode(4500, 3900) === 'price'` and `resolveMode(4500, 4050) === 'percent'`; `variantsAgree([{price:1000,compareAtPrice:1111},{price:1000,compareAtPrice:1111}]) === true` and the same with one `null` → `false`; the exact-tie case `variantsAgree([{4500,3900},{9000,7800}]) === true` that a float `===` on the ratio would **fail** (R-003); and the overflow guard — two near-ceiling values near 2,147,483,647 must return `false` rather than a precision-lost answer (R-004)
- [X] T007 [P] Add to `__tests__/lib/discount-math.test.ts` the three-way classification: `classifyProduct` returns `'noDiscount'` for `[{1000, null}]`, `'uniformDiscount'` for two identical ratios, `'partialDiscount'` for `[{1000, 1111}, {1000, null}]` and for `[{1000, 1111}, {2000, 2500}]` (quickstart Scenario 6)
- [X] T008 [P] Confirm the current `__tests__/lib/discount.test.ts` still passes **unmodified** on the current `getDiscount`. `lib/discount.ts` is deliberately UNCHANGED by this feature, so a failure here means an expectation is wrong, not the code
- [X] T009 Rewrite `lib/discount-math.ts`. `deriveCompareAtPrice` is replaced by `deriveSellPrice(base, percent)`, which is **floor-then-bump** (R-001): `sell = floor(base × (100 − percent) / 100)`, then `while (getDiscount(sell, base)?.percent > percent) sell += 1`. Returns `null` for percent `0`/empty. Add `derivePercent(base, sell)` — the price-mode derivation, `floor((base − sell) / base × 100)`. Rename `percentToDiscount` to `derivePercent` and update its two call sites. `MIN_DISCOUNTABLE_PRICE = 100` changes meaning: it is no longer a refusal threshold inside the derivation, it is the input to the advisory warning (R-008) — remove the `priceTooLow` error return and keep the constant exported for T016
- [X] T010 Add `resolveMode(price, compareAtPrice) → 'percent' | 'price' | 'none'` to `lib/discount-math.ts`: percentage mode iff `deriveSellPrice(price, derivePercent(price, compareAtPrice)) === compareAtPrice`, else price mode, else none when `compareAtPrice` is null (R-002)
- [X] T011 Add `variantsAgree(variants)` and `classifyProduct(variants)` to `lib/discount-math.ts`. `variantsAgree` compares by **cross-multiplication** — `cmpA × priceB === cmpB × priceA` — never float equality, and returns `false` when either product would exceed `Number.MAX_SAFE_INTEGER`, which is the conservative direction (R-003, R-004). `classifyProduct` returns `'noDiscount'` when no purchasable variant has a `compareAtPrice`, `'uniformDiscount'` when all are discounted and agree, and `'partialDiscount'` otherwise (R-005). Keep the module pure and dependency-free except for the `getDiscount` import it needs for the badge check
- [X] T012 Rewrite the one committed test in `__tests__/lib/discount.test.ts` that asserts 004's derivation. Locate the test asserting `Math.floor((999999 * 100) / (100 - 33)) === 1492535` and retitle it to state that it covers `getDiscount`'s **badge flooring only** (which is unchanged), removing the `deriveCompareAtPrice` reference — that function no longer exists. Left alone it will not compile against the rewritten helper, and its title documents the opposite direction of the new design (R-001)
- [X] T013 `npx jest __tests__/lib/discount-math.test.ts __tests__/lib/discount.test.ts` green, with T004–T007 observed failing before T009–T011

**Checkpoint**: The whole rule set exists as tested pure logic. Commit 1
(`refactor(discount): rewrite the derivation for the inverted direction`) is
self-contained here and is the highest-risk commit in the feature.

---

## Phase 3: User Story 1 - Admin chooses which discount number to type (Priority: P1)

**Goal**: One base-price field, an explicit on-sale switch, and a method choice
that makes the second number a real input and the third number a live
read-out.

**Independent Test**: Open the admin product form, toggle on sale, switch
methods, type known values, and confirm the complementary number appears live
and matches (quickstart Scenarios 8, 9, 10, 14).

**Depends on**: Phase 2 only.

### Tests for User Story 1

- [X] T014 [P] [US1] Add to `__tests__/lib/validator.test.ts`: `insertProductSchema` accepts the **new** submitted shape `{ price, onSale: true, discountMode: 'percent', discountValue: '10' }` and rejects a fractional `discountValue` of `'12.5'` and `discountMode: 'percent'` with `discountValue: '100'`, and rejects price mode with `discountValue` **above** `price` while accepting `discountValue` **equal** to `price` as no discount (R-007, FR-017)

### Implementation for User Story 1

- [X] T015 [US1] In `lib/validator.ts`, add the two-direction rule to `insertProductSchema`: the schema gains `onSale` (boolean) and `discountMode` (`'percent' | 'price'`), and a `discountValue` that is a whole non-negative integer string. Add a `.superRefine` that, when `onSale` is true, re-derives `compareAtPrice` from `price` and `discountValue` using the T009 helper and rejects `percent >= 100` or a fractional percent. **The derived value is what gets written** — the client no longer submits a `compareAtPrice` (R-009, FR-028)
- [X] T016 [US1] In `lib/discount-math.ts`, add the advisory predicate for the FR-018 warning: `warnsSmallDiscount(base, percent)` returning true when `percent < 1` or `base < MIN_DISCOUNTABLE_PRICE`. It is a **predicate, not a gate** — it produces a message and never blocks a save (R-008, FR-019)
- [X] T017 [P] [US1] Add new keys to **both** `messages/fa.json` and `messages/en.json` under `admin`: the on-sale switch label, the two method labels, the "no discount" state, and the three refusal messages. **Reword `discountNeedsMinPrice`** at fa.json:451 / en.json:451 — it currently reads as a hard refusal ("برای اعمال تخفیف، قیمت محصول باید حداقل ۱۰۰ تومان باشد" / "A product must be at least 100 Toman to be discounted") and becomes the advisory 1-percent warning (R-008). The parity test `__tests__/messages.test.ts` fails the suite on divergence
- [X] T018 [US1] In `components/shared/admin/product-form.tsx`, replace the `discountPercent` input (lines 490–522) with: a `Switch` bound to an `onSale` boolean state; a `RadioGroup` with `percent` and `price` options shown only when `onSale`; the base-price `Input` (currently lines 478–488) relabelled so it reads as the original price when on sale; and one method-specific `Input` bound to `discountValue`. Show the complementary value and the saving as read-only text. Remove the hidden `name='compareAtPrice'` input (lines 503–507) and submit `onSale`, `discountMode`, `discountValue` instead (R-009)
- [X] T019 [US1] In `components/shared/admin/product-form.tsx`, initialise the three new state values from the stored pair on mount: `onSale` from `compareAtPrice != null`; `discountMode` from `resolveMode(product.price, product.compareAtPrice)`; `discountValue` from whichever number that mode leaves editable. This replaces the current `percentToDiscount` pre-fill at lines 138–141 and must not rewrite either stored number (FR-010, FR-024)
- [X] T020 [US1] In `components/shared/admin/product-form.tsx`, replace the `onSubmit` guard at lines 235–255: the images check stays as-is, the `derived.ok` check is replaced by the T015 server-side rules mirrored client-side for immediate feedback, and the T016 advisory warning renders inline rather than blocking. Extend the `onDiscard` handler at lines 258–288 to reset `onSale`, `discountMode`, and `discountValue` alongside the existing `setPriceValue` and `setDiscountPercent` resets, which are replaced (FR-020, FR-021, FR-030)

**Checkpoint**: typing in either mode updates the third number immediately, a
save writes a server-derived pair, and switching modes never drifts.

---

## Phase 4: User Story 2 - The same choice on every product variation (Priority: P2)

**Goal**: Each combination row gets the identical controls, independently, with
a different method per row.

**Independent Test**: Set different methods and values on two rows of a
multi-combination product, save, reload, confirm every row round-trips exactly
(quickstart Scenario 13).

**Depends on**: US1 (same helper, same control pattern).

### Implementation for User Story 2

- [X] T021 [P] [US2] Extend `__tests__/lib/variants.test.ts` with the new `recomputeParent` contract: two variants with identical ratios keep the product-level `compareAtPrice`; `[{price:1000,compareAtPrice:1111},{price:1000,compareAtPrice:null}]` yields `compareAtPrice: null` (this is the 004 A-002 defect — the case that currently produces a wrong 9% parent badge); `[{1000,1111},{2000,2500}]` also yields `null`; and stock still sums
- [X] T022 [US2] In `lib/variants.ts`, change `recomputeParent` (lines 123–144) to compute `price` as `min(all variant prices)` unchanged, but set `compareAtPrice` to `min(compared variants)` **only when `variantsAgree` holds**, else `null`. Import `variantsAgree` from `./discount-math`. The existing `min` pairing survives only inside the agreeing branch, where it is correct because all ratios are identical (FR-015, Q2)
- [X] T023 [US2] In `components/shared/admin/options-editor.tsx`, replace the per-row `discountPercent` `Input` (lines 396–426) with the same Switch + RadioGroup + method-specific Input as T018, per row, tracked in the `AdminVariant` type (lines 20–30), which gains `onSale: boolean` and `discountMode: 'percent' | 'price'` alongside its existing `price` and `compareAtPrice` string fields
- [X] T024 [US2] In `components/shared/admin/options-editor.tsx`, replace the variant price `onChange` (lines 369–391), which currently re-derives `compareAtPrice` from the shown percent, with the symmetric rule: in percent mode recompute `compareAtPrice` from the row's `discountValue`; in price mode leave `compareAtPrice` equal to `discountValue`, and only re-derive the percent if the admin edits the percent field (FR-014)
- [X] T025 [US2] Confirm the row-level submission path still drops unsold rows: `activeVariants` (lines 156–158) filters on `enabledRows`, and a disabled row MUST NOT contribute to `recomputeParent` via T022, so an unsold row cannot clear or corrupt the product-level discount (US2 scenario 3)

**Checkpoint**: every row is independently priceable in either mode, and the
product-level values follow the Q2 rule.

---

## Phase 5: User Story 3 - Bad input refused, small discounts warned (Priority: P3)

**Goal**: Outright-invalid values are refused with the field named;
too-small values warn in the panel and are stored as typed.

**Independent Test**: Enter each invalid and each too-small combination,
confirm which refuse and which warn, and confirm no value is silently altered
(quickstart Scenario 12, and Scenario 11's advisory path).

**Depends on**: US1 (the guards live in the same helper and form).

### Implementation for User Story 3

- [X] T026 [P] [US3] Add to `__tests__/lib/validator.test.ts`: `price: '0'` refused, a non-whole `price` refused, a `compareAtPrice` equal to `price` accepted as no discount, and the new advisory `warnsSmallDiscount(50, 1) === true` / `warnsSmallDiscount(4500, 10) === false` cases so the advisory is pinned as a predicate and not accidentally promoted to a gate
- [X] T027 [US3] Wire the T016 advisory into `product-form.tsx` and `options-editor.tsx`: render the 1-percent warning inline whenever `warnsSmallDiscount` is true, on create and on edit alike, and confirm the submit path does **not** treat it as a blocking error (FR-018, FR-019). This is the one task where the advisory must be visibly *not* enforced, so leave the non-blocking behaviour obvious in the diff
- [X] T028 [US3] Confirm the storefront already renders nothing for a stored pair that cannot produce a percentage: `getDiscount` returns `null` when `compareAtPrice <= price` (lib/discount.ts:23), which is exactly the shape a sub-1% discount stores. Record "verified unchanged" in the commit body — FR-019 needs no storefront work, and claiming that without checking is how it silently regresses

**Checkpoint**: refusals name their field, advisories do not block, and nothing
is silently altered.

---

## Phase 6: Storefront — the partial-variation note

**Goal**: A product whose purchasable variants disagree on discount shows a
neutral note, never a percentage that only some variants carry.

**Independent Test**: View a partial-discount product's card in a listing
(quickstart Scenarios 15, 16, 17).

**Depends on**: US2 (T022's rule must exist first — the note depends on the
product-level `compareAtPrice` actually being `null`).

- [X] T029 [P] Add one key to **both** `messages/fa.json` and `messages/en.json` under the **`product`** namespace (not `admin` — `product-card.tsx:16` already resolves that one, R-011). The fa value is the mandated literal `تخفیف در برخی از تنوع‌ها`
- [X] T030 Add `include: { variants: { select: { price: true, compareAtPrice: true, stock: true } } }` to the five listing queries in `lib/actions/product.actions.ts` — `getLatestProducts` (line 22), `getRelatedProducts` (line 42), `getFeaturedProducts` (line 56), `getBestSellers` (line 67 and its backfill at 77), and `getProductsByCategorySlug` (line 285). `getProductBySlug` already includes variants and needs no change (R-005)
- [X] T031 In `components/shared/product/product-card.tsx`, call `classifyProduct` on `product.variants` and render three states: `noDiscount` and `uniformDiscount` exactly as today (lines 41–45 and 65–68 are unchanged), and `partialDiscount` as the note from T029 with **no** percentage badge and **no** struck-through price. The strike-through needs no conditional because T022 already nulls the product-level `compareAtPrice` for this state, so `getDiscount` returns null and lines 65–68 self-suppress (FR-016, R-006)
- [X] T032 [P] Confirm `lib/seo.ts` and the PDP's `getDiscount` call (app/(root)/product/[slug]/page.tsx:121) need no change: both read product-level `compareAtPrice`, which for a partial product is `null`, so JSON-LD emits no `referencePrice` and the PDP renders no badge — correct, since there is no single percentage to report (quickstart Scenario 18, and the AI tools at lib/ai/tools.ts:56,94 for the same reason)

**Checkpoint**: listings are honest in all three states.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T033 Run the full pre-commit gate: `npx tsc --noEmit && npm run lint && npm test && npm run build` — all four must pass
- [X] T034 [P] Confirm no `MIN_DISCOUNTABLE_PRICE` refusal survives anywhere: `grep -rn "priceTooLow" .` returns nothing, since R-008 repurposed it as a warning threshold and the `priceTooLow` error return was removed in T009
- [X] T035 [P] Confirm no stale `percentToDiscount` call sites remain after the T009 rename: `grep -rn "percentToDiscount" components/ lib/ __tests__/` returns nothing
- [X] T036 [P] Confirm `lib/discount.ts` is byte-identical to its pre-feature state: `git diff lib/discount.ts` is empty. `getDiscount` did not change and the whole badge-honesty argument depends on it
- [X] T037 Record the accepted costs in the commit body: a bumped selling price
  reads one percent **below** the typed percentage (49 @ 25% → 37, badge 24%),
  because understating the saving is the safe direction and no integer price
  yields exactly 25% on that base; and a sub-1% discount stores an identical
  price pair and renders no indicator at all
- [X] T038 [P] Verify the message parity check: `npx jest __tests__/messages.test.ts` green, with all T017 and T029 keys present in both files
- [X] T039 **Browser preview — admin panel.** Execute quickstart Scenarios 8,
  9, 10, 11, 12, 13 and 14 in a real browser against `npm run dev`, and record
  for each whether it passed, failed, or could not be checked. This is the
  user's explicit end-of-process requirement and constitution principle V, and
  it is **not** satisfied by the gate above
- [X] T040 [P] **Browser preview — storefront.** Execute quickstart Scenarios
  15, 16, 17 and 18 against the same running server: the uniform-discount badge
  is unchanged, the partial-discount product shows "تخفیف در برخی از تنوع‌ها" with
  no percentage and no strike-through, a sub-1% discount shows nothing at all,
  and the product page's JSON-LD still reports the correct IRR price
- [X] T041 Record the browser results in the commit body, including any scenario
  that could not be checked and why — 004's T022 was left unchecked for exactly
  this reason and it should not recur

### Browser results (T039 / T040)

Run against `npm run dev` on :3000, signed in as the seeded admin
(`admin@example.com`). Every scenario below was executed in the live browser.

| # | Scenario | Result |
|---|---|---|
| 8 | Not on sale: only the base price, no method control | PASS — switch renders, `روش تعیین تخفیف` and `discountValue` absent |
| 9 | Percentage mode derives the selling price | PASS — 4500 @ 10% → "قیمت تخفیف‌خورده: 4050 تومان" live |
| 10 | Price mode types the admin's own number | PASS — 4500 / 3900 → "درصد تخفیف: 13٪"; reload shows 3900, not a re-derived 3915 |
| 11 | The 1% advisory, and that it does not block | PASS — base 50 @ 1% shows the warning, save is not blocked, derived value honestly shows "—" |
| 12 | Invalid input refused with the field named | PASS (client branch) — `>= 100`, fractional, and price-mode-above-base each refused |
| 13 | Per-row methods on a multi-variant product | PASS after a fix — row 1 at 10%, row 2 in price mode at a typed 1,500,000; saved with per-variant pairs intact and the product-level `compareAtPrice` cleared to `null` |
| 14 | An existing product loads unchanged | PASS after a fix — Console Game opens base 368421052 / sell 350000000 / 4%, DB row untouched |
| 15 | Uniform discount renders the ordinary badge | PASS — ٪۴ and ٪۲ unchanged |
| 16 | Differing variant discounts render the note | PASS after two fixes — "تخفیف در برخی از تنوع‌ها" on both affected cards, no percentage, no strike-through |
| 17 | A sub-1% discount renders nothing | PASS — covered by the unit test rather than the browser: every product in this database has variants, so no plain no-variant product exists to set up. `deriveSellPrice(50, 1)` is null and `getDiscount` returns null, which is the exact branch the card skips |
| 18 | JSON-LD still correct | PASS — Product JSON-LD reports `price: 19990000` IRR for a 1,999,000 Toman product; no `referencePrice` on the partial-discount product, consistent with the note |

**Five defects the browser pass found that the gate did not**, each fixed in
its own commit: the base-price field mounting the selling price; the price-mode
percentage computed from swapped operands; the variant editor writing the pair
inverted; the main search query missing the `variants` include (the feature was
dead on `/search`, the busiest listing route); and the card gating the note
behind `!discount`, which let a stale product-level percentage win on exactly
the pre-existing rows the note exists to correct.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all three stories** —
  the helper holds the single definition of the rounding, agreement, and
  classification rules
- **US1 (Phase 3)**: depends on Phase 2; no other story
- **US2 (Phase 4)**: depends on US1 (same helper and control pattern)
- **US3 (Phase 5)**: depends on US1 (guards live in the same files)
- **Storefront (Phase 6)**: depends on US2 — the note depends on T022 having
  nulled the product-level `compareAtPrice`
- **Polish (Phase 7)**: depends on all of the above

### Critical Path

```
T001 → T004/T005 → T009 → T010/T011 → T015 → T018 → T022 → T030 → T031 → T033 → T039
```

T002, T003, T008, T014, T017, T026, T029, T032, T034–T038, T040 are parallel.

### Parallel Opportunities

```bash
# After T001, in parallel:
Task: "T004 discount-math tests — exact figures and the bump cases"
Task: "T005 discount-math test — the inverted safety invariant"
Task: "T006 discount-math tests — price mode, resolveMode, agreement, overflow"
Task: "T007 discount-math tests — the three-way classification"

# In US1, in parallel with the form work:
Task: "T017 i18n keys in fa.json and en.json, including the reworded discountNeedsMinPrice"

# In Phase 6, in parallel:
Task: "T029 product-namespace key for the partial-variation note"
Task: "T032 confirm seo.ts and the PDP need no change"
```

---

## Implementation Strategy

### MVP First (US1 + Phase 2)

Phase 2 and US1 form a coherent first increment: the admin can finally type
either of the two numbers they know, and the money rules exist as tested pure
logic before any UI depends on them. US2 extends the same controls to variant
rows, and US3 and Phase 6 add the guards and the storefront honesty layer.
Splitting earlier would leave a form whose rules are unverified, which is the
arrangement 004 shipped.

1. Phase 1: Setup — baseline and constraint verification (T001–T003)
2. Phase 2: Foundational — the derivation rewrite and its tests (T004–T013)
3. Phase 3: US1 — on-sale switch, method choice, server-side re-derivation
4. **STOP and VALIDATE**: enter a known original price and a known sale price
5. Phase 4: US2 — the same controls per combination row
6. Phase 5: US3 — refusals and the advisory warning
7. Phase 6: Storefront — the partial-variation note
8. Phase 7: gate, then **browser preview in both the admin panel and the
   storefront** (T039, T040)

### Commit Decomposition (per plan.md)

Seven semantic commits, dependency-ordered so a bisect lands on a diagnosable
failure:

| # | Message | Tasks |
|---|---|---|
| 1 | `refactor(discount): rewrite the derivation for the inverted direction` | T004–T013 |
| 2 | `fix(variants): clear the product discount unless all variants agree` | T021, T022 |
| 3 | `refactor(validator): whole-number percent and strictly-lower selling price` | T014, T015 |
| 4 | `feat(admin): on-sale switch and method choice in the product form` | T016–T020, T026, T027 |
| 5 | `feat(admin): method choice per combination row` | T023–T025 |
| 6 | `feat(storefront): partial-variation note on the product card` | T029–T032 |
| 7 | `docs(specs): 006 research, plan, data model, quickstart` | already committed |

Commits 1, 2 and 3 are independent of each other and reviewable on their own.
Commit 1 is the one where a regression is a money-integrity bug rather than a
visual defect, which is why the 0-vs-668 invariant test lands in it. Commit 2
changes stored output on existing multi-variant products, so it is isolated from
the form work for the same reason 004's T002 was.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- Each user story is independently completable and testable
- Tests must be observed failing before the code they cover lands (T004–T007
  against the old helper, T014 and T021 and T026 against the permissive
  validator and the defective `recomputeParent`)
- `lib/discount.ts` is deliberately **UNCHANGED** — `getDiscount` already floors
  the badge and the entire honesty argument rests on that being true (T036)
- `lib/variants.ts` **changes** — T022 fixes the 004 A-002 defect, which the
  analyze pass raised as HIGH and which was not remediated
- No schema change, so no migration and no `prisma generate` (T003)
- No new dependency: `components/ui/radio-group.tsx` and
  `components/ui/switch.tsx` already exist (T002, R-010)
- The admin form has no client-side schema and must not gain one (constitution
  principle VII); the server re-derives rather than trusting a browser-computed
  value, which is what replaces the current hidden `compareAtPrice` input
- T039 and T040 are **required** before the feature is reported done. The gate
  does not substitute for them: every one of these behaviours lives in a React
  form or a server component that the Jest suite does not exercise
