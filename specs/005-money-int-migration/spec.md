# Feature Specification: Whole-Toman Integer Money Storage

**Feature Branch**: `005-money-int-migration`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "i forgot to tell you that another big changes for the prices are from 'Decimal' to 'integer' as the TOMAN unit doesn't get split and divided the way Dollar gets. so if we're supposed to get back to /speckit-specify or /speckit-clarify plese tell me. this is important."

## Clarifications

### Session 2026-09-25

- Q: Which integer column type should money use? → A: 32-bit integer; the resulting
  ceiling is far above any plausible single order value for this store.
- Q: When a percentage does not divide evenly into whole Toman, which way should it
  round? → A: Round half-up to whole Toman, and floor the displayed percentage.
- Q: Coupon.value currently holds either a percentage or a Toman amount in one
  column. How should the integer conversion handle it? → A: Keep it as a single
  integer column — both uses are already whole numbers, so the coupon model and
  its logic are unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The store's money is whole Toman end to end (Priority: P1)

Every price the store records — product prices, variant prices, cart totals,
order totals, per-item prices, and coupon amounts — is a whole number of Toman.
No fractional Toman ever appears, and every existing price survives the change
with its shopper-visible meaning intact.

**Why this priority**: Toman has no commonly used subunit, so a two-decimal money
column carries an impossible value and invites rounding bugs in every place that
touches money. This is a correctness issue for the store's most sensitive data,
and the admin discount work that follows depends on it.

**Independent Test**: Can be fully tested by converting the store, then placing a
test order and confirming every displayed and recorded amount is a whole Toman
value that matches what the shopper was charged.

**Acceptance Scenarios**:

1. **Given** a product priced at 250000 Toman, **When** the shopper views the
   product page, **Then** the price is shown as a whole Toman amount with no
   decimal digits.
2. **Given** a cart containing several items, **When** the shopper checks out,
   **Then** the items subtotal, shipping, tax, coupon discount, and grand total
   are all whole Toman amounts that sum exactly to the recorded order total.
3. **Given** a percentage coupon, **When** it is applied to a cart, **Then** the
   discount is a whole Toman amount and the final total is a whole Toman amount.
4. **Given** a fixed-amount coupon, **When** it is applied to a cart, **Then** the
   coupon's stored value and the resulting discount are whole Toman amounts.
5. **Given** an order placed before the change, **When** an administrator views
   order history, **Then** the historical amounts are shown as whole Toman and are
   consistent with what the shopper was actually charged.
6. **Given** any product, variant, cart, or order, **When** its money values are
   read back, **Then** no value has a fractional Toman part.

---

### User Story 2 - Products and variants can be priced in whole Toman (Priority: P1)

An administrator prices a product or a variant using a whole Toman amount, and
the storefront, cart, and order all use that exact amount.

**Why this priority**: The product and variant prices are the source of every
other money value; if they are not whole numbers, the whole chain inherits
fractional Toman.

**Independent Test**: Can be fully tested by pricing a product and each of its
variants with whole Toman values, adding them to a cart, and confirming the
cart and order record the exact amounts entered.

**Acceptance Scenarios**:

1. **Given** a product with a price of 1250000 Toman, **When** the administrator
   saves it, **Then** the stored and displayed price is exactly 1250000.
2. **Given** a product with several variants priced differently, **When** the
   shopper selects a variant, **Then** the displayed price is that variant's exact
   stored whole Toman price.
3. **Given** a product and its variants, **When** the product's overall price is
   derived from its variants, **Then** the derived price is a whole Toman value.

---

### User Story 3 - Money keeps working everywhere it is displayed and computed (Priority: P2)

The storefront, admin panel, order pages, invoices, search-engine structured
data, and the AI assistant all read and display money correctly after the change,
with no formatting artifacts and no incorrect totals.

**Why this priority**: A storage change is only invisible if every reader is
correct; a missed reader shows decimals, "NaN", or wrong totals to customers.

**Independent Test**: Can be fully tested by visiting every page that displays
money and confirming each shows a correctly formatted whole Toman amount, and by
confirming the structured data and assistant answers report the same values.

**Acceptance Scenarios**:

1. **Given** any page displaying a price, **When** the page is viewed, **Then** the
   amount is formatted as a whole Toman number with thousands separators and no
   decimal part.
2. **Given** an order summary, **When** it is displayed, **Then** the line items
   and the total are whole Toman amounts and the total equals their sum.
3. **Given** structured product data consumed by search engines, **When** it is
   inspected, **Then** the price reported is the same whole Toman value the
   storefront shows, converted to the expected unit.
4. **Given** the AI assistant is asked about a product's price, **When** it
   answers, **Then** the amount it reports matches the stored whole Toman price.

---

### Edge Cases

- A pre-existing value that already has two decimal places: the conversion must
  round it to a whole Toman value once, in a defined direction, and that value is
  then the authoritative record; repeated conversions must be stable and must not
  drift.
- A product priced below 1 Toman before the change: rounding must not silently
  produce a zero-priced product that shoppers can buy for nothing; such values are
  flagged for an administrator to review.
- An order total that is large but within the supported integer range must remain
  exact; a value at or beyond the supported range must be refused rather than
  silently truncated.
- A coupon whose stored value is a percentage must continue to be interpreted as a
  percentage, and one whose value is a Toman amount must continue to be
  interpreted as an amount; the conversion must not swap the two meanings.
- A product or variant edited after the change must not reintroduce fractional
  Toman through the admin form or the AI assistant.
- Coupon arithmetic that previously produced fractional Toman must now round to
  whole Toman in a defined direction so a shopper is never charged a fraction.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All money values stored for products, variants, carts, orders, order
  items, and coupons MUST be whole Toman integers, with no fractional part.
- **FR-002**: Money storage MUST use a 32-bit integer type; any value that does not
  fit MUST be refused rather than truncated or wrapped.
- **FR-003**: The conversion of existing stored values MUST round each value to a
  whole Toman amount once, in a defined direction, and MUST be stable when applied
  more than once.
- **FR-004**: Pre-existing fractional values that would round to a non-positive
  amount, or that would make a purchasable item free, MUST be identified for
  administrator review rather than converted silently.
- **FR-005**: Percentage discounts and percentage coupons MUST be calculated on
  whole Toman and rounded half-up.
- **FR-006**: Fixed-amount coupons and all money arithmetic MUST produce whole
  Toman results; where a result would otherwise be fractional, the rounding
  direction MUST be fixed and consistent so a shopper is never charged a
  fraction of Toman.
- **FR-007**: Coupon value MUST continue to mean a percentage or a Toman amount
  according to the coupon's existing type, and the conversion MUST preserve that
  meaning exactly.
- **FR-008**: Product and variant price entry MUST accept and store whole Toman
  amounts, and MUST refuse fractional Toman input.
- **FR-009**: Cart and order totals MUST be computed from whole Toman inputs and
  MUST equal the sum of their components with no residual fraction.
- **FR-010**: Every user-facing money display MUST show a whole Toman amount with
  no decimal digits.
- **FR-011**: The order history of products purchased before the change MUST remain
  accurate and displayable.
- **FR-012**: Money values exposed to the AI assistant and to search-engine
  structured data MUST report the same whole Toman values the storefront displays.
- **FR-013**: All money-related automated tests MUST be updated to use whole Toman
  and MUST cover the rounding boundaries.
- **FR-014**: The change MUST be applied through a schema migration that can be
  applied to a database that already holds real data, and MUST NOT rely on
  destructive database pushes.
- **FR-015**: The change MUST NOT alter the Toman-to-IRR relationship already used
  when reporting prices to search engines.

### Key Entities

- **Product**: Carries a selling price and an optional price-before-discount, both
  whole Toman integers; the discount percentage is derived for display.
- **Product Variant**: Carries its own whole Toman selling price and optional
  price-before-discount.
- **Cart**: Holds whole Toman item subtotal, shipping, tax, coupon discount, and
  total.
- **Order**: Holds the same whole Toman totals as the cart at the time of purchase,
  plus a whole Toman coupon discount, and is the permanent record of what the
  shopper paid.
- **Order Item**: Holds the whole Toman unit price captured at purchase time.
- **Coupon**: Holds a single whole Toman-or-percentage value whose meaning is
  given by the coupon's type, plus a whole Toman minimum cart total.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: After the change, 100% of money values stored for products,
  variants, carts, orders, order items, and coupons are whole numbers with no
  fractional part.
- **SC-002**: 100% of money values that existed before the change are preserved to
  the nearest whole Toman and remain consistent with what shoppers were charged.
- **SC-003**: No shopper-facing page, order record, invoice, structured data, or
  assistant answer displays a fractional Toman value or a malformed amount.
- **SC-004**: Cart and order totals equal the exact sum of their line items and
  adjustments in 100% of test checkouts, with no rounding residual.
- **SC-005**: A full test checkout on the converted store produces order records
  identical in value to what the same checkout produced before the change.
- **SC-006**: The conversion is applied to a database holding real data without
  data loss, and applying it a second time changes nothing.

## Assumptions

- Prices in the store are already entered and displayed in Toman, so the change
  is a storage-representation change, not a currency change.
- The whole-number Toman assumption applies only to money. Measurements such as
  dimensions and weight, and ratings, keep their existing decimal representation.
- The supported integer range is far above any plausible single order value for
  this store; if a value ever approaches that ceiling, it is refused rather than
  silently truncated.
- The admin required-field and discount-input work depends on this change and is
  expected to follow it.
- Existing product, order, and coupon records are real business data; the
  conversion must be safe to apply to them.
