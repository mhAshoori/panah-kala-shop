# Feature Specification: Product Required Fields & Unified Discount Input

**Feature Branch**: `004-product-required-discount`
**Created**: 2026-09-25
**Status**: Draft
**Input**: User description: "in admin/products, there are some fields that must be required. this thing hasn't been implemented in this page. almost all of them are required. check it out modify it. prevent user from submitting the required fields that are empty. another problem is with the price and the 'price before discount' idk the mechanism of 'price before discount'. and there must be a simple field for discount that takes either the percentage or the lowered price and these two fields' values are related to each other. example 10% discount -> 100-10=90 would be the discounted price and vice versa. overall this data model for the products must be reconsidered again. if there are any thing related to discount in data model, try to use them and if they can't be used, them change the data model but with the least changes."

## Clarifications

### Session 2026-09-25

- Q: When the price of an already-discounted product is edited, what should happen to the discount? → A: Keep the discount percentage and recompute the price-before-discount, so the storefront still shows the same percentage off.
- Q: How should the discount control look in the product form? → A: A single discount percentage field; the price-before-discount and the final sale price are shown as derived, read-only values.
- Q: For a product with variants, how do discounts apply to the variant prices? → A: Per-variant and independent — each variant keeps its own price and price-before-discount pair with its own discount, and nothing cascades from the product.
- Q: When a percentage does not divide evenly, how should the stored numbers be rounded? → A: Round the money to two decimals and floor the displayed percentage, so the badge never overstates the discount. (Superseded by the money-storage answer below: money is whole Toman, rounded half-up.)
- Q: Money is to be stored as whole Toman (integer) instead of a two-decimal value. Which integer type, and how does it round? → A: 32-bit integer; round half-up to whole Toman and floor the displayed percentage. The money storage change is specified separately (005-money-int-migration) and lands first; this feature assumes integer money.
- Q: Coupon.value holds either a percentage or a Toman amount in one column. How should integer money handle it? → A: Keep it as a single integer column — both uses are already whole numbers, so the coupon model and its logic are unchanged.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Required product fields are enforced (Priority: P1)

An administrator creates a new product in the admin panel. They must not be able
to submit or save a product with any mandatory field left blank — the form blocks
the attempt, points at the offending fields, and the saved record is guaranteed
complete regardless of how the request was sent.

**Why this priority**: An incomplete product reaching the storefront is a direct
data-integrity failure (blank name, blank brand, no price, no images) and is the
core of the reported problem.

**Independent Test**: Can be fully tested by submitting the product form with each
mandatory field individually blank and observing that submission is refused with
a field-specific message, and by confirming that a fully filled form still saves.

**Acceptance Scenarios**:

1. **Given** the new-product form with every mandatory field filled, **When** the
   administrator submits, **Then** the product is created and the confirmation
   dialog reports success.
2. **Given** the new-product form with the product name blank, **When** the
   administrator attempts to submit, **Then** submission is refused and the name
   field is flagged with a message; no product is created.
3. **Given** the new-product form with the price blank, **When** the administrator
   attempts to submit, **Then** submission is refused and the price field is
   flagged; no product is created.
4. **Given** the new-product form with no images added, **When** the administrator
   attempts to submit, **Then** submission is refused and the image section is
   flagged; no product is created.
5. **Given** the new-product form with stock blank, **When** the administrator
   attempts to submit, **Then** submission is refused and the stock field is
   flagged; no product is created.
6. **Given** the edit form of an existing product opened with one mandatory field
   cleared, **When** the administrator saves, **Then** the save is refused and the
   product in the database is unchanged.
7. **Given** any submission that bypasses the browser (direct request, scripted
   call), **When** a mandatory field is empty, **Then** the server refuses the
   write and no product is created or modified.

---

### User Story 2 - One discount field that drives both prices (Priority: P1)

An administrator sets a price and, if the product is on sale, types a single
discount percentage. The form immediately shows the resulting price-before-discount
and sale price, and the storefront shows the same numbers the administrator
entered.

**Why this priority**: The current "price before discount" field is
counter-intuitive and its meaning is unclear to the administrator; the two
prices must stay consistent or storefront discount badges and sale prices become
wrong.

**Independent Test**: Can be fully tested by entering percentages on several
products, checking the derived price-before-discount and sale price update as
the administrator types, editing the price and confirming the percentage is
preserved, and confirming the storefront displays the expected sale price and
discount badge.

**Acceptance Scenarios**:

1. **Given** a price of 100 and no discount entered, **When** the administrator
   views the form, **Then** the product is shown as not discounted, the
   price-before-discount is empty, and no discount badge appears on the storefront.
2. **Given** a price of 100, **When** the administrator types 10 into the discount
   field, **Then** the derived price-before-discount becomes 111.11 and the
   sale price becomes 100, matching the typed percentage exactly.
3. **Given** a price of 100 and a price-before-discount of 120 stored from an
   earlier save, **When** the administrator opens the edit form, **Then** the
   discount field shows 17 (the percentage rounded down) and the two prices are
   shown, consistent with what the storefront displays.
4. **Given** a price of 100, **When** the administrator enters a percentage of 0
   or leaves it empty, **Then** the product is saved as not discounted, the
   price-before-discount is cleared, and no discount badge is shown on the
   storefront.
5. **Given** a price of 100, **When** the administrator enters a percentage of 100
   or more, **Then** the entry is refused with a message on the discount field,
   because a free or negative-priced product is not sellable.
6. **Given** a price of 100, **When** the administrator types 10 into the discount
   field, **Then** the price-before-discount and sale price update immediately as
   the administrator types, without a save.
7. **Given** a product saved at 10% discount, **When** the administrator raises
   the price from 100 to 120 and saves, **Then** the discount field still shows 10
   and the price-before-discount is recomputed accordingly, so the storefront
   still shows a 10% discount.
8. **Given** a product that was already discounted, **When** the administrator
   clears the discount field and saves, **Then** the product keeps its price and
   the price-before-discount is cleared.
9. **Given** a product with per-variant prices, **When** the administrator edits
   a variant's price and discount, **Then** each variant has its own independent
   discount, the derived price-before-discount and sale price update for that
   variant only, and the product page shows the correct variant price and badge.

---

### User Story 3 - Optional fields stay optional and never block saving (Priority: P2)

An administrator leaves genuinely optional product details — physical dimensions,
weight, banner image, and similar — blank, and the product still saves and appears
correctly on the storefront.

**Why this priority**: Over-requiring optional details would make the form
cumbersome and would regress existing products that legitimately have no
dimensions.

**Independent Test**: Can be fully tested by saving a product with all optional
fields blank and confirming it saves, appears in the catalog, and shows no empty
placeholder on its detail page.

**Acceptance Scenarios**:

1. **Given** a fully filled mandatory form with dimensions and weight blank,
   **When** the administrator saves, **Then** the product is created and the
   storefront detail page shows no dimension or weight section.
2. **Given** an existing product that has dimensions, **When** the administrator
   opens the edit form, **Then** the stored dimensions are shown and are preserved
   unless the administrator changes them.

---

### Edge Cases

- A product is saved with a 10% discount, then the administrator raises the price
  from 100 to 120: the discount percentage is preserved and the
  price-before-discount is recomputed, so the storefront still shows 10% off.
- A product is saved with a discount, then the administrator clears the discount
  entirely: the price-before-discount is cleared with it, and the storefront stops
  showing a discount badge.
- A price does not divide evenly by the discount percentage: the derived
  price-before-discount is rounded half-up to whole Toman, and the percentage
  shown on the storefront is rounded down so the badge never claims more than the
  shopper actually saves.
- A percentage is entered for a product that has multiple variants: the
  product-level discount applies only to the product-level price, and each variant
  keeps its own independent price pair and its own discount.
- The administrator types into the discount field while the price field is still
  empty: the derived values stay blank and no error appears until the price is
  filled in.
- The slug is left blank but the product name is filled: the slug is
  auto-generated from the name rather than blocking the save, since a duplicate
  slug is the only real error condition.
- Extremely long names or descriptions: the field is truncated or refused with a
  clear message rather than failing silently at save time.
- Images: a single image URL added twice is accepted but stored once, so the
  product page never shows a duplicate image.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The product form MUST mark every mandatory field as required in the
  user interface, and MUST visually distinguish mandatory from optional fields.
- **FR-002**: The product form MUST block submission while any mandatory field is
  empty, and MUST identify each offending field with a field-specific message.
- **FR-003**: The server MUST independently reject any product create or update
  whose mandatory field is empty, so a request that bypasses the browser cannot
  create an incomplete product.
- **FR-004**: Mandatory product fields are: English name, Persian name, slug,
  main category, brand, English description, Persian description, price, stock,
  and at least one image.
- **FR-005**: A product's price MUST be a positive monetary amount; zero and
  negative prices MUST be refused.
- **FR-006**: A product's stock MUST be a non-negative whole number; blank or
  negative stock MUST be refused.
- **FR-007**: Physical dimensions, weight, banner image, and product options are
  optional; leaving them blank MUST NOT block saving.
- **FR-008**: The product form MUST offer a single discount percentage field as
  the only discount input; the price-before-discount and the final sale price MUST
  be displayed alongside it as derived, read-only values.
- **FR-009**: Entering a discount percentage MUST derive the price-before-discount
  and the sale price and keep them consistent with the price at every point, so the
  administrator never has to compute the relationship manually.
- **FR-010**: A discount exists only when the price-before-discount is strictly
  greater than the selling price; a zero, equal, or lower price-before-discount
  means "not discounted" and MUST NOT produce a discount badge.
- **FR-011**: A discount percentage of 100 or more, or a resulting sale price of
  zero or less, MUST be refused with a field-specific message.
- **FR-012**: Derived money values MUST be whole Toman, rounded half-up, and the
  discount percentage shown to the administrator and on the storefront MUST be
  rounded down, so a displayed percentage never overstates the actual saving.
- **FR-013**: The stored price and price-before-discount MUST be the single source
  of truth for the storefront's displayed price and discount badge; the
  percentage is derived for display and MUST NOT be stored as a separate
  authoritative value. Because only two whole-number values are stored, the
  derived percentage is an approximation of the percentage the administrator
  typed, and the rounding direction is what guarantees the shopper is not
  misled: the badge MUST never show a saving larger than the actual saving
  between the two stored prices. **[Constraint discovered during 005
  implementation]** Whole-Toman granularity makes this unachievable below a
  price floor — a price of 7 Toman at a typed 10% needs a price-before-discount
  of 7.78, and rounding half-up to 8 yields a real saving of 1/8, which a badge
  would report as 12%. The form MUST therefore either refuse a discount whose
  derived badge would exceed the typed percentage, or derive
  price-before-discount by rounding so the badge can only ever understate.
- **FR-014**: Opening an existing discounted product for editing MUST show the
  percentage, the selling price, and the price-before-discount, all consistent
  with what the storefront displays.
- **FR-015**: Discounts MUST be set per variant and MUST be independent of one
  another and of the product-level discount: each variant carries its own discount
  percentage control and its own price and price-before-discount pair, nothing
  cascades from the product to its variants, and the product page shows the
  selected variant's price and badge.
- **FR-016**: When a product's options or variants change such that the product's
  overall price changes, the product-level price-before-discount MUST remain
  consistent with the new price so the storefront never shows a stale discount.
- **FR-017**: When the price is edited on a discounted product, the system MUST
  preserve the discount percentage and recompute the price-before-discount from
  the new price, so the storefront continues to show the same percentage off; the
  system MUST NOT leave a price-before-discount that is less than or equal to the
  new price.
- **FR-018**: All new user-facing messages MUST exist in both Persian and English.
- **FR-019**: Discount derivation MUST be covered by automated tests that check
  percentage-to-price conversion, the whole-Toman rounding boundary, the floored
  displayed percentage, and the refusal cases.
- **FR-020**: Existing products that already have a price-before-discount must
  continue to display correctly, with no data migration required for products
  that have no discount.

### Key Entities

- **Product**: A sellable item. Mandatory descriptive fields (names, brand,
  descriptions, category), a selling price, a stock count, one or more images,
  and an optional price-before-discount that expresses a markdown from the
  price-before-discount to the selling price. The discount percentage is a
  derived presentation of the price/price-before-discount relationship, not an
  independently stored attribute.
- **Product Variant**: A purchasable combination of a product's option values,
  with its own selling price, stock, and optional price-before-discount that
  follows the same relationship as the parent product.
- **Product Option / Option Value**: Named choices (for example color) that
  define which variants exist for a product.
- **Discount**: The relationship between a selling price and a higher
  price-before-discount. Entered by the administrator as a percentage and always
  derivable back from the two stored prices, which remain the authoritative pair.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to save a product with a mandatory field empty are
  refused with a field-specific message; zero incomplete products are created or
  modified through any path, including direct requests that bypass the browser.
- **SC-002**: An administrator can set a product's discount by typing a percentage
  into a single field, and the form shows the price-before-discount and sale price
  that follow from it immediately, with no manual calculation and no second
  editable field; when whole Toman makes the exact percentage unrepresentable, the
  form shows the percentage that its own numbers actually produce.
- **SC-003**: For every product shown on the storefront with a discount, the
  displayed sale price and the price-before-discount match the prices the
  administrator entered, and the displayed discount percentage never claims a
  saving larger than the difference between the two displayed prices — for any
  price at or above the whole-Toman price floor the admin form enforces.
- **SC-004**: A fully completed product form saves in a single submission with no
  correction round-trip.
- **SC-005**: An administrator can understand the price and discount fields
  without external documentation, verified by the absence of support questions
  about the meaning of "price before discount" after the change.
- **SC-006**: Discount derivation is correct for all automated test cases,
  covering percentage-to-price conversion, the whole-Toman rounding boundary, the
  floored percentage badge, and the refusal cases.

## Assumptions

- Money is whole Toman stored as a 32-bit integer, and this feature assumes that
  storage is already in place; the storage conversion is specified separately in
  005-money-int-migration and lands before this feature is implemented.
- The existing product data model already stores a selling price and an optional
  price-before-discount, and the storefront already derives a discount percentage
  from that pair. This feature reuses that model rather than introducing a stored
  percentage; no new stored discount percentage is introduced.
- Persian is the default and primary display language; English is the secondary
  language, and both must carry every new message.
- Slug generation from the product name is already possible in the system; a blank
  slug is auto-generated rather than treated as a blocking error, since duplicate
  slugs remain a refusal case.
- Admin-only surface: this feature changes the admin product management form and
  the server-side validation for product writes; storefront pages change only in
  that the displayed discount must match the entered values.
- Discounts apply independently at the product level and at each variant level;
  nothing cascades between them, and each carries its own percentage control.
