# Research: Admin Discount Method Selection

**Input**: `specs/006-admin-discount-modes/spec.md` (30 FRs, 6 SCs, 5 clarifications)

## R-001 — Derived selling price: floor-then-bump, not plain floor

**Decision**: `sell = floor(base × (100 − pct) / 100)`, then while
`badge(sell, base) > pct`, increment `sell` by 1.

**Rationale**: Feature 004 derived the *original* price from a typed percentage
and could afford to floor, because flooring the original price makes the
resulting badge read **lower** than typed. This feature inverts the direction:
the admin types the base price and the system derives the **selling** price.
Flooring the selling price pushes the pair the *other* way and the badge reads
**higher** than typed. Measured over base 1–3000 × pct {1,2,3,5,10,25,50,75,
90,99}:

| Regime | badge > typed | discount vanishes | selling price < 1 |
|---|---|---|---|
| `floor` | **668** | 0 | 0 |
| `ceil` | 0 | 230 | 0 |
| floor-then-bump | **0** | 140 | 0 |

Plain floor overstates only when base < 100 Toman — 25% off a 49-Toman product
sells at 36, and the badge on 36-vs-49 reads **26%**. The bump step exists only
to correct that regime. Above 100 Toman, floor-then-bump is **identical to plain
floor** (verified: every one of the 668 floor violations has base < 100), so
feature 004's derived values are unchanged for every product that was
saveable under 004's 100 Toman floor. It deviates from the exact figure in 349
of 29,860 combinations (1.2%), and leaves every evenly-dividing case exact
(4500 @ 10% → 4050; 1000 @ 25% → 750).

The bump trades one error for a smaller one. 25% off 49 floors to 36 and the
badge reads 26% — one point **high**. Bumping to 37 gives a badge of 24% — one
point **low**. No integer selling price on that base yields exactly 25%, so
either error is unavoidable; understating is the safe direction, and FR-008
states that preference explicitly.

The 140 "vanish" cases are base × pct < 100 where the honest selling price is
within 1 Toman of the base. Those are exactly the sub-1%-saving products the
FR-018 warning fires on, so they are expected, not a defect.

**Alternatives considered**:
- Plain floor (the spec's Q4 answer as literally written) — rejected, 668
  overstate violations.
- `ceil` — rejected, silences overstatement but manufactures 230 vanishing
  discounts, which is a shopper-visible wrong price rather than a wrong label.
- `Math.round` — rejected, overstates on the same sub-100 regime as floor.

## R-002 — The method and the on-sale state are not stored

**Decision**: No schema change. The stored pair (`price`, `compareAtPrice`)
remains the only authoritative representation. On load, derive: is-on-sale =
`compareAtPrice != null`; method = percentage mode iff
`percentToDiscount(price, compareAtPrice)` round-trips back to the stored
`compareAtPrice`, else price mode.

**Rationale**: Both the method and the on-sale state are fully derivable from
the pair, so a stored flag would be a second source of truth that can disagree
with the price pair it describes. Feature 004's FR-006 already established that
the percentage is never stored as an authoritative value; extending that to the
method keeps one rule instead of two. This also means FR-024 (existing products
work unchanged) needs no migration.

**Alternatives considered**:
- Storing `discountMode` on Product and ProductVariant — rejected, adds a column
  to two tables and a repair path for rows already inconsistent with it.
- Defaulting the method to percentage always — rejected, an existing
  4,500 → 3,900 product would load as 4500 @ 17% and the derived 4,135 would
  not match the stored 3,900.

## R-003 — "All variants agree" is a ratio comparison, not float equality

**Decision**: Two rows agree iff `cmpA × priceB === cmpB × priceA`, using
integer Toman throughout.

**Rationale**: The admin may enter the same effective discount through either
method, and rounding means the stored ratios rarely match as decimals. A float
`===` on `cmp/price` fails on exact ties like 4,500/4,050 and 9,000/8,100, which
are equal ratios expressed in different wholes — and would silently demote them
to the "partial variation" note. Cross-multiplication is exact integer
arithmetic and is the only form that can be trusted. The products stay well
inside `Number.MAX_SAFE_INTEGER` (2.1e9 × 2.1e9 = 4.6e18 > 9.0e15, so a true
worst case *does* exceed it) — see R-004 for the bound that actually applies.

**Alternatives considered**:
- Float `===` on the ratio — rejected, fails on exact ties.
- Comparing the *derived percent* (both floored) — rejected, conflates "same
  saving" with "same badge text"; 1111 and 1120 both read 9%.

## R-004 — Cross-multiplication overflow, and why the worst case cannot occur

**Decision**: Compare with a `BigInt` widening, or equivalently reject any pair
whose product exceeds `Number.MAX_SAFE_INTEGER`.

**Rationale**: 004's overflow guard already caps a product at the int4 ceiling
in practice, but 006's rule is stated for all inputs including the boundary, and
`cmpA × priceB` on two near-ceiling values is 4.6e18 — past 9.0e15, where
`Number` silently loses integer precision and the comparison returns a wrong
answer on exactly the products where being wrong is least acceptable. A single
pre-check (`a * b > Number.MAX_SAFE_INTEGER` before trusting the product) is
cheaper than widening every comparison and is sufficient: on the failing branch
the two rows are treated as disagreeing, which is the conservative direction.

**Alternatives considered**:
- `BigInt` on every comparison — rejected, allocates per comparison in a loop
  over variants; the guard is one multiply and a comparison.
- Assuming the int4 ceiling makes it safe — rejected, it does not; the ceiling is
  exactly what makes the product large.

## R-005 — Partial-variation state is derived in the listing query, not denormalized

**Decision**: The listing queries `include: { variants: { select: { price,
compareAtPrice } } }` and a pure helper classifies the product into one of three
states: `uniformDiscount`, `partialDiscount`, `noDiscount`.

**Rationale**: The listing must know whether *any* purchasable variant is
discounted and whether *all* of them agree. That is per-row data, so it has to
be read; but it must not be stored, because a stored flag would go stale the
moment a variant price is written by any path (admin form, order stock
decrement, seed). `getDiscount` at `components/shared/product/product-card.tsx:19`
and `app/(root)/product/[slug]/page.tsx:121` both read product-level only today,
so the classification must be computed by the caller and passed in.

The select is 2 columns over the variant rows of the products on one page. The
existing queries take 12–24 products, so this is at most a few hundred extra
values per page and no new query is issued.

**Alternatives considered**:
- Storing a product-level `partialDiscount` boolean, maintained on every variant
  write — rejected, two write paths must stay in sync or the flag lies.
- A second query per card to count discounted variants — rejected, N+1 against
  the page.

## R-006 — The struck-through price is omitted for partial discounts

**Decision**: When the state is `partialDiscount`, the card shows the note and
**no** struck-through price. When the state is `uniformDiscount` or
`noDiscount`, existing rendering is unchanged.

**Rationale**: Today `product-card.tsx:67` strikes through
`product.compareAtPrice` whenever `getDiscount` returns non-null. Under R-005
the product-level `compareAtPrice` is `null` for a partial product (Q2: cleared
unless all agree), so the strike-through disappears on its own — no conditional
needed. Showing a struck-through price with no percentage beside it, or a
struck-through price derived from one variant while the headline price comes
from another, is a new hallucination vector. The note alone is unambiguous.

**Alternatives considered**:
- Strike through the cheapest discounted variant's original price — rejected,
  implies the shopper pays that, which is not true for the cheapest variant.

## R-007 — Price-mode validity: strictly lower, and the typed value is kept

**Decision**: In price mode, `selling < base` is required. A value equal to the
base is treated as **no discount** (not an error), and a value above the base is
refused with the field named.

**Rationale**: `compareAtPrice > price` is the existing invariant in
`lib/validator.ts` and in `getDiscount`, which returns `null` when `cmp <= p`.
The equal case is the natural way for an admin to express "on sale toggle left
on but no discount set", and refusing it would be pedantic given the on-sale
control already exists and is authoritative for intent. The above case is a
genuine mistake — a "discount" that raises the price — and is refused rather
than swapped, because silently swapping hides it.

**Alternatives considered**:
- Refusing equality too — rejected, forces the admin to also flip the toggle
  off, an extra step for a state that is already well-defined.

## R-008 — The 1% warning replaces the 100 Toman floor as advisory

**Decision**: `MIN_DISCOUNTABLE_PRICE` is repurposed from a hard refusal in
`deriveCompareAtPrice` into the threshold for the FR-018 warning, and a new
`priceTooSmallForBadge` condition is reported for `base < 100` **or**
`pct < 1`. The save is not blocked; `discountNeedsMinPrice` in both message
files changes from a refusal string to the advisory "at least 1 percent".

**Rationale**: 004 introduced the 100 Toman floor to prevent a badge that
disappears without explanation. Removing the refusal (Q5) reintroduces that
state, so the guarantee must be carried by the warning instead. Because the
stored pair for a vanished discount is `base === compareAtPrice`, and
`getDiscount` already returns `null` when `cmp <= p`, the storefront renders
nothing for free — FR-019 needs no storefront work.

**Alternatives considered**:
- Keeping the hard refusal — rejected, the user explicitly chose the warning
  ("admin never make mistake", "warning admin implementing changes in
  new/existing products").
- Refusing only when the derived pair would be identical — rejected, this is
  silently-rejecting on a computed value, which is the thing FR-019 forbids.

## R-009 — Server re-derives the pair from the submitted numbers

**Decision**: The form submits the base price plus the method's field (not a
pre-computed `compareAtPrice`), plus an `onSale` flag and a `discountMode`
value. The server action re-derives `compareAtPrice` with the same pure helper
and writes only the derived pair.

**Rationale**: FR-028 forbids trusting a value the browser displayed as
read-only, and today's form submits `compareAtPrice` in a hidden input computed
by the client (`product-form.tsx:503-507`). Submitting the two typed numbers
and re-deriving server-side is the only arrangement where the client cannot
influence the stored discount. It also removes the hidden-input dance: the
method's field becomes a real named input.

**Alternatives considered**:
- Keep the hidden pre-computed `compareAtPrice` — rejected, it is exactly the
  client-computed value FR-028 forbids trusting.

## R-010 — No new dependency; the controls already exist

**Decision**: Use the existing `components/ui/radio-group.tsx` and
`components/ui/switch.tsx` (both already in the tree, backed by `radix-ui`
`^1.6.7`). No new package.

**Rationale**: Both primitives ship with the project. Constitution principle VII
forbids introducing a pattern for one form when an existing one fits, and the
method control is a radio group and the on-sale control is a switch by
definition.

**Alternatives considered**:
- A segmented-control component — rejected, one new component file for a
  two-option choice the radio group already expresses.

## R-011 — The partial-variation note needs no new message namespace

**Decision**: Add one key under the existing `product` namespace used by
`product-card.tsx` (`t = getTranslations('product')`), in both `fa.json` and
`en.json`.

**Rationale**: `product-card.tsx:16` already resolves the `product` namespace,
and the parity test fails the suite on any divergence. A new namespace would
mean a second `getTranslations` call for one string.

**Alternatives considered**:
- Reusing an existing "discount" string — rejected, it would show a percentage,
  which is precisely what the note exists to avoid.

## Open questions

None. Every NEEDS CLARIFICATION from the spec is resolved above or in the
clarification session. Two items the user left to implementation time, recorded
here so they are not lost:

- The exact wording of the on-sale toggle label and the two method labels, in
  both languages.
- Whether the percentage-mode bump step should be surfaced to the admin as a
  visible "adjusted" note, or applied silently. R-001 applies it silently; the
  spec's FR-006 requires the derived value be shown, which it is, so this is
  cosmetic.
