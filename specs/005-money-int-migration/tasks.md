---

description: "Task list for 005-money-int-migration"
---

# Tasks: Whole-Toman Integer Money Storage

**Input**: Design documents in `/specs/005-money-int-migration/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Included. FR-013 of the spec and the user's explicit request for
conservative tests around a large data-model type change both require them.
Tests are written to fail against the current Decimal implementation before the
implementation lands.

**Organization**: Tasks are grouped by user story. This is a **migration
feature**, not a greenfield build, so the shape is inverted from the usual
template: there is no project scaffolding, and the "models" tasks are the
schema and migration itself.

**Critical path**: T001 → T002 → T003 → (T004, T005) → T006 → T007. Almost
everything else is parallel or downstream. The pre-flight audit (T002) blocks
the destructive migration (T003) and cannot be skipped.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: run in parallel (different files, no dependencies)
- **[Story]**: user story this task belongs to (US1, US2, US3)
- Every task names exact file paths and, where a specific value or line is
  load-bearing, quotes it so it is not re-derived at implementation time.

## Conventions

Single project at repository root. Money modules live under `lib/`, server
actions under `lib/actions/`, tests under `__tests__/lib/`. Prisma migrations
are hand-authored SQL folders under `prisma/migrations/` — one statement per
line, no comment blocks (matching `20260914090000_order_inbox_fields`).

---

## Phase 1: Setup

**Purpose**: Establish the safety gate. Nothing destructive happens until the
store is proven to hold no fractional Toman.

- [X] T001 Create the pre-flight fractional-value audit as a runnable script at `scripts/audit-fractional-money.sql` containing the 17-column `information_schema`-independent UNION query and the order-balance query from [data-model.md](../005-money-int-migration/data-model.md) §3; each SELECT is one line per the migration convention
- [X] T002 [P] Run `npx prisma db execute --stdin --schema prisma/schema.prisma < scripts/audit-fractional-money.sql` against the dev database and record the output in the commit message — **every count must be 0 and the order-balance query must return no rows**; if any row is non-zero, STOP and reconcile that data by hand before continuing (R-002)
- [X] T003 Capture the pre-migration money snapshot for later comparison: `SELECT count(*), sum("totalPrice") FROM "Order"; SELECT count(*), sum("price") FROM "OrderItem"; SELECT count(*), sum("price") FROM "Product";` — write the result to `scripts/audit-fractional-money.baseline.txt` so SC-005 ("orders identical in value to before") is checkable after the migration

**Checkpoint**: T002 and T003 pass → the conversion is provably lossless. If
either fails, halt this feature; do not proceed to Phase 2.

---

## Phase 2: Foundational (BLOCKS ALL STORIES)

**Purpose**: The irreversible storage change. Isolated in its own commit so it
is reviewable on its own and revertable without stranding other work.

**Note on irreversibility**: this rewrites historical order values. It is the
only task in the feature that cannot be undone by `git revert` alone — the
database itself is rewritten.

- [X] T004 Convert the 17 money columns from `Decimal @db.Decimal(12, 2)` to `Int` in `prisma/schema.prisma`: Product `price` (line 76, keep `@default(0)`), `compareAtPrice` (77, `Int?`); ProductVariant `price` (141), `compareAtPrice` (142, `Int?`); Cart `itemsPrice`/`shippingPrice`/`taxPrice`/`totalPrice` (158-161) and `couponDiscount` (163, keep `@default(0)`); Order `itemsPrice`/`shippingPrice`/`taxPrice`/`totalPrice` (175-178) and `couponDiscount` (180, keep `@default(0)`); OrderItem `price` (208); Coupon `value` (342) and `minCartTotal` (344, keep `@default(0)`) — **do NOT touch** `rating` (78), `lengthCm` (85), `widthCm` (86), `heightCm` (87), `weightG` (88)
- [X] T005 Author `prisma/migrations/<timestamp>_money_to_integer/migration.sql` with all 17 ALTERs in ONE file using `USING round("col"::numeric, 0)::integer`; the 4 defaulted columns (`Product.price`, `Cart.couponDiscount`, `Order.couponDiscount`, `Coupon.minCartTotal`) need `DROP DEFAULT` before and `SET DEFAULT 0` after, because the `USING` expression is not applied to a column's default value; one statement per line (R-001)
- [X] T006 [P] Update `CLAUDE.md` to replace the "Money values are Prisma Decimals exposed as strings" line (~line 43) with the integer-money rule, preserving the "treat money as Toman in the UI" and "IRR ×10 in JSON-LD" parts which remain true; this is a documentation correction and is independent of the migration itself
- [X] T007 Apply the migration with `npx prisma migrate deploy`, then IMMEDIATELY run `npx prisma generate` — `migrate deploy` does not regenerate the client, and a stale client keeps deserializing the new integer columns as decimals, which is the quietest failure mode in this change
- [X] T008 [P] Verify the conversion landed: re-run the `information_schema` query from quickstart.md Scenario 4 and confirm all 17 columns report `data_type = 'integer'` while `Product.rating` and the four dimension columns still report `numeric`
- [X] T009 [P] Re-run `scripts/audit-fractional-money.sql` and confirm output is identical to T002 (all zeros) — the conversion is idempotent by construction, satisfying SC-006
- [X] T010 Verify order history is preserved: compare the T003 baseline (`count(*)` and `sum(...)` per table) against the same query post-migration; the counts must match exactly and the sums must differ by less than 1 Toman per fractional row found in T002 (which is zero), satisfying FR-011 and SC-002

**Checkpoint**: `npx tsc --noEmit`. **Note — this prediction was wrong.** It was
expected to pass here, on the reasoning that the `$extends` transform's
`.toString()` keeps working on a number and its return type stays `string`, so
no client-visible type would change (R-003). In fact the transform's *inferred*
type stayed `string` while the schema said `number`, so every `Product` and
`Cart` consumer broke. The transform's money entries had to be removed (done in
T020's commit), after which prices reach the client as plain numbers. R-003's
"leave `db/prisma.ts` untouched" was correct about runtime behaviour and wrong
about types.

---

## Phase 3: User Story 1 - The store's money is whole Toman end to end (Priority: P1)

**Goal**: Every price the store records — product, variant, cart, order,
order item, coupon — is a whole number of Toman, with no fractional Toman
reachable and no silent rounding.

**Independent Test**: Place a test checkout and confirm every displayed and
recorded amount is a whole Toman value equal to what the shopper was charged
(quickstart.md Scenario 8).

**Why this is P1**: it is the correctness core. Without it, fractional Toman
stays reachable and FR-001/FR-006/FR-009 are all false.

### Tests for User Story 1 (write FIRST, they must fail)

- [X] T011 [P] [US1] Add the no-residual invariant to `__tests__/lib/cart/pricing.test.ts`: for each existing `calcPrice` case, assert `Number(result.itemsPrice) + Number(result.shippingPrice) + Number(result.taxPrice) === Number(result.totalPrice)` AND that all four are `Number.isInteger` — this is the SC-004 check and it must fail while `calcPrice` returns `.toFixed(2)` strings
- [X] T012 [P] [US1] Add the rounds-to-zero boundary to `__tests__/lib/coupon.test.ts`: `expect(couponDiscount('percent', 1, 10)).toBe(0)` and `expect(couponDiscount('percent', 15, 999999)).toBe(150000)` (replacing the current `149999.85` expectation at line 100, whose comment says "2dp is correct for money" — that assumption is exactly what this feature reverses)
- [X] T013 [P] [US1] Add integer-write assertions to `__tests__/lib/variants.test.ts`: `recomputeParent` must return **numbers**, not strings — `expect(recomputeParent([])).toEqual({ price: 0, compareAtPrice: null, stock: 0 })` and update the `compareAtPrice = lowest non-null` case (line ~135) to expect `150000` as a number; note `lib/variants.ts:140-141` currently calls `.toString()`, which is why these tests stay green after T004 and must be tightened deliberately
- [X] T014 [P] [US1] Add the fractional-refusal test to `__tests__/lib/validator.test.ts`: `insertProductSchema.parse({ ...validProduct, price: '100.5' })` throws, `'100'` passes, and `price: '2147483648'` throws (the int4 ceiling) — covers FR-008 and FR-002; update the existing "normalizes integer prices to two decimals" test (line ~44) and the `validProduct` fixture at line 24, which currently uses `price: '50000000.00'`

### Implementation for User Story 1

- [X] T015 [US1] Remove the four `.toFixed(2)` stringifications in `lib/cart/pricing.ts:35-38` and return integers; `taxPrice` at line 31 must keep rounding because the tax *rate* is fractional (`TAX_RATE = 0.09` in `lib/constants.ts:11`), so use `Math.round` there — this is why `round2` is kept rather than deleted
- [X] T016 [P] [US1] Remove `couponDiscountValue.toFixed(2)` at `lib/actions/cart.actions.ts:134` and `discount.toFixed(2)` at `lib/actions/cart.actions.ts:350`
- [X] T017 [P] [US1] Remove `couponDiscountAmount.toFixed(2)` at `lib/actions/order.actions.ts:193`
- [X] T018 [P] [US1] Remove `value.toFixed(2)` and `minCartTotal.toFixed(2)` at `lib/actions/coupon.actions.ts:55-56`
- [X] T019 [US1] Tighten the `currency` validator in `lib/validator.ts:6-12`: change the regex from `/^\d+(\.\d{2})?$/` to `/^\d+$/` and add a numeric maximum of `2147483647`; the current error message reads "Price must have exactly two decimal places (e.g., 49.99)" and must be rewritten to describe whole Toman, since fractional prices are currently the intended input (FR-008, FR-002)
- [X] T020 [US1] Change `recomputeParent` in `lib/variants.ts:130-145` to return `price: number` and `compareAtPrice: number | null` instead of `.toString()` results, including the empty-list case that currently returns `price: '0'`; verify every caller in `lib/actions/product.actions.ts` and the admin variant editor still compiles, since this widens a return type that was previously `string`

**Checkpoint**: T015–T020 complete, then `npm test` — T011–T014 now pass,
proving money no longer round-trips through a fractional string. This is the MVP.

---

## Phase 4: User Story 2 - Products and variants can be priced in whole Toman (Priority: P1)

**Goal**: An administrator prices a product or variant with a whole Toman
amount and that exact amount flows to storefront, cart and order.

**Independent Test**: Price a product and each of its variants with whole Toman
values, add them to a cart, confirm cart and order record the exact amounts
entered (quickstart.md Scenarios 6 and 7).

**Depends on**: US1 (storage is integer first; seed values are typed accordingly)

### Tests for User Story 2

- [X] T021 [P] [US2] Update `__tests__/lib/seo.test.ts`: the `product` fixture at line 79 uses `price: '68500000.00'` and the test at line ~91 feeds a fractional `price: '1234567.89'` asserting `12345679`; change both to whole-Toman values and keep asserting the ×10 IRR relationship, which is unchanged by this feature (FR-015)
- [X] T022 [P] [US2] Add a whole-Toman display case to `__tests__/lib/discount.test.ts`: `expect(getDiscount('100', '111')).toEqual({ percent: 9, saveAmount: 11 })` — this locks the known badge/typed disagreement so no later "fix" moves it silently (R-006, R-007 check 1)

### Implementation for User Story 2

- [X] T023 [US2] Change `SampleVariant.price`, `SampleVariant.compareAtPrice` and `SampleCombo.price` in `db/sample-data.ts:53,64,94-97` from `string` to `number` and strip the `.00` suffix from all 13 products' values; leave `rating` and the dimension fields as `string` because those columns stay `Decimal`
- [X] T024 [US2] Update `db/seed.ts:183` (`variantRows.price: string`) and the `productVariant.create` calls at lines 233 and 276 to pass integers, so the seed does not rely on Prisma silently coercing a string through the rounding assignment cast
- [X] T025 [US2] Run `npm run db:seed` and confirm all 13 products with per-variant prices load with no type errors (quickstart.md Scenario 13)

**Checkpoint**: US1 + US2 complete → a product priced in whole Toman renders
and checks out with that exact value.

---

## Phase 5: User Story 3 - Money keeps working everywhere it is displayed (Priority: P2)

**Goal**: Every reader of money — storefront, admin, order pages, JSON-LD, AI
assistant — reports the same whole Toman value, with no formatting artifacts.

**Independent Test**: Visit every money-displaying page and compare against the
stored integers (quickstart.md Scenarios 7 and 12).

**Depends on**: US1, US2

### Implementation for User Story 3

- [X] T026 [P] [US3] Verify (do not modify) that `lib/persian.ts:23-25` and `lib/utils.ts:64-72` `formatCurrency` already drop fractions via `maximumFractionDigits: 0`; if either can emit a decimal for an integer input, fix it — otherwise record "verified unchanged" in the commit body (FR-010)
- [X] T027 [P] [US3] Verify (do not modify) that `lib/pay/zarinpal.ts:32,78` send `amount: Math.round(...)` with `currency: 'IRT'`, and that `lib/actions/payment.actions.ts:43,139` both read the same `order.totalPrice` column so request and verify amounts cannot diverge (a divergence returns ZarinPal code `-50`); record "verified unchanged" in the commit body
- [X] T028 [P] [US3] Verify (do not modify) that `lib/seo.ts:73,114` still apply `Math.round(Number(price) * 10)` for the Toman→IRR conversion, and that `lib/discount.ts:24,27` keep `Math.floor` for percent and `Math.round` for savings; record "verified unchanged" in the commit body
- [X] T029 [US3] Manually confirm via the running dev server that the AI assistant reports the same whole Toman price the storefront shows, and that the JSON-LD block reports that value ×10 in `IRR` (quickstart.md Scenario 12, FR-012)
- [X] T030 [US3] Check `lib/actions/user.actions.ts:879-887` where a `SUM` result is assigned into a field typed `totalSpent: string` via a `JSON.parse(JSON.stringify(...))` round-trip that currently stringifies a Decimal; with Int it becomes a JS `number`, so correct the declared type rather than relying on the JSON round-trip (no behavioural change, the Persian formatter renders either)

**Checkpoint**: all three stories independently verifiable.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T031 Run the full pre-commit gate: `npx tsc --noEmit && npm run lint && npm test && npm run build` — all four must pass
- [X] T032 Verify rendered output. **Fully verified 2026-09-25** — browser preview tooling was unavailable (`preview_start` refused four times, classifier down), so scenarios were checked over HTTP against a running dev server plus the dev database, and the repeatable parts were left behind as two test files:
  - **Scenario 6 (whole-Toman display) — PASS.** `GET /product/golbarg-notebook-80` → HTTP 200, renders `۱۹۹٬۰۰۰` (exactly 199,000 Toman) in both the buy box and the cart summary; no decimal digits anywhere in the HTML.
  - **JSON-LD IRR ×10 — PASS.** Same page emits `"price":1990000` (199,000 Toman × 10 = 1,990,000 IRR).
  - **Scenario 7 (discount badge) — PASS, rendered.** Temporarily set `compareAtPrice = 221111` (a 10% markdown, half-up) on the same product. The page rendered badge `٪۹ تخفیف` with `۲۲۱٬۱۱۱` struck through and `۱۹۹٬۰۰۰` as the sale price — badge matches the stored pair, all whole Toman. JSON-LD emitted `referencePrice: 2211110`. Discount reverted afterwards (0 discounted products remain).
  - **Scenarios 9, 10, 11 (coupon rounding, fractional/overflow rejection) — PASS** in `__tests__/lib/money-t32-verify.test.ts`: percent 15 on 999999 → 150000; percent 1 on 10 → 0; fixed clamps at the subtotal; `100.5` rejected, `100` accepted; `2147483648` rejected, `2147483647` accepted.
  - **Scenario 8 (order record) — PASS on live data** in `__tests__/lib/money-t32-checkout.test.ts`: writes a real `Order` + `OrderItem` through the real `calcPrice` path with a 15% coupon, then asserts `itemsPrice + shippingPrice + taxPrice === totalPrice`, every stored value is an integer, and `itemsPrice === gross − couponDiscount`. Cleans up its own row. (Note `itemsPrice` is already **net** of the discount, so the balance check must not subtract `couponDiscount` a second time — an earlier draft of this check did exactly that and wrongly appeared to fail.)
- [X] T033 Confirm no `.toFixed(2)` remains on any money write path: `grep -rn "toFixed(2)" lib/actions/ lib/cart/` returns nothing (the two `.toFixed(1)` rating call sites in product/reviews components are out of scope and must remain)
- [X] T034 [P] Update `docs/DEPLOYMENT.md` if it describes the migration step, to note that this migration rewrites money columns under `ACCESS EXCLUSIVE` and should be run outside sale hours
- [X] T035 Note the follow-up (NOT in this feature): `Notification.data` (`prisma/schema.prisma:312`) and `Cart.items` still hold `"49000.00"`-style JSON strings. **Verified 2026-09-25: zero rows in either table match `%.00%`**, so there is no stale data to clean — the writers now emit integers. Recorded because the columns are untyped `Json` and nothing in the schema prevents a future writer from reintroducing fractional strings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies — start immediately
- **Foundational (Phase 2)**: depends on Setup. **BLOCKS all user stories.** The
  pre-flight audit (T002) is a hard gate: a non-zero result halts the feature
- **US1 (Phase 3)**: depends on Phase 2. Independent of US2/US3
- **US2 (Phase 4)**: depends on US1 (seed values must be typed as integers)
- **US3 (Phase 5)**: depends on US1, US2
- **Polish (Phase 6)**: depends on all desired stories

### Within Each User Story

- Tests (T011–T014) MUST be written and observed failing before T015–T020 land
- Schema and migration (T004–T005) before client regeneration (T007) before any
  application code change
- Seed typing (T023–T024) after storage is integer

### Critical Path

```
T001 → T002 → T003 → T004 → T005 → T007 → T011-T014 → T015-T020 → T031
```

T006, T008, T009, T010, T016–T018 are parallel; T021, T022, T026–T028 are
parallel; T034, T035 are parallel.

### Parallel Opportunities

```bash
# After T002 passes, in parallel:
Task: "T006 Update CLAUDE.md money documentation"

# After T007, in parallel:
Task: "T008 verify information_schema shows integer"
Task: "T009 re-run idempotency audit"
Task: "T010 verify order history against baseline"

# In US1, tests first then implementation, in parallel within each group:
Task: "T011 cart pricing no-residual invariant"
Task: "T012 coupon rounds-to-zero boundary"
Task: "T013 variants integer write assertions"
Task: "T014 validator fractional refusal"
# then
Task: "T016 cart.actions.ts toFixed removal"
Task: "T017 order.actions.ts toFixed removal"
Task: "T018 coupon.actions.ts toFixed removal"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

This feature has no meaningful partial delivery: converting storage without
fixing the `.toFixed(2)` write paths would leave money silently coerced, and
converting the app without the schema would change nothing. US1 and US2 together
are the smallest slice that is correct and demonstrable.

1. Phase 1: Setup — run the pre-flight audit (T001–T003)
2. Phase 2: Foundational — schema, migration, generate, verify (T004–T010)
3. Phase 3: US1 — tests fail, then fix the write paths (T011–T020)
4. Phase 4: US2 — seed types (T021–T025)
5. **STOP and VALIDATE**: place a test checkout; every amount is whole Toman
6. Phase 5: US3 — verify the untouched readers (T026–T030)
7. Phase 6: Polish — full gate and quickstart scenarios (T031–T035)

### Commit Decomposition (per research.md R-008)

Six semantic commits, matching the phases so a bisect lands on a diagnosable
failure:

| # | Message | Tasks |
|---|---|---|
| 1 | `refactor(db)!: money columns to integer` | T004, T005 |
| 2 | `refactor(db): regenerate Prisma client for integer money` | T007 |
| 3 | `fix(seed): whole-Toman seed values` | T023, T024 |
| 4 | `refactor(money): remove .toFixed(2) from money writes` | T015–T020, T006 |
| 5 | `test(money): whole-Toman arithmetic and integer storage invariants` | T011–T014, T021, T022 |
| 6 | `chore(money): verification and polish` | T008–T010, T025–T035 |

Commit 1 is isolated because it is the only irreversible one. Commit 2 is
isolated because a stale client is the quietest failure mode. Commits 4 and 5
are kept apart so the assertions can be read against the behaviour change
without its diff noise in the way.

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps each task to a user story for traceability
- Every user story is independently completable and testable
- Tests must be observed failing before implementation lands
- The `$extends` transform in `db/prisma.ts` is deliberately UNTOUCHED — prices
  still arrive as `string` (R-003). Do not "clean it up" during this feature
- `round2` in `lib/utils.ts` is deliberately KEPT — the tax rate is fractional,
  so `taxPrice` still needs rounding
- `lib/coupon.ts`, `lib/discount.ts`, `lib/seo.ts`, `lib/persian.ts` and
  `lib/pay/zarinpal.ts` are all deliberately UNCHANGED — verified correct for
  integer money, not assumed
- `db push` is forbidden; only `migrate deploy` with hand-authored SQL
