---

description: "Task list for 004-product-required-discount"
---

# Tasks: Product Required Fields & Unified Discount Input

**Input**: Design documents in `/specs/004-product-required-discount/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included. The spec makes two testable guarantees that are not
otherwise checkable — the floor derivation (FR-012/FR-013) and the tightened
server boundary (FR-003/FR-005/FR-006) — and the user asked for conservative
testing on the preceding feature. Tests are written before the code they cover
and must be observed failing.

**Organization**: Tasks are grouped by user story. This feature touches **no
schema** — money is already `Int` from 005-money-int-migration — so the
"models" work is a pure derivation helper, not a migration.

**Critical path**: T001 → T002 → T003 → T004 → T006. The derivation helper
blocks both the form work and the tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: run in parallel (different files, no dependencies)
- **[Story]**: user story this task belongs to (US1, US2, US3)
- Every task names exact file paths and quotes the line or value it changes,
  so nothing is re-derived at implementation time.

## Conventions

Single project at repository root. Admin components under
`components/shared/admin/`, pure logic under `lib/`, tests under
`__tests__/lib/`. No new dependency — the admin form deliberately has no
client-side schema (no zod, no react-hook-form) and should not gain one.

---

## Phase 1: Setup

**Purpose**: Nothing to scaffold. The project, schema and dependencies already
exist. This phase exists only to record the verification baseline and to fix
the one committed test that contradicts the agreed design, so it cannot be
mistaken for a regression later.

- [ ] T001 Record the pre-change baseline: run `npx tsc --noEmit && npm run lint && npm test` and note the lint-warning count and test count in the commit body — the expected baseline is 0 type errors, ~15 lint warnings, 322 passing tests
- [ ] T002 Rewrite the test at `__tests__/lib/discount.test.ts:60-64`, currently titled `uses half-up rounding for the derived price-before-discount` and asserting `Math.round((999999 * 100) / (100 - 33)) === 1492536` with `getDiscount(999999, 1492536)?.percent === 33`, to assert **floor** instead: `Math.floor((999999 * 100) / (100 - 33)) === 1492535` and `getDiscount(999999, 1492535)?.percent === 32`, retitling it to state the rule. This is its own commit (research.md R-002) because it contradicts committed behaviour — without the rewrite, the implementation below will appear to break a passing test
- [ ] T003 Confirm the rewritten test still passes on the **unmodified** `getDiscount` — `getDiscount` is unchanged by this feature, so a failure here means the expectation is wrong, not the code

**Checkpoint**: T001–T003 done. Baseline recorded, contradictory test resolved.

---

## Phase 2: Foundational (BLOCKS ALL STORIES)

**Purpose**: The pure derivation helper. Both form components and the test
suite depend on it, and it is the only place the rounding and floor rules
live.

- [ ] T004 [P] Create `__tests__/lib/discount-math.test.ts` with failing tests against a not-yet-existing `lib/discount-math.ts`, covering: `deriveCompareAtPrice(1000, 10) === 1111`, `(1000, 25) === 1333`, `(2000, 10) === 2222`; percent `0` and empty → `null`; percent `100` and `120` rejected; price `50` with percent `10` rejected by the 100 Toman floor while `100` with `1` is accepted; a 99% discount on a price above **21,473,836** Toman rejected as exceeding the 2,147,483,647 ceiling
- [ ] T005 [P] Add to `__tests__/lib/discount-math.test.ts` the **safety invariant**: for a matrix of prices (e.g. 100, 555, 999, 32990, 999999) × percents (1, 5, 10, 15, 33, 50, 75, 99), recompute the badge with `getDiscount(price, deriveCompareAtPrice(price, percent))` and assert `badge.percent <= percent`. This is the guarantee FR-013 makes, stated as an executable check rather than prose
- [ ] T006 Implement `lib/discount-math.ts` exporting `deriveCompareAtPrice(price: number, percent: number | null | undefined): { compareAtPrice: number | null } | { error: string }` — returns `null` for percent `0`/empty; floors `Math.floor(price * 100 / (100 - percent))`; refuses percent `>= 100`, price `< 100` when a discount is requested, and any derived value above `2_147_483_647`. Keep it pure and dependency-free, following the `lib/category-visibility.ts` precedent
- [ ] T007 [P] Add a `percentToDiscount` inverse helper in `lib/discount-math.ts` for pre-filling the edit form: given a stored `price` and `compareAtPrice`, return the percentage to show, i.e. `Math.floor(((compareAtPrice - price) / compareAtPrice) * 100)` — the same expression `getDiscount` already uses, so the form and storefront cannot disagree

**Checkpoint**: `npx jest __tests__/lib/discount-math.test.ts` green. T004/T005
were observed failing before T006.

---

## Phase 3: User Story 1 - Required product fields are enforced (Priority: P1)

**Goal**: No product can be created or modified with a mandatory field empty,
through the browser or a direct request.

**Independent Test**: Submit the admin form with each mandatory field
individually empty and confirm refusal each time, then confirm a fully filled
form still saves (quickstart.md Scenarios 3, 4, 5, 6).

**Note**: most of this is already in place — `product-form.tsx` carries HTML
`required` on name (289), nameFa (300), slug (313), main category (344), sub
category (367), brand (408), price (423), stock (449), description (624) and
descriptionFa (635). The real gaps are the server boundary and images.

### Tests for User Story 1

- [ ] T008 [P] [US1] Add to `__tests__/lib/validator.test.ts`: `insertProductSchema` rejects `stock: ''` (currently `Number('') === 0` passes), `stock: -1`, `stock: '1.5'`, and `price: '0'`; accepts `stock: '0'` and `price: '1'`
- [ ] T009 [P] [US1] Add to `__tests__/lib/validator.test.ts`: `variantInputSchema` rejects a variant whose `compareAtPrice` is less than or equal to its `price`, matching the refine the parent schema already has

### Implementation for User Story 1

- [ ] T010 [US1] In `lib/validator.ts:33`, change `stock: z.coerce.number()` to a non-negative integer rule — `.int()` and `.min(0)` — matching the variant path at line 97. Note the coercion currently turns a blank field into `0`, which is why FR-006 requires this
- [ ] T011 [US1] In `lib/validator.ts:40`, add a positivity rule to `price` so `price: '0'` is refused (FR-005). `currency` at lines 10-13 is digits-plus-maximum only, so zero currently passes
- [ ] T012 [US1] Add the `compareAtPrice > price` refine to `variantInputSchema` in `lib/validator.ts` (~lines 78-99), mirroring the parent refine at lines 53-57, so a variant cannot store a "discount" that is not a discount
- [ ] T013 [P] [US1] Change `step='0.01'` to `step='1'` on the price and compareAtPrice inputs at `components/shared/admin/product-form.tsx:419,434` and `components/shared/admin/options-editor.tsx:365,376`. With whole Toman, `step='0.01'` invites input like `0.5` that passes the browser and then fails the zod `/^\d+$/` check with a confusing message
- [ ] T014 [US1] Decide and implement the images gate in `components/shared/admin/product-form.tsx`: images are the one mandatory field with no client-side enforcement — the list is a hidden `name='images'` JSON field at line 256 fed by state at 242-256, so an empty list currently reaches the server and is refused there by `images: z.array(z.string()).min(1)` (`lib/validator.ts:34`) with only a toast. Either block the submit in the form or accept the toast as sufficient (research.md R-007); record which was chosen and why in the commit body

**Checkpoint**: `npm test` green. The form and the server both refuse every
empty mandatory field.

---

## Phase 4: User Story 2 - One discount field, two derived prices (Priority: P2)

**Goal**: The admin types a percentage; the form shows the price-before-discount
and badge it produces, live.

**Independent Test**: Enter percentages on a product, watch the derived value
update without saving, then confirm the storefront badge matches
(quickstart.md Scenarios 7, 8, 9, 10, 12).

**Depends on**: US1 (shared form file — same-file tasks run sequentially)

### Implementation for User Story 2

- [ ] T015 [US2] In `components/shared/admin/product-form.tsx`, replace the `compareAtPrice` input (lines 430-438) with a single editable discount-percentage field, and render the derived price-before-discount as a **read-only** display beside it. On load, pre-fill the percentage with `percentToDiscount(product.price, product.compareAtPrice)` so an existing discount is visible. The submitted field is the percentage; the derived value is written to the hidden `compareAtPrice` input the server already reads
- [ ] T016 [US2] Recompute the derived value on every change to the price or percentage fields, using `deriveCompareAtPrice` from `lib/discount-math.ts`; show the refusal message inline when it returns an error (percent `>= 100`, or a discount below the 100 Toman floor) rather than allowing a bad save
- [ ] T017 [P] [US2] Add four new keys to **both** `messages/fa.json` and `messages/en.json` under `admin`: the discount-percentage field label, a hint describing that it derives the price before discount, a label for the derived read-only value, and the message for the 100 Toman floor. Note `admin.compareAtPriceHint` at line 444 currently reads "Empty = no discount", which becomes misleading once the field is derived — update its text rather than leaving both. The parity test `__tests__/messages.test.ts` fails the suite on divergence
- [ ] T018 [P] [US2] In `components/shared/admin/options-editor.tsx`, apply the same single-percent field per variant row, replacing the separate `compareAtPrice` column input at lines 373-384, using the same helper. `AdminVariant` at lines 19-29 currently types `compareAtPrice: string`, which the existing `app/admin/products/[id]/page.tsx` boundary converts — that conversion stays

**Checkpoint**: typing a percentage updates both derived prices immediately;
the storefront badge never exceeds the typed percentage.

---

## Phase 5: User Story 3 - Optional fields stay optional (Priority: P3)

**Goal**: Dimensions, weight and banner never block a save.

**Independent Test**: Save a product with all optional fields blank and
confirm it saves and the storefront shows no empty dimension section
(quickstart.md Scenario 4).

**Depends on**: US1, US2 (same form file)

### Implementation for User Story 3

- [ ] T019 [US3] Verify in `components/shared/admin/product-form.tsx` that `subSubCategory` (line 387), the four dimension inputs (456-503) and the banner input remain **not** `required`, and that `lib/validator.ts:48-51` keeps the dimensions an optional union. Record "verified unchanged" in the commit body — if any of these became required, that is a regression against FR-007
- [ ] T020 [US3] Verify the loose dimension unions in `lib/validator.ts:48-51` are not tightened as part of T010–T012: a blank or malformed dimension must still pass, since `dim()` in `lib/actions/product.actions.ts:533-536` normalises `''` to `null`. Tightening this is out of scope for this feature

**Checkpoint**: all three stories independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T021 Run the full pre-commit gate: `npx tsc --noEmit && npm run lint && npm test && npm run build` — all four must pass
- [ ] T022 [P] Execute quickstart.md Scenarios 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 and 12 in the browser; record which passed and which could not be checked
- [ ] T023 [P] Confirm no `step='0.01'` survives on any money input: `grep -rn "step='0.01'" components/` returns nothing
- [ ] T024 [P] Confirm the derived values quoted in `quickstart.md` still match the implementation — `deriveCompareAtPrice(1000, 10) === 1111`, `(1000, 25) === 1333`, `(2000, 10) === 2222` — so the documented scenarios are not stale
- [ ] T025 Record the accepted cost in the commit body: the badge can read **lower** than the typed percentage (999,999 at 33% shows 32), because floor derivation makes overstatement impossible and understating is the deliberate trade (research.md R-001)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS both user stories** —
  the helper is the single source of the rounding and floor rules
- **US1 (Phase 3)**: depends on Phase 2; independent of US2
- **US2 (Phase 4)**: depends on US1 — **same file** (`product-form.tsx`), so
  these must run sequentially
- **US3 (Phase 5)**: depends on US1, US2 — also the same file
- **Polish (Phase 6)**: depends on all stories

### Critical Path

```
T002 → T003 → T004 → T005 → T006 → T008/T009 → T010-T014 → T015-T018 → T021
```

T001, T007, T013, T017, T018, T023, T024 are parallel; T010, T011, T012 are
sequential within one file.

### Parallel Opportunities

```bash
# After T003, in parallel:
Task: "T004 discount-math tests — derivation and boundaries"
Task: "T005 discount-math test — the safety invariant"

# In US1, in parallel:
Task: "T008 validator tests — stock and price"
Task: "T009 validator test — variant discount refine"
Task: "T013 step='1' on money inputs"

# In US2, in parallel with the form work:
Task: "T017 i18n keys in fa.json and en.json"
```

---

## Implementation Strategy

### MVP First (US1 + Phase 2)

US1 and the derivation helper form a coherent first increment: the store
stops accepting malformed products, and the rounding rules exist as tested
pure logic before any UI depends on them. US2 then wires that logic into the
form. Splitting further would leave either an unused helper or a form whose
rules are not yet verified.

1. Phase 1: Setup — record baseline, resolve the contradictory test (T001–T003)
2. Phase 2: Foundational — helper plus its tests (T004–T007)
3. Phase 3: US1 — server boundary and form gates (T008–T014)
4. **STOP and VALIDATE**: submit the form with each mandatory field empty
5. Phase 4: US2 — the discount field in both form and variant editor (T015–T018)
6. Phase 5: US3 — confirm optional fields untouched (T019–T020)
7. Phase 6: Polish — gate and quickstart scenarios (T021–T025)

### Commit Decomposition (per plan.md)

Five semantic commits, dependency-ordered so a bisect lands on a diagnosable
failure:

| # | Message | Tasks |
|---|---|---|
| 1 | `refactor(discount): rewrite the half-up test to floor` | T002, T003 |
| 2 | `feat(discount): pure derivation helper with floor rule and price floor` | T004–T007 |
| 3 | `refactor(validator): enforce integer stock, positive price, variant discount` | T008–T012 |
| 4 | `feat(admin): single discount field deriving both prices` | T013–T018 |
| 5 | `docs(specs): 004 research, plan, data model, quickstart, tasks` | already committed |

Commit 1 is isolated because it deliberately contradicts committed behaviour;
without it isolated, a reviewer sees a test change bundled with a feature and
cannot tell which is intentional. Commit 3 is independent of 2 and reviewable
on its own.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- Each user story is independently completable and testable
- Tests must be observed failing before the code they cover lands (T004/T005
  against the absent helper, T008/T009 against the permissive validator)
- `lib/discount.ts` and `lib/variants.ts` are deliberately **UNCHANGED** —
  `getDiscount` already floors the badge and `recomputeParent` already takes
  numbers. Verified, not assumed (research.md R-003, R-005)
- No schema change, so no migration and no `prisma generate`
- No new dependency: the admin form has no client-side schema and must not
  gain one (constitution principle VII)
- US1, US2 and US3 all touch `product-form.tsx`; run their tasks sequentially
