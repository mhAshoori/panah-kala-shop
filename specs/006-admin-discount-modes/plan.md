# Implementation Plan: Admin Discount Method Selection

**Branch**: `006-admin-discount-modes` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/006-admin-discount-modes/spec.md`

## Summary

Feature 004 gave the admin exactly one way to express a discount: type the
selling price and a percentage, and the system worked backwards to invent a
price-before-discount. That is backwards for real pricing — an admin who knows
the original was 4,500 and the sale is 3,900 cannot type either number.

This feature adds an explicit **on-sale toggle** and, once on, a **method
choice**: express the discount as a percentage of a base price (the system
derives the selling price), or express it as a selling price (the system
derives the percentage). One base-price field, two methods, the third number
always read-only and live. Available per product and independently per
combination row.

Three things fall out of it that are not obvious:

1. **The rounding direction inverts.** 004 floored the *derived original* price,
   which made the badge read low. Deriving the *selling* price floors the other
   way and the badge reads **high** — 668 verified overstate cases (research.md
   R-001). The fix is floor-then-bump, which is byte-identical to 004's floor
   for every product above 100 Toman, so nothing 004 could already save changes.
2. **The product-level discount becomes conditional.** 004's `recomputeParent`
   takes `min(compareAtPrice)`, so variants `[{1000, 1111}, {1000, null}]` yield
   a parent badge of 9% when only one of two variants is discounted. The
   clarification settles it: clear the product-level discount unless every
   purchasable variant agrees on ratio, and show "تخفیف در برخی از تنوع‌ها" on
   the card instead of a percentage.
3. **004's 100 Toman refusal becomes an advisory warning**, per the
   clarification. A sub-1% discount now stores an identical price pair and
   renders no badge — honest, but the admin must be warned first (FR-018).

**No schema change.** The stored pair stays authoritative; the method and the
on-sale state are re-derived on load (research.md R-002).

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22
**Primary Dependencies**: Next.js 16 (App Router, Turbopack), React 19,
Prisma 7 (`prisma-client` generator → `lib/generated/prisma/`),
`@prisma/adapter-pg`, zod, `radix-ui` ^1.6.7 (already provides the radio group
and switch primitives this feature needs — research.md R-010)
**Storage**: PostgreSQL (dev Neon, prod local PG on the VPS). **No schema
change** — money is already whole-Toman `Int` from 005, and
`Product.price` / `compareAtPrice` / `ProductVariant.price` /
`ProductVariant.compareAtPrice` already hold everything needed. The method and
the on-sale state are never stored.
**Testing**: Jest 30 via `next/jest`, `testEnvironment: 'node'`, tests only
under `__tests__/**/*.test.ts`. Gate before every commit: `npx tsc --noEmit` →
`npm run lint` → `npm test` → `npm run build`. **Plus a browser-preview
verification pass at the end covering both the admin panel and the storefront**
— see [Browser Verification](#browser-verification) below and Phase 7 of
[quickstart.md](quickstart.md).
**Target Platform**: Node server (Vercel dev / VPS production), Node 22
**Project Type**: Web application (storefront + admin, one Next.js app)
**Performance Goals**: No new measurable target. Each derivation is a single
`Math.floor` plus, in the sub-100-Toman regime only, a short `while` that adds
at most a few Toman (research.md R-001). The listing gains a 2-column-per-variant
`include` on queries already bounded to 12–24 products (R-005).
**Constraints**: No new dependency — `components/ui/radio-group.tsx` and
`components/ui/switch.tsx` already exist. The admin form has no client-side
schema today and must not gain one; HTML controls plus server-side zod is the
established idiom and constitution principle VII argues against a new validation
pattern for one form.
**Scale/Scope**: 2 admin components (`product-form.tsx`, `options-editor.tsx`),
1 rewritten pure helper (`lib/discount-math.ts`), 1 modified helper
(`lib/variants.ts`), 1 storefront component (`product-card.tsx`), 5 listing
queries, 2 message files, 3 test files. No migration, no `prisma generate`.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|---|---|---|
| I. Professional Iranian Ecommerce First | PASS | Admin manages every storefront capability. The storefront gains a real surface: an honest "discount on some variations" state where today it shows a percentage that not every variant honours. The admin's expressible intent strictly grows. |
| II. Money & Data Integrity (NON-NEGOTIABLE) | PASS, strengthened | This feature exists to serve this principle. The 004 badge invariant survives the direction inversion only because R-001 re-derives the rule and measures it (0 overstate in 29,860 combinations vs 668 for plain floor). The server re-derives the pair from the two submitted numbers (R-009), so no client-computed value is ever trusted — strictly stronger than 004, which submitted a client-computed `compareAtPrice` hidden input. |
| III. Security & Authorization by Default | PASS | No auth change. The trust boundary **moves**: the server no longer receives a pre-computed `compareAtPrice` and instead re-derives it (R-009), which removes one class of client-manipulated value. Validator gains the whole-number and strictly-lower rules (FR-017). |
| IV. Bilingual Completeness (NON-NEGOTIABLE) | PASS | New keys added to **both** `messages/fa.json` and `messages/en.json`; the parity test enforces it. `discountNeedsMinPrice` changes from a refusal string to an advisory one in both files. The one mandated literal, "تخفیف در برخی از تنوع‌ها", is the fa side of the new `product`-namespace key (R-011). |
| V. Test & E2E Verification | PASS | The pure helper gains an executable form of the safety invariant (as 004 did), now in the inverted direction. The user's standing instruction — browser verification in both admin and storefront at the end — is Phase 7 of quickstart and the final task phase. |
| VI. Data Layer Discipline | PASS | No schema change, so no migration, no `prisma generate`, no deploy step. The listing's new `include` is read-only. |
| VII. Efficiency & Simplicity | PASS | No new dependency, no client-side schema, no new component. The method control is the existing `radio-group`, the on-sale control is the existing `switch`. One pure helper holds the whole rule set; `getDiscount` is reused as-is. |

**Complexity Tracking**: no violations — no exception table required.

**Post-design re-check (Phase 1)**: unchanged. The design surfaced one conflict
between two user answers (Q4 truncation vs the badge-honesty guarantee), which
was escalated and resolved by measurement rather than by assumption; the
resolution *strengthens* principle II rather than diluting it. No gate moved
from PASS to FAIL.

## Project Structure

### Documentation (this feature)

```text
specs/006-admin-discount-modes/
├── plan.md              # This file
├── research.md          # Phase 0 — 11 decisions, incl. the rounding inversion
├── data-model.md        # Phase 1 — no schema change; derived-state definitions
├── quickstart.md        # Phase 1 — 16 scenarios incl. browser verification
├── spec.md              # Feature specification (30 FRs, 5 clarifications)
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code

```text
components/shared/admin/
├── product-form.tsx        # on-sale switch + radio group; submits typed numbers
└── options-editor.tsx      # same controls per combination row
components/shared/product/
└── product-card.tsx        # partial-variation note; strike-through self-suppresses
lib/
├── discount-math.ts        # REWRITTEN — floor-then-bump, price-mode, classify
├── discount.ts             # UNCHANGED — getDiscount already floors the badge
├── variants.ts             # MODIFIED — recomputeParent: clear unless all agree
└── validator.ts            # MODIFIED — whole-number percent, strictly-lower rule
lib/actions/
└── product.actions.ts      # MODIFIED — 5 listing queries gain a variants include
messages/
├── fa.json                 # new keys + discountNeedsMinPrice reworded
└── en.json                 # same
__tests__/lib/
├── discount-math.test.ts    # REWRITTEN — inverted invariant, both directions
├── variants.test.ts        # MODIFIED — agreement matrix
└── discount.test.ts        # UNCHANGED — getDiscount did not change
```

**Structure Decision**: the whole rule set lives in `lib/discount-math.ts` as
pure functions, following the `lib/category-visibility.ts` precedent that 004
established. Four exports: the two derivations (percentage→price, price→
percentage), the agreement test, and the three-way product classification. No
`contracts/` directory — this feature exposes no new external interface; the
server-action input *shape* changes (two typed numbers instead of one computed
one) but no route, API, or serialized contract does.

## Browser Verification

The user asked for a browser-preview test covering **both** the storefront and
the admin panel at the end of the process. This is a first-class part of the
plan, not a footnote — constitution principle V requires behaviour-changing
features be verified in a browser before being reported done, and the two sides
of this feature are the point of it.

Admin panel (`/admin/products/create`, then an existing product's edit page):

1. On-sale toggle off → only the base price is visible, no method control, no
   derived value.
2. Toggle on → method control appears; percentage mode and price mode each
   produce the complementary value live.
3. Type a 1% discount on a sub-100-Toman product → the advisory warning appears,
   the save succeeds, nothing is silently altered.
4. Type a fractional percentage → refused, field named.
5. A multi-variant product → set different methods and values per row, save,
   reload, confirm every row round-trips exactly.

Storefront (homepage / category / search listing, then the product page):

6. A product with uniform discount across all variants → the ordinary percentage
   badge.
7. A product with differing variant discounts → the "تخفیف در برخی از تنوع‌ها"
   note, **no** percentage, and **no** struck-through price.
8. A product with a sub-1% stored discount → no discount indicator at all.
9. The schema.org JSON-LD on the product page still reports the correct IRR
   price after the changes.

Scenarios 1–9 are written out in full, with the specific products to set up,
in Phase 7 of [quickstart.md](quickstart.md).

## Phase 1 Design

### Data model

Recorded in [data-model.md](data-model.md). No schema change. The document
defines what is stored (unchanged), what is derived (on-sale state, method,
agreement, classification), the three state transitions (toggle on, toggle off,
method switch), and the validator deltas.

**The two things that need stating in review**:

- **R-001, the rounding inversion.** 004 floored a derived *original* price;
  this feature floors a derived *selling* price, which reverses the direction
  the badge error goes. Plain floor overstates in 668 verified combinations.
  Floor-then-bump is 0, and is identical to plain floor for every base ≥ 100
  Toman, so nothing 004 could save changes value.
- **R-005/R-006, the partial-variation path.** The product-level discount is
  cleared unless all purchasable variants agree, so `getDiscount` returns null
  for those products, so the card's existing strike-through and badge
  self-suppress. The card change is additive: one extra note.

### Interface contracts

None. No new route, API, CLI, or serialized contract. The product server
action's input *shape* changes — it now receives the two typed numbers plus
`onSale` and `discountMode` instead of a client-computed `compareAtPrice` —
and the stored shape is unchanged. That is a tightening of what the server
accepts, consistent with constitution principle III.

### Testing plan

| # | Check | Guards |
|---|---|---|
| 1 | `deriveSellPrice(4500, 10) === 4050`, `(1000, 25) === 750`, `(100, 10) === 90` | the common cases stay exact |
| 2 | `deriveSellPrice(99, 10) === 89`, `(49, 25) === 36` — the **+1 bump** cases | R-001, the sub-100 regime that plain floor gets wrong |
| 3 | **the safety invariant, inverted**: across a price/percent matrix, `badge(deriveSellPrice(price, percent), price)` is **never greater** than `percent` | the guarantee FR-008/FR-022 make, as an executable check. 004's test asserted this in the other direction; this one is 0 violations where plain floor is 668 |
| 4 | `derivePercent(base, sell)` returns the percent; the two derivations round-trip within 1 Toman | the price-mode path has the same coverage |
| 5 | percentage `0`/empty → no discount; `100`+ and fractional refused | FR-011, FR-017 |
| 6 | `isOnSale`, `resolveMode`, `variantsAgree` (incl. the exact-tie case that float equality fails), and the overflow guard | R-002, R-003, R-004 |
| 7 | `classifyProduct` → `uniformDiscount` / `partialDiscount` / `noDiscount` for the full matrix of variant combinations | R-005, and Q2/Q3's rule |
| 8 | `recomputeParent` clears `compareAtPrice` when variants disagree; keeps it when all agree | the 004 defect A-002 from the analyze pass |
| 9 | `insertProductSchema` rejects fractional percent, `compareAtPrice >= price`, and accepts the new two-number shape | FR-017, FR-027, FR-028 |
| 10 | Browser preview, admin + storefront, scenarios 1–9 | the user's explicit end-of-process requirement |

Tests are written before the code they cover and must be observed failing.

### Commit decomposition

Semantic commits, dependency-ordered so a bisect lands on a diagnosable
failure:

1. `refactor(discount): rewrite the derivation for the inverted direction` —
   `lib/discount-math.ts` + its test, including the 0-vs-668 invariant. Isolated
   because it contradicts the direction 004 committed, and it is the only piece
   where a regression would be a money-integrity bug.
2. `fix(variants): clear the product discount unless all variants agree` —
   `recomputeParent` + test. Isolated: it changes stored output on a real
   correctness defect, independent of the form work.
3. `refactor(validator): whole-number percent and strictly-lower selling price`
4. `feat(admin): on-sale switch and method choice in the product form` (+ i18n)
5. `feat(admin): method choice per combination row`
6. `feat(storefront): partial-variation note on the product card` (+ queries)
7. `docs(specs): 006 research, plan, data model, quickstart`

Commits 1 and 2 are independent and reviewable on their own; 4 depends on 1 and
3; 6 depends on 2.

## Summary of Changes

| Concern | Files | Risk |
|---|---|---|
| Rounding inversion | `discount-math.ts` + test | **High** — the one place a regression is a money-integrity bug; guarded by the 0-vs-668 invariant test |
| Parent discount rule | `variants.ts` + test | Medium — changes stored output on existing multi-variant products, in the honest direction |
| Server trust boundary | `validator.ts`, `product.actions.ts` | Low — strictly narrows what the server accepts |
| Form restructuring | `product-form.tsx`, `options-editor.tsx` | Medium — admin-facing, no shopper impact |
| Storefront note | `product-card.tsx`, 5 queries | Medium — shopper-facing; adds a state that did not exist before |
| i18n | `fa.json`, `en.json` | Low — parity test enforces |
| Verified unchanged | `discount.ts`, schema, actions' write paths | None — explicitly checked, not assumed |
