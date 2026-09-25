# Phase 0 Research: Whole-Toman Integer Money Storage

**Feature**: 005-money-int-migration
**Date**: 2026-09-25

Every NEEDS CLARIFICATION below was resolved by inspecting the actual repo state
and, where the answer depends on database or language semantics, by verifying
against primary sources. Claims that changed the design are marked **[corrected]**
— in two cases a plausible-looking assumption turned out to be wrong.

---

## R-001: `numeric → integer` conversion in Postgres

**Decision**: Convert every money column with an explicit
`USING round("col"::numeric, 0)::integer`, in **one** migration file, wrapping the
four defaulted columns in `DROP DEFAULT` / `SET DEFAULT`.

**[corrected] Assumption rejected: "`::int` truncates toward zero."**
It does not. The `numeric → int4` cast is registered at assignment level using
`int4(numeric)`, and `int4(numeric)` **rounds, ties away from zero**. Proof is in
Postgres's own regression suite (`src/test/regress/sql/numeric.sql`):
`SELECT (-2147483648.5)::int4;` fails (rounds out of range) while
`SELECT (-2147483648.4)::int4;` succeeds. Truncation would keep `.5` in range and
flooring would overflow `.4`; only rounding explains both.

`USING` is therefore *not* required — the docs say a `USING` clause is needed only
when no implicit or assignment cast exists. It is supplied anyway because it makes
the rounding rule visible to a reviewer, which is what FR-003 asks for, and because
relying on an implicit assignment cast makes the rounding direction an invisible
property of the migration.

The `DROP DEFAULT` / `SET DEFAULT` pairs are required because the `USING`
expression is not applied to a column's default value. Four columns carry
defaults: `Product.price`, `Cart.couponDiscount`, `Order.couponDiscount`,
`Coupon.minCartTotal`.

**Rationale**: explicit > implicit for a migration that rewrites real order
history. One file means one transaction (Prisma wraps each migration file in a
transaction on Postgres) and one lock cycle.

**Alternatives considered**:
- *Implicit bare `::int` cast* — smallest SQL, but hides the rounding direction.
  Rejected: FR-003 requires a defined, reviewable rounding rule.
- *One migration file per table* — smaller blast radius per lock, but eight lock
  cycles and a half-migrated schema if one fails. Rejected.
- *`db push`* — forbidden by the constitution (VI) and by project convention.

**Cost**: `numeric → int` is a full table + index rewrite under `ACCESS
EXCLUSIVE`, and is not MVCC-safe (concurrent transactions taking a snapshot
before the rewrite see the table as empty). Tables are small; one lock for
milliseconds. The rewrite-skip optimization does not apply because contents
change.

---

## R-002: Pre-flight query before migrating

**Decision**: Run a read-only fractional-value audit across all seven money
tables *before* applying the migration. If it returns zero rows, the conversion
is provably lossless. If it returns rows, stop and reconcile them by hand.

**Rationale**: `Order.totalPrice` and `OrderItem.price` are rounded by *separate*
ALTER statements. If any historical row carries a non-zero fraction, then after
conversion `total ≠ Σ(items) + shipping + tax − discount`, and SC-004 silently
becomes false for that order. Auditing first converts an invisible data-quality
question into a yes/no gate.

**Alternatives considered**:
- *Convert and then verify* — verification after the fact cannot tell you whether
  a discrepancy was pre-existing or introduced. Rejected.
- *Trust the type* — the columns are `numeric(12,2)`, so fractions are
  representable; nothing in the schema prevents them. Rejected.

**Cost**: one SELECT.

---

## R-003: The `$extends` money transform ~~stays~~ — **CORRECTED during implementation**

**Original decision (WRONG)**: Leave `db/prisma.ts:28-80` completely untouched.

**Why the original reasoning looked right**: the transform calls `.toString()` on
`price` and `compareAtPrice` for Product and ProductVariant. Prisma returns
`int4` as a plain JS `number` (verified: no `BigInt` in the generated model
types), and `Number.prototype.toString()` exists, so the transform keeps working
at runtime. Its declared return type is `string` before and after, so the
original conclusion was "no client-visible type changes anywhere".

**Why it was wrong**: that reasoning was about *runtime behaviour* and said
nothing about the transform's *inferred* TypeScript type. Prisma's
`$extends` result transform types each field from its `compute` return type, so
`price` kept resolving to `string` while the schema declared `number`. Every
`Product` and `Cart` consumer then failed to typecheck: `Type 'string' is not
assignable to type 'number'`. Sixteen errors, spreading through pages,
components, actions and tests as the stricter types were propagated.

**Corrected decision**: remove the money entries (`price` and `compareAtPrice`
for both `product` and `productVariant`) from the transform. Keep the five
non-money `Decimal` fields (`rating`, `lengthCm`, `widthCm`, `heightCm`,
`weightG`), which still stringify and still need it.

**What this actually costs**: prices now reach client components as `number`
rather than `string`. The churn was real but mechanical — `getDiscount` and
`formatCurrency` already accepted `string | number`, and the formatters use
`Intl.NumberFormat` with `maximumFractionDigits: 0`, so display was already
integer-safe. A benefit: it deletes the "Decimal doesn't survive JSON" hazard
the transform existed to work around, since `Int` is JSON-native.

The five non-money `Decimal` fields (`rating`, `lengthCm`, `widthCm`, `heightCm`,
`weightG`) keep the transform because they stay `Decimal` per the spec.

**Alternatives considered**:
- *Keep the money blocks as no-ops* — rejected; see above. The type mismatch is
  not a no-op, it breaks every consumer.
- *Delete the whole transform* — impossible; the non-money Decimals still need it.

---

## R-004: The real breakage vector is `.toFixed(2)`, not arithmetic

**Decision**: Remove all eight `.toFixed(2)` money stringifications, and tighten
the `currency` validator to whole numbers.

**Rationale**: every money *write* currently ends in `.toFixed(2)`, producing a
string like `"49000.00"`. Prisma would coerce that string into an `Int` column
through the same rounding assignment cast — silently turning a fractional price
into a rounded one instead of refusing it. This is the only place where the
migration could actually corrupt data rather than merely change representation.

Sites (all money writes, all must change):

| File:line | Current |
|---|---|
| `lib/cart/pricing.ts:35-38` | `itemsPrice`/`shippingPrice`/`taxPrice`/`totalPrice` → `.toFixed(2)` |
| `lib/actions/cart.actions.ts:134` | `couponDiscountValue.toFixed(2)` |
| `lib/actions/cart.actions.ts:350` | `discount.toFixed(2)` |
| `lib/actions/order.actions.ts:193` | `couponDiscountAmount.toFixed(2)` |
| `lib/actions/coupon.actions.ts:55-56` | `value.toFixed(2)`, `minCartTotal.toFixed(2)` |

**Added during implementation — four more string round-trips the `.toFixed(2)`
framing missed.** Each was a `Decimal.toString()` that had to become a number:

| Site | Was |
|---|---|
| `lib/actions/cart.actions.ts` `getMyCart` | four totals `.toString()` |
| `lib/actions/cart.actions.ts` `addItemToCart` | two `serverPrice` assignments |
| `lib/actions/order.actions.ts` | one buy-again price, plus the `pricedItems` loop |
| `lib/variants.ts:140-141` `recomputeParent` | `price` and `compareAtPrice` `.toString()` |

`recomputeParent` matters most: its `.toString()` would have kept
`variants.test.ts` **green** on a broken write path — exactly the "tests pass
while the migration is wrong" case this feature was scoped to catch.

Separately, `lib/validator.ts:6-12` defines `currency` to accept
`/^\d+(\.\d{2})?$/` and its error message literally reads *"Price must have
exactly two decimal places (e.g., 49.99)"* — so fractional prices are currently
the **intended** input. FR-008 requires refusing them, so the validator changes to
whole numbers with an upper bound.

**Rationale for the bound**: the int4 ceiling is 2,147,483,647 Toman, and
`Σ(price × qty)` with unbounded `qty` (`lib/validator.ts:159`, no maximum) can
exceed it. Postgres raises `integer out of range` rather than wrapping, so the
failure is loud — but it would surface during checkout, which is the worst
possible moment. Capping price in the validator turns that into a form-level
error.

**Alternatives considered**:
- *Leave `.toFixed(2)` and let Prisma coerce* — silent rounding of a price the
  admin typed. Rejected: it defeats FR-008 and hides a data-integrity bug.
- *Widen to BigInt* — Prisma returns JS `BigInt`, which throws on
  `JSON.stringify`; every response, toast, cart payload and AI tool result would
  need a conversion shim. Rejected during clarification as disproportionate.

---

## R-005: Files that need no change

Verified line by line, because the instinct is to touch all of them:

- **`lib/discount.ts:24,27`** — `Math.floor` for percent, `Math.round` for
  savings. Already matches the clarified policy. JS `/` is always float division
  and `Math.floor` is explicit, so nothing becomes integer division.
- **`lib/seo.ts:73,114`** — `Math.round(Number(price) * 10)`. The Toman→IRR ×10
  relationship for schema.org is unchanged, satisfying FR-015 for free.
- **`lib/pay/zarinpal.ts:32,78`** — already sends `amount: Math.round(...)` with
  `currency: 'IRT'`. Toman goes to the gateway; the ×10 applies *only* to
  JSON-LD. `Math.round` simply becomes a no-op.
- **`lib/actions/payment.actions.ts:43,139`** — both `Number(order.totalPrice)`,
  which works on Int. Both read the same column, so request and verify amounts
  cannot diverge (a divergence returns ZarinPal code `-50`).
- **`lib/persian.ts:23-25`, `lib/utils.ts:64-72`** — `Intl.NumberFormat` with
  `maximumFractionDigits: 0`, already whole-Toman-safe. So `formatCurrency` needs
  no change to satisfy FR-010.
- **`lib/coupon.ts:71,74`** — `round2` is half-up for positive values, and the
  inputs are already whole.
- **`round2` itself (`lib/utils.ts:53-61`)** — after the migration its inputs are
  already whole, so it becomes an identity function at these call sites. It is
  **kept** rather than deleted: `taxPrice = round2(0.09 * itemsPrice)` still
  genuinely needs rounding, since the tax *rate* is fractional. Deleting it would
  be a larger diff for no gain.

---

## R-006: Discount derivation — half-up is load-bearing

**Decision**: `compareAtPrice = Math.round(price * 100 / (100 - percent))`,
with `percent >= 100` refused and an int4 overflow guard on the *derived* value.

**Rationale**: **floor is wrong**, and this is verified rather than assumed. At
`price = 999999, percent = 33` the exact value is 1492535.82. Rounding half-up
gives 1492536, whose recomputed badge is exactly 33. Rounding down gives 1492535,
whose recomputed badge is **32** — the badge understates the discount the admin
typed. Half-up is what makes the floored badge land on the typed value.

**The badge/typed-value disagreement is real and unavoidable.** Brute-forcing
prices 1–500 against percentages 1–30 gives **7,320 of 15,000 pairs (48.8%)**
where the badge recomputed from the stored pair differs from the typed percent,
with a worst case of **30 percentage points** of understatement. This is inherent
to storing two integers and deriving a third: some `(price, percent)` pairs have
no integer `compareAtPrice` that reproduces the percent exactly. The spec's
guarantee must therefore be stated as **"the badge never overstates the saving"**
(floored — always true) rather than **"the badge equals the typed percent"** (not
achievable). This corrects 004's FR-013/SC-003 wording, which currently over-promises.

**Overflow guard is on the derived value, not the price.** `compareAtPrice`
exceeds int4 whenever `price > 2147483647 × (100 − percent) / 100`; at
`percent = 33` the safe price ceiling is 1,438,814,043. A naive "price ≤ int4 max"
check would pass and then overflow on write.

**Alternatives considered**:
- *Floor the derived `compareAtPrice`* — cheaper to explain, demonstrably wrong at
  the boundary. Rejected.
- *Store the percentage alongside the pair* — would make the badge exact, but
  adds a third source of truth that can disagree with the other two, violating
  FR-013 and the constitution's data-integrity principle. Rejected during
  clarification.

---

## R-007: Conservative testing strategy

**Decision**: Amend the seven existing money test files in place; add no new
framework, no fixtures, no integration harness. Seven targeted checks.

**Rationale**: The user asked for conservative tests around a large data-model
type change. The risk is concentrated in a few arithmetic boundaries, not spread
across the app, so the conservative choice is a small number of *sharp* checks
rather than a large shallow suite.

Checks that fail **loudly** if the migration is wrong (these already exist and
encode old behaviour, so they must be updated, not merely re-run):

- `__tests__/lib/coupon.test.ts:99-102` — asserts
  `couponDiscount('percent', 15, 999999) === 149999.85`; must become `150000`.
- `__tests__/lib/cart/pricing.test.ts` — asserts `.toFixed(2)` strings, and
  prices a cart at `0.1` Toman.
- `__tests__/lib/seo.test.ts:79,91-96` — uses `'68500000.00'` and fractional
  `1234567.89`.
- `__tests__/lib/variants.test.ts:128-149` — asserts `recomputeParent` returns
  strings via `.toString()`; the `.toString()` keeps the test green after the
  change, so the string→Int write path is left unverified unless checked.

Checks that stay **green while the migration is wrong** (the dangerous ones —
these are the conservative additions):

1. `getDiscount('100', '111')` → `{percent: 9, saveAmount: 11}` — locks the
   badge/typed disagreement so a later "fix" cannot silently change it.
2. Derivation table: `(100,10)→111`, `(999999,33)→1492536`, `(1,99)→100`,
   `(100,0)→null`. The 999999 case is the one that distinguishes half-up from
   floor.
3. Refusals: `percent = 100` and the int4-overflow case both reject;
   `(1,1)` yields no discount.
4. `couponDiscount('percent', 15, 999999) === 150000` and
   `couponDiscount('percent', 1, 10) === 0` — the rounds-to-zero boundary.
5. `pricing.test.ts` invariant per case:
   `itemsPrice + shippingPrice + taxPrice === totalPrice` **and** every value is
   `Number.isInteger`. This is the SC-004 no-residual check.
6. `insertProductSchema` refuses `price: '100.5'` and accepts `'100'` (FR-008).
7. An invariant loop over several `(price, percent)` pairs asserting the
   recomputed badge is **never greater than** the typed percent — the precise
   meaning of "the badge never overstates", and it subsumes checks 1–2.

**Rationale for the pre-flight SELECT instead of a migration test**: the migration
is `ALTER … USING round(…)`, which is idempotent by construction. A test would be
testing Postgres's `round`, not our code. The SELECT is the honest safety net.

**Deferred**: JSON blobs in `Notification.data` and `Cart.items` keep
`"49000.00"`-style strings (`prisma/schema.prisma:312`,
`lib/actions/payment.actions.ts:166`). They render correctly through existing
formatters, so they are follow-up cleanup, not this change.

---

## R-008: Commit decomposition

**Decision**: Six semantic commits, each independently reviewable and each
revertable without stranding the tree in a broken state.

**Rationale**: the user asked for section-by-section commits. The dependency
order matters — schema before seed before arithmetic — so a reviewer bisecting a
regression lands on a commit whose failure is diagnosable.

1. `refactor(db)!: money columns to integer` — `schema.prisma` + the single
   migration SQL. No other file. This is the irreversible one, isolated.
2. `refactor(db): regenerate Prisma client for integer money` — `prisma generate`
   output only. Separate because a stale client is the quietest failure mode
   (R-001) and should be revertable/identifiable on its own.
3. `fix(seed): whole-Toman seed values` — `db/sample-data.ts`, `db/seed.ts`.
4. `refactor(money): remove .toFixed(2) from money writes` — the eight
   stringification sites plus the `currency` validator tightening. One concern:
   "stop emitting fractional Toman", reviewable as a unit.
5. `test(money): whole-Toman arithmetic and integer storage invariants` — the
   updated and added checks from R-007.
6. `docs(specs): 005 research, plan, data model, quickstart` — planning artifacts,
   matching the 003 precedent (`234d708`).

**Rationale for keeping 4 and 5 apart**: the test commit is the safety net; a
reviewer wants to read the assertions against the behaviour change without the
behaviour change's diff noise in the way.
