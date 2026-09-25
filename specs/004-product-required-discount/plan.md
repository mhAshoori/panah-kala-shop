# Implementation Plan: Product Required Fields & Unified Discount Input

**Branch**: `004-product-required-discount` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/004-product-required-discount/spec.md`

## Summary

Two related gaps in the admin product form. First, mandatory product fields
are marked `required` in the browser but not enforced consistently: images have
no client gate at all, and on the server `stock` has no integer or
non-negative rule, no positivity rule exists for `price`, and the category
errors are hard-coded English strings outside the bilingual message path.
Second, the admin types a "price before discount", which is counter-intuitive
and which the form never explains. This feature replaces that with a single
discount-percentage field that derives both prices live, refusing discounts
the whole-Toman grid cannot represent honestly.

No schema change. Money is already `Int` after 005-money-int-migration, and
`Product.price` / `compareAtPrice` already hold everything needed. The work is
the form, the validators, the message files, and one test that currently
asserts the opposite rounding rule.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22
**Primary Dependencies**: Next.js 16 (App Router), React 19, Prisma 7
(`prisma-client` generator → `lib/generated/prisma/`), `@prisma/adapter-pg`,
zod, Jest 30 via `next/jest` (node environment)
**Storage**: PostgreSQL (dev Neon, prod local PG on the VPS). Money is whole
Toman as `Int`; the discount percentage is **never stored** — it is derived
from the stored price pair wherever a badge is displayed.
**Testing**: Jest, `testEnvironment: 'node'`, tests only under
`__tests__/**/*.test.ts`. Gate before every commit: `npx tsc --noEmit` →
`npm run lint` → `npm test` → `npm run build`.
**Target Platform**: Node server (Vercel dev / VPS production), Node 22
**Project Type**: Web application (storefront + admin, one Next.js app)
**Performance Goals**: No measurable target. The derivation is a single
`Math.floor` on keystroke.
**Constraints**: No new dependencies. The form has no client-side schema
today (no zod, no react-hook-form) and should not gain one — HTML `required`
plus server-side zod is the established idiom, and the constitution's
principle VII argues against introducing a new validation pattern for one
form.
**Scale/Scope**: 2 components (`product-form.tsx`, `options-editor.tsx`),
1 new pure helper, 1 validator file, 2 message files, 2 test files. No
migration.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|---|---|---|
| I. Professional Iranian Ecommerce First | PASS | Admin panel manages every storefront capability, as required. The storefront gains no new surface; its badge becomes provably honest, which strengthens it. |
| II. Money & Data Integrity (NON-NEGOTIABLE) | PASS, strengthened | This feature exists to serve this principle. The badge can no longer overstate the saving — verified at 0 violations across 50,000 price/percent pairs. Prices are still re-derived server-side; no client-sent price is trusted. |
| III. Security & Authorization by Default | PASS | No auth change. Server-boundary validation is tightened: `stock` gains `.int().min(0)`, `price` gains positivity, and the variant path gains the `compareAtPrice > price` refine the parent already had. |
| IV. Bilingual Completeness (NON-NEGOTIABLE) | PASS | Four new keys added to **both** `messages/fa.json` and `messages/en.json`; the parity test enforces it. The hard-coded English category errors are moved onto the existing message path where touched. |
| V. Deployment & Ops Guardrails | PASS | No migration, no new deploy step, no env change. |
| VI. Data Layer Discipline | PASS | No schema change, so no migration and no `prisma generate`. |
| VII. Efficiency & Simplicity | PASS | No new dependency, no client-side schema, no inline-error system. `getDiscount` is reused as-is for the badge; the derivation is a pure helper in the same spirit as `lib/category-visibility.ts`. |

**Complexity Tracking**: no violations — no exception table required.

**Post-design re-check (Phase 1)**: unchanged. The design added one overflow
guard (FR-011) which *serves* principles II and VI. No gate moved from PASS
to FAIL.

## Project Structure

### Documentation (this feature)

```text
specs/004-product-required-discount/
├── plan.md              # This file
├── research.md          # Phase 0 — 7 decisions, incl. a live test that contradicts the design
├── data-model.md        # Phase 1 — field inventory, validation deltas, state transitions
├── quickstart.md        # Phase 1 — 14 runnable scenarios
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code

```text
components/shared/admin/
├── product-form.tsx     # discount field replaces compareAtPrice input; step 0.01 -> 1
└── options-editor.tsx   # same discount field per variant row
lib/
├── discount-math.ts     # NEW pure helper: deriveCompareAtPrice(price, percent) + validation
├── discount.ts          # UNCHANGED — getDiscount already floors the badge
├── variants.ts          # UNCHANGED — recomputeParent already takes numbers
└── validator.ts         # stock .int().min(0); price positivity; variant compareAt refine
lib/actions/
└── product.actions.ts   # UNCHANGED unless an error path needs a bilingual key
messages/
├── fa.json              # 4 new keys
└── en.json              # 4 new keys
__tests__/lib/
├── discount.test.ts       # REWRITE the half-up test (research.md R-002)
└── discount-math.test.ts  # NEW — derivation, floor rule, price floor, overflow
```

**Structure Decision**: one new file, `lib/discount-math.ts`, holding the pure
derivation so it is testable without a DOM and without duplicating the formula
between the two form components. It follows the existing
`lib/category-visibility.ts` precedent of a small pure module. **No
`contracts/` directory** — this feature exposes no new external interface; the
server-action contract is unchanged, only its validation tightens.

## Phase 1 Design

### Data model

Recorded in [data-model.md](data-model.md): the field-by-field inventory with
which gate currently exists on each side, the validation rules that change, the
derivation formula with all three cases, and the state transitions for new /
existing / cleared discounts.

**The rule that needs stating in review** (research.md R-001): floor
derivation and the 100 Toman price floor solve *different* problems and
neither is redundant. Floor derivation is what makes overstatement impossible
(0 violations vs 46 with half-up). The price floor is what stops a typed
discount from silently rendering no badge at all (204 combinations of
price 1–300 × percent 1/2/3/5/10 do exactly that).

### Interface contracts

None. No new route, API, CLI, or serialized contract. The product server
action's input shape is unchanged; its validation is tightened, which can only
reject requests that were previously malformed.

### Testing plan

**One test must be rewritten, not added.** `__tests__/lib/discount.test.ts`
currently has a test titled *"uses half-up rounding for the derived
price-before-discount"* asserting `Math.round(999999 * 100 / 67) === 1492536`.
The agreed rule is floor. Left alone it does not merely go stale — it would
fail the implementation and its title documents the opposite of the design
(research.md R-002).

New tests, all in `__tests__/lib/discount-math.test.ts`, against the pure
helper:

| # | Check | Guards |
|---|---|---|
| 1 | `deriveCompareAtPrice(1000, 10) === 1111`, `(1000, 25) === 1333`, `(2000, 10) === 2222` | the floor rule; quoted values verified against the implementation |
| 2 | percent `0`/empty → `null`; `100` and `120` rejected | FR-011 |
| 3 | the 100 Toman floor refuses `(50, 10)` and accepts `(100, 1)` | R-001 rule 2 |
| 4 | overflow refused above 21,474,836 Toman at 99% | FR-011 guard |
| 5 | **the safety invariant**: across a price/percent matrix, the badge recomputed from the derived pair is **never greater** than the typed percent | the guarantee FR-013 makes, stated as an executable check |
| 6 | `insertProductSchema` rejects blank / negative / non-integer `stock`, `price: 0`, and a variant `compareAtPrice <= price` | FR-005, FR-006, R-005 |

The manual admin-form scenarios (required-field blocking, live derivation,
boundaries) live in [quickstart.md](quickstart.md) rather than as automated
tests, because they exercise a React form that has no test harness — adding
one would be a larger change than the feature.

### Commit decomposition

Five semantic commits, dependency-ordered so a bisect lands on a diagnosable
failure:

1. `feat(discount): pure derivation helper with floor rule and price floor`
2. `refactor(discount): rewrite the half-up test to floor` — isolated, because
   it contradicts committed behaviour and would otherwise look like a
   regression
3. `refactor(validator): enforce integer stock, positive price, variant discount`
4. `feat(admin): single discount field deriving both prices` (+ i18n keys)
5. `docs(specs): 004 research, plan, data model, quickstart`

Commits 1 and 3 are independent and reviewable separately; 4 depends on both.

## Summary of Changes

| Concern | Files | Risk |
|---|---|---|
| Rounding rule change | `discount.test.ts` | Medium — contradicts a committed test, hence its own commit |
| New derivation logic | `lib/discount-math.ts` + test | Medium — the safety invariant is the point |
| Server validation tightening | `lib/validator.ts` | Low — can only reject previously-malformed input |
| Form restructuring | `product-form.tsx`, `options-editor.tsx` | Medium — admin-facing, no shopper impact |
| i18n | `messages/fa.json`, `en.json` | Low — parity test enforces |
| Verified unchanged | `lib/discount.ts`, `lib/variants.ts`, schema, actions | None — explicitly checked, not assumed |
