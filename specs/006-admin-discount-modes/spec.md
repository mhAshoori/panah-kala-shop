# Feature Specification: Admin Discount Method Selection

**Feature Branch**: `006-admin-discount-modes`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "i'm not satisfied with result of 004 discount process: i want the base price plus the combination of percentage of discount which calculates the discounted price or the discounted price which calculates the discount percentage of the discount. so the discounted price or discounted percentage are a kind of selectives like radio buttons so the admin can choose which method he can approach to implement the discount for a product. and this can be added to all the diversities of a product. the current feature takes the price and a percentage and calculates the original price. this leads to some prices that i'm not interested in."

## Clarifications

### Session 2026-09-25

- Q: How many price fields should the admin see on a product? → A: One base-price
  field plus an explicit "on sale / not on sale" toggle. The base price is the
  normal price; when the product is on sale the base price becomes the original
  price and the discount method supplies the second value.
- Q: When the products' combinations carry different discounts, what should the
  product-level price and discount become? → A: Clear the product-level discount
  unless every purchasable combination agrees.
- Q: What should the storefront show when only some of a product's combinations
  are discounted? → A: A neutral note on the product card reading "تخفیف در برخی از
  تنوع‌ها" (discount on some of the variations), so the shopper is never told a
  percentage that only some combinations carry.
- Q: Which direction should the derived value round when the admin types a base
  price and a percentage? → A: Round down.
- Q: What should happen when a typed discount is too small to produce any honest
  percentage? → A: Set a low range limit in the admin panel so the administrator
  cannot make the mistake by accident — warn in the panel that the discount
  percentage must be at least 1 percent, on both new and existing products.
  Additionally, every discount price and every percentage must be a whole number,
  and any value the system derives MUST be truncated toward zero so the derived
  numbers sit as close to the exact figure as a whole number allows.

## Problem

Feature 004 gave the admin exactly one way to express a discount: type the
selling price and a percentage, and the system works backwards to invent a
"price before discount". That is backwards for most real pricing decisions. An
admin who knows the original price was 4,500 and the sale price is 3,900 has to
reverse-engineer a percentage that produces 4,500 — and the derived percentage
will rarely be a round number, or will even land on a different number entirely
after the whole-Toman rounding. The admin cannot type either of the two numbers
they actually know.

The stored discount representation is fine and is not what this feature
replaces. What is missing is the choice of which of the two numbers is an
input and which is a result.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin chooses which discount number to type (Priority: P1)

An administrator pricing a product types one base price — the normal price — and
flips an explicit "on sale" toggle. While the product is not on sale, the base
price is simply the price it sells at. Once the admin puts the product on sale,
the base price becomes the original price and a method control appears letting
the admin express the discount either as a percentage of that original price or
as the final discounted price. In percentage mode the admin types the percentage
and the system shows the discounted price. In price mode the admin types the
discounted price and the system shows the percentage. In both cases the admin
reads the other number live before saving, and the numbers they typed are never
rewritten by rounding.

**Why this priority**: This is the whole point of the feature. Without the
choice, the admin still cannot type the number they know.

**Independent Test**: Open any product in the admin panel, toggle it on sale,
switch the method control, type known values, and confirm the complementary
number appears live and matches the expected arithmetic. Fully usable with no
other story.

**Acceptance Scenarios**:

1. **Given** a product not on sale with a price of 4,500, **When** the admin
   looks at the form, **Then** only the base price and the "not on sale" state
   are shown, and no method control or derived value is present.
2. **Given** a product not on sale, **When** the admin turns the product on sale
   and selects "discount by percentage" and types 10, **Then** the discounted
   price shows 4,050 immediately and the saving shows 450.
3. **Given** a product not on sale, **When** the admin turns the product on sale
   and selects "discount by price" and types 3,900 as the discounted price,
   **Then** the discount shows 13% immediately and the saving shows 600.
4. **Given** a product that already carries a saved discount, **When** the admin
   opens the editor, **Then** the product is shown on sale, a method is pre-set,
   the base price holds the stored original price, the method's input holds the
   other stored value, and no stored number is silently changed.
5. **Given** a product on sale, **When** the admin turns the "on sale" toggle
   off, **Then** the product saves with no discount and the base price remains
   the price it sells at.

---

### User Story 2 - The same choice is available on every product variation (Priority: P2)

A product with options (colour, size, and so on) shows a row per combination. In
each row the admin can independently choose the discount method and type the
numbers for that combination. One variant can be discounted by percentage while
another is discounted by price, and neither affects the other.

**Why this priority**: Variants carry their own price and their own discount, so
a method that only works on the product level would leave the harder half of the
catalog unmanageable. Deliberately after P1 so the single-product case is
valuable on its own.

**Independent Test**: Create a product with two combinations, set different
methods and different values on each, save, reload, and confirm each row comes
back exactly as entered.

**Acceptance Scenarios**:

1. **Given** a product with two colour combinations, **When** the admin sets
   the first row on sale in percentage mode at 10% and the second on sale in
   price mode at 3,900, **Then** each row shows its own complementary value and
   saving preserves both independently.
2. **Given** a combination row in price mode, **When** the admin edits that
   row's base price, **Then** the other number in that row recomputes from the
   still-entered discount value rather than keeping a stale result.
3. **Given** a product where only some combinations are sold, **When** the admin
   edits discounts, **Then** unsold rows are not submitted and cannot corrupt
   the product-level price.
4. **Given** a product whose combinations carry different discounts, **When** the
   admin saves, **Then** the product-level price is the cheapest purchasable
   price and the product-level discount is cleared, so the product itself never
   advertises a discount it does not honour.

---

### User Story 3 - Bad input is caught, and small discounts are flagged before they cost anything (Priority: P3)

Values the store outright cannot represent — a discount of 100% or more, a price
beyond the largest storable amount, a fractional percentage, or a "discounted"
price that is not actually lower — are refused with a clear message naming the
offending field. Separately, a discount that is merely *too small to show*
produces a warning in the admin panel, not a refusal and not a silent correction:
the admin is told the percentage must be at least 1 percent, sees it on existing
products as well as new ones, and the storefront simply shows no discount
indicator rather than an invented one.

**Why this priority**: Feature 004 already established that the badge must never
overstate the real saving, and this feature removes the 100 Toman refusal that
was enforcing it for small percentages. The replacement has to be stated: bad
input still refused, small input warned, nothing silently altered.

**Independent Test**: Enter each out-of-range combination and each too-small
combination on a product and confirm which refuse, which warn, and that no
numeric value is silently altered in any case.

**Acceptance Scenarios**:

1. **Given** a percentage of 100 or more in either mode, **When** the admin
   attempts to save, **Then** the save is refused and the field is named in the
   message.
2. **Given** a price above the largest storable whole-Toman amount, **When** the
   admin attempts to save, **Then** the save is refused rather than truncated.
3. **Given** a fractional percentage such as 12.5, **When** the admin attempts to
   save, **Then** the save is refused and the requirement for a whole number is
   stated.
4. **Given** a discounted price at or above the base price in price mode, **When**
   the admin attempts to save, **Then** the save is refused rather than swapped.
5. **Given** a base price below 100 Toman with a percentage discount, **When** the
   admin types it, **Then** the panel warns that the percentage must be at least
   1 percent, and the warning is shown while editing an existing product just as
   it is while creating one.
6. **Given** the same too-small discount is saved, **When** a shopper views the
   product, **Then** no discount indicator of any kind is shown for it.
7. **Given** any refused combination, **When** the admin switches method, **Then**
   the values already typed are carried across so nothing is retyped.

---

### Edge Cases

- The admin turns a product on sale and leaves the discount field empty — the
  product saves with no discount; the toggle reflects that no discount is stored.
- The admin types a percentage below 1, or a base price below 100 Toman with a
  percentage — the panel warns about the 1 percent minimum, the save is **not**
  refused, and the typed value is stored unchanged.
- A saved discount so small that the stored pair is identical (a percentage that
  truncates away entirely) — the product carries no discount, the storefront
  renders no discount indicator, and the admin saw the warning before saving.
- The admin types a discounted price equal to the base price in price mode — this
  is a zero discount, not an error, and the product saves with no discount badge.
- The admin types a discounted price **above** the base price in price mode — this
  is refused, because a "discount" that raises the price is not a discount.
- Percentage mode with a percentage of 0, or an empty field — no discount.
- The admin types a fractional percentage, or a fractional money value, in either
  field — refused, in both the browser and the server, with the whole-number
  requirement stated.
- The admin edits the base price in percentage mode — the discounted price
  recomputes from the percentage still in the field.
- The admin edits the base price while not on sale — the price simply changes;
  no derived value is involved.
- An existing product saved under feature 004 has a stored price pair whose
  percentage is not a round number (for example a stored pair that reads 9%).
  Opening it must not silently rewrite either stored number; the admin sees the
  stored pair and can round it deliberately.
- An existing product whose stored pair represents a sub-1% saving — opening it
  shows the same 1 percent warning as a new product would, and does not rewrite
  the stored pair.
- The admin switches method repeatedly without typing — the numbers must not
  drift with each toggle.
- The admin toggles "on sale" on and then off without typing — the base price is
  unchanged and the product ends with no discount.
- A product with no options must not show any per-variant discount control.
- A product with options but only one combination behaves the same as a
  product with no options.
- Percent or price fields left empty while the product is on sale — treated as
  "no discount", not as an error, matching the current behaviour.
- Two combinations carry discounts with the same ratio but entered by different
  modes (one via percentage, one via price) — the product-level discount is
  retained, because the rule compares ratios, not the mode the admin happened to
  use.
- A combination that is turned off sale while its siblings stay on sale — the
  product-level discount is cleared and the listing shows the partial-variation
  note.
- The product-level price is the cheapest purchasable combination, but that
  cheapest combination is not discounted while a dearer one is — the listing
  shows no product-level percentage, and the partial-variation note appears if any
  purchasable combination is discounted.
- Every purchasable combination is discounted, but by differing ratios — the
  product-level discount is cleared and the partial-variation note appears; the
  struck-through price on the card is omitted because there is no single product
  price to strike through.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The admin product form MUST present a single explicit "on sale"
  control that the administrator turns on and off, and when it is off the product
  MUST be presented as having no discount and MUST show no discount method or
  derived value.
- **FR-002**: When the product is on sale, the form MUST present a mutually
  exclusive choice between two discount methods — expressed as a percentage, or
  expressed as a discounted price — as one visible control in which exactly one
  option is selected at a time.
- **FR-003**: The form MUST present exactly one editable price field, the base
  price. When the product is not on sale this is the price it sells at; when the
  product is on sale this is the original price and the method's field supplies
  the second value.
- **FR-004**: In **percentage mode**, the administrator MUST be able to type the
  percentage, and the system MUST present the resulting discounted price as a
  read-only value that updates immediately as the base price or percentage
  changes.
- **FR-005**: In **price mode**, the administrator MUST be able to type the
  discounted price, and the system MUST present the resulting discount percentage
  as a read-only value that updates immediately as the base price or discounted
  price changes.
- **FR-006**: In both modes the system MUST also present the saving in whole
  Toman as a read-only value.
- **FR-007**: A value the administrator typed MUST be stored as typed. Rounding
  of a computed value MUST NOT alter either of the two numbers the
  administrator entered.
- **FR-008**: Any value the system computes for display — the discounted price in
  percentage mode, the percentage in price mode, and the percentage the
  storefront badge shows — MUST be rounded **down**, so the advertised discount is
  never larger than what the stored pair actually represents.
- **FR-009**: The stored discount representation MUST remain the selling price
  and the original price pair. Neither the chosen method nor the percentage MUST
  be stored as a separately authoritative value; the percentage is always
  derived from the stored pair wherever it is displayed, so the admin panel and
  the storefront can never disagree.
- **FR-010**: When a product is opened for editing, the "on sale" control MUST
  reflect whether a discount is stored, a method MUST be pre-set, and the base
  price and the method's field MUST be populated from the stored price pair
  without changing either stored value.
- **FR-011**: A discount value of empty or zero MUST save the product with no
  discount.
- **FR-012**: The same "on sale" control, method choice, base price and discount
  field MUST be available independently on every product combination row, and a
  change to one row MUST NOT alter any other row or the product-level values.
- **FR-013**: Each product combination row MUST be able to use a different
  method from every other row.
- **FR-014**: When a product combination row's base price is edited while the row
  is on sale, the other value in that row MUST recompute from the discount value
  still entered in that row.
- **FR-015**: The product-level price MUST be the cheapest price among the
  purchasable combinations, and the product-level discount MUST be retained only
  when **every** purchasable combination carries the same original-price-to-price
  ratio; otherwise the product-level discount MUST be cleared so the product
  never advertises a discount that not every purchasable combination honours.
- **FR-016**: When a product's combinations carry differing discounts, the
  storefront product listing MUST show a neutral note reading "تخفیف در برخی از
  تنوع‌ها" (discount on some of the variations) **instead of** a single
  percentage. When every purchasable combination agrees, the listing MUST show
  the ordinary percentage badge instead of the note. In neither case is the
  product-level price and original-price pair changed to make a percentage
  appear.
- **FR-017**: The system MUST refuse to save a discount of 100% or more, a
  monetary value above the largest storable whole-Toman amount, a non-whole
  percentage, and a discounted price that is not lower than the base price in
  price mode, and MUST name the offending value in the message.
- **FR-018**: The admin panel MUST warn, before save, whenever a typed percentage
  would round away to less than a 1% saving — a percentage below 1, or a base
  price below 100 Toman — stating that the discount percentage must be at least
  1 percent. This applies identically when creating a product and when editing an
  existing one, and the warning MUST be shown in the panel whether or not the
  product has variations, because it is the administrator who must avoid the
  mistake. The warning MUST NOT be suppressed by the system's own defaults.
- **FR-019**: The warning in FR-018 MUST be advisory only. A small percentage MUST
  NOT be silently converted, silently raised to 1%, or silently discarded: the
  administrator's typed value is what is stored, and if the resulting pair cannot
  produce an honest percentage then the product carries no discount and the
  storefront renders no discount indicator for it.
- **FR-020**: A refusal MUST leave the administrator's entered numbers on screen
  so the values can be corrected or carried into the other method rather than
  retyped.
- **FR-021**: Switching method or toggling the product on or off sale MUST carry
  the currently displayed numbers across so the administrator does not lose work,
  and repeated switching without typing MUST NOT cause the numbers to drift.
- **FR-022**: The discount badge the storefront displays for a product with no
  combinations MUST be derived from the stored price pair and MUST never state a
  saving larger than the real difference between those two stored values.
- **FR-023**: The system MUST accept no discount at all, which is represented by
  a null original price, and MUST render no badge in that case.
- **FR-024**: The system MUST continue to accept and display existing products
  whose stored pair predates this feature, without requiring a data change and
  without rewriting any existing row on load.
- **FR-025**: Every new user-facing label, hint, and refusal message introduced by
  this feature MUST exist in both supported languages, and the existing
  requirement that the two message sets never diverge MUST continue to hold.
- **FR-026**: The rules that determine the resulting price or percentage MUST be
  implemented once, independently of the form, and MUST be covered by automated
  tests that exercise them without a browser.
- **FR-027**: Every stored monetary value MUST remain a whole number of Toman
  within the range the storage can hold, whether it was typed by the
  administrator or computed by the system.
- **FR-028**: The server MUST re-validate every discount and price on submission
  and MUST NOT trust a value sent from the browser, including a value the browser
  displayed as read-only.
- **FR-029**: A product with no option combinations MUST NOT display any
  per-combination discount control.
- **FR-030**: The administrator MUST be able to turn a product or any single
  combination row off sale, and turning one row off MUST NOT turn another off.

### Key Entities

- **Product**: the item being priced. Carries a selling price and an optional
  original price. On a product with combinations, both are derived from the
  combinations rather than typed.
- **Product Combination (variant)**: one purchasable configuration of a product.
  Carries its own selling price and its own optional original price.
- **On-Sale State**: whether the administrator has marked a product or a
  combination as discounted. Present on the form as an explicit toggle. Never
  stored as its own flag — a product is on sale exactly when an original price is
  stored alongside its price.
- **Discount Method**: the administrator's per-row choice of which of the two
  numbers to type, once the row is on sale. It is an input-side concern only and
  is not stored as a separate authoritative value; what is stored is always the
  resulting price pair.
- **Partial-Variation Discount**: a product whose purchasable combinations do not
  all share the same discount. Rendered as a neutral note rather than a
  percentage. A presentation state, never stored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In usability testing, 100% of administrator attempts to enter a
  known original price and a known sale price are completed without the
  administrator first having to reverse-engineer a percentage, where before this
  feature no such attempt was possible at all.
- **SC-002**: Across a matrix of base prices and discount values entered in both
  modes, 100% of the computed values agree with the administrator's own
  arithmetic, with any difference attributable solely to rounding down to a whole
  Toman.
- **SC-003**: 100% of stored discounts, across every product and combination
  sampled after the change, are such that the advertised saving never exceeds
  the real difference between the stored selling price and the stored original
  price, and 0 products with differing combination discounts show a single
  percentage on a listing.
- **SC-004**: 100% of administrator save attempts carrying an outright invalid
  discount are refused with a message that names the offending value; 100% of
  too-small discounts are warned about in the panel before the save; 0 values are
  silently altered, silently raised, or silently dropped in either case.
- **SC-005**: Every administrator-facing string introduced by this feature is
  present in both supported languages, verified by the existing message-parity
  check, and no administrator question about how to enter a discount is required
  to complete the task.
- **SC-006**: An administrator can set a discount on every combination of a
  multi-combination product, using different methods per row, in a single
  editing session with no page reload and no loss of previously entered rows.

## Assumptions

- The existing money model is retained: whole Toman stored as an integer, with
  the existing largest-storable-value ceiling. This feature changes how the
  administrator expresses a discount, not how money is stored.
- The stored pair (selling price, original price) remains the only authoritative
  representation. The on-sale state and the chosen method are input affordances,
  not persisted state, and are re-derived on load from the stored pair.
- The one-way "only a percentage can be typed" rule introduced by feature 004 is
  deliberately withdrawn, and so is its 100 Toman minimum-price refusal for
  percentage discounts. That refusal is replaced by the advisory 1 percent
  warning in FR-018, on the explicit instruction that the administrator must be
  warned in the panel rather than stopped by a rule. Feature 004's guarantee that
  the badge cannot overstate the real saving continues to hold, and is now stated
  explicitly in FR-008 rather than emerging as a side effect of the floor.
- "Truncated" is taken to mean toward zero, matching the floor-rounding rule
  already in use. For a discount the derived value is always below the exact
  figure, so truncation and floor coincide; the direction only matters for the
  percentage read back out of a stored pair, where it too floors.
- Storing a sub-1% discount that produces an identical price pair is treated as
  storing no discount. The two are indistinguishable downstream, so the storefront
  renders nothing for either, and no repair is attempted on load.
- "Same discount" across combinations is defined as the same **ratio** of
  original price to selling price, compared after rounding down. Two rows
  entered through different methods with the same ratio therefore count as
  agreeing. The comparison is a whole-number cross-multiplication
  (`cmpA × priceB === cmpB × priceA`), never a float equality test.
- Products already saved keep working unchanged. No data migration is required,
  and no existing row is rewritten by opening the editor.
- Prices the administrator types are trusted as typed within the valid range;
  the read-only companion value is the only thing the system computes for
  display, and the server recomputes the same pair from the submitted numbers
  rather than accepting a computed value from the browser.
- Retail convention is assumed: the original price is the higher number and the
  discounted price is the lower one. A price presented as a discount that is not
  lower is refused rather than silently swapped.
- The partial-variation note is a **storefront listing** addition. The product
  detail page already lists per-combination prices and is left alone; adding the
  note there as well is out of scope.
- The number of messages, their wording, and their right-to-left presentation
  follow the existing bilingual and layout conventions of the admin panel.
- The admin panel's existing layout, component set, and form submission pattern
  are reused rather than replaced.
