# Implementation Plan: Whole-Toman Integer Money Storage

**Branch**: `005-money-int-migration` | **Date**: 2026-09-25 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/005-money-int-migration/spec.md`

## Summary

Convert all 17 money columns across six Prisma models from
`Decimal @db.Decimal(12, 2)` to `Int` (32-bit), so money is stored as whole
Toman — the currency has no commonly used subunit, so a two-decimal money column
can only ever hold an impossible value. The conversion is a single hand-authored
SQL migration, guarded by a read-only pre-flight audit that proves it lossless
before it runs. The discount helpers, the SEO Toman→IRR conversion, the ZarinPal
integration and the money formatters are all verified to work unchanged; the
actual diff is the schema, the eight `.toFixed(2)` money writes that would
otherwise silently coerce, one validator regex, and a small set of conservative
arithmetic tests.

**Post-implementation note**: the `$extends` stringification did *not* survive
unchanged. Its runtime behaviour was fine, but its inferred type kept `price`
as `string` while the schema said `number`, breaking every consumer — so the
money entries were removed and prices now reach the client as plain numbers.
See R-003.

## Technical Context

**Language/Version**: TypeScript 5.x, Node 22
**Primary Dependencies**: Next.js 16 (App Router, Turbopack dev), React 19, Prisma 7
(`prisma-client` generator, output `lib/generated/prisma/`), `@prisma/adapter-pg`,
zod, Jest 30 via `next/jest` (node environment)
**Storage**: PostgreSQL (dev: Neon; prod: local PG on the VPS). Money is
whole Toman as `integer`; the Toman→IRR ×10 relationship for schema.org JSON-LD
is unchanged. Dimensions, weight and rating remain `Decimal`.
**Testing**: Jest 30, `testEnvironment: 'node'`, tests only under
`__tests__/**/*.test.ts`. Full gate before commit: `npx tsc --noEmit` →
`npm run lint` → `npm test` → `npm run build`.
**Target Platform**: Node server (Vercel dev / VPS production), Node 22
**Project Type**: Web application (storefront + admin panel, one Next.js app)
**Performance Goals**: No regression. Dropping `numeric` in favour of `int4`
shrinks the rows; JS `number` summation stays exact far below
`Number.MAX_SAFE_INTEGER`.
**Constraints**: A single migration file, applied with `npx prisma migrate deploy`
— `db push` is forbidden by constitution VI. Migrations are hand-authored because
Prisma 7's `--create-only` is unreliable here. Money must never round silently.
**Scale/Scope**: 17 money columns, 6 models, 5 write sites, 7 test files, 1 seed file.
A solo-maintained store with real order history — conservative diff, loud
failures, no silent coercion.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Note |
|---|---|---|
| I. Professional Iranian Ecommerce First | PASS | Pure storage change; Toman stays Toman. No admin or storefront capability added or lost. |
| II. Money & Data Integrity (NON-NEGOTIABLE) | PASS, strengthened | Constitution II says money is "Prisma Decimals exposed as strings"; this feature deliberately supersedes that clause. The *intent* — no client-side arithmetic without conversion, server re-validates, never trust client-sent money — is preserved exactly. The representation changes from `Decimal(12,2)` to `Int`; "no fractional Toman is representable" is strictly stronger than "handle Decimals correctly". The CLAUDE.md line 43 note is updated in the same commit set. |
| III. Security & Authorization by Default | PASS | No auth, session or input-trust-boundary change. Validation actually tightens: `currency` stops accepting `49.99`. |
| IV. Bilingual Completeness (NON-NEGOTIABLE) | PASS | No new user-facing string. The validator's English error message changes to describe whole Toman; both message files are untouched because this text is a zod schema message, not a UI string. Verified: no `messages/*.json` key is affected. |
| V. Deployment & Ops Guardrails | PASS | Migration is a single file applied by the existing `migrate deploy` step in `docs/DEPLOYMENT.md`. No new deploy step. |
| VI. Data Layer Discipline | PASS, strengthened | Hand-authored SQL folder, `migrate deploy` only, `prisma generate` after the schema edit. Adds a read-only pre-flight audit before the destructive step. |
| VII. Efficiency & Simplicity | PASS | Smallest correct diff. `round2` untouched, `lib/discount.ts` / `lib/seo.ts` / `lib/zarinpal.ts` / `lib/persian.ts` untouched — all verified unnecessary rather than assumed. **Corrected post-implementation:** the `$extends` money transform was *not* unnecessary and had to be removed (R-003), so the "shortest diff" conclusion was optimistic by four entries. |

**Complexity Tracking**: no violations — no exception table required.

**Post-design re-check (Phase 1)**: unchanged. The design added a pre-flight
audit (R-002) and an overflow guard (R-006), both of which *serve* principles II
and VI. No gate moved from PASS to FAIL.

## Project Structure

### Documentation (this feature)

```text
specs/005-money-int-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output — 8 decisions, 2 corrected assumptions
├── data-model.md        # Phase 1 output — column-by-column conversion table
├── quickstart.md        # Phase 1 output — runnable verification guide
├── spec.md              # Feature specification
├── checklists/
│   └── requirements.md  # Spec quality checklist (16/16)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created here)
```

### Source Code (repository root)

```text
prisma/
├── schema.prisma                        # 17 money columns: Decimal -> Int
└── migrations/
    └── <timestamp>_money_to_integer/
        └── migration.sql                 # single file, 17 ALTERs, 4 DEFAULT round-trips
db/
├── prisma.ts                            # money transform entries REMOVED (see R-003)
├── sample-data.ts                       # price/compareAtPrice: string -> number, drop .00
└── seed.ts                              # variant row types
lib/
├── validator.ts                         # currency: 2-decimal regex -> whole-number + max
├── cart/pricing.ts                      # drop 4x .toFixed(2); return integers
├── coupon.ts                            # round2 -> Math.round (whole Toman)
├── discount.ts                          # UNCHANGED — Math.floor/Math.round already correct
├── seo.ts                               # UNCHANGED — Toman x10 IRR unaffected
├── persian.ts                           # UNCHANGED — maximumFractionDigits: 0
├── utils.ts                             # UNCHANGED — round2 kept (tax rate still fractional)
├── pay/zarinpal.ts                      # UNCHANGED — already Math.round + IRT
└── actions/
    ├── cart.actions.ts                  # drop 2x .toFixed(2)
    ├── order.actions.ts                 # drop 1x .toFixed(2)
    └── coupon.actions.ts                # drop 2x .toFixed(2)
__tests__/lib/
├── discount.test.ts                     # + derivation, refusal, badge-never-overstates
├── coupon.test.ts                       # 149999.85 -> 150000; + rounds-to-zero
├── cart/pricing.test.ts                 # integer expectations + no-residual invariant
├── seo.test.ts                          # drop .00 / fractional fixtures
├── variants.test.ts                     # assert Int write path, not just toString
└── validator.test.ts                    # fractional price refused (FR-008)
```

**Structure Decision**: Single Next.js application, unchanged layout. The feature
touches no new directory; every modified file already exists. No `contracts/`
directory is created — this feature exposes no new external interface, API
endpoint, or public contract (see "Interface Contracts" below).

## Phase 1 Design

### Data model

Recorded in [data-model.md](data-model.md): a column-by-column conversion table
for all 17 money columns, the four defaulted columns needing
`DROP DEFAULT`/`SET DEFAULT`, the five non-money `Decimal` columns explicitly
out of scope, and the new validation rules.

### Interface contracts

None. This feature introduces no external interface. **Corrected
post-implementation**: the money contract between server and client did *not*
stay unchanged in type — prices now arrive as `number` rather than `string`,
because the `$extends` money transform had to be removed (R-003). It is
unchanged in *meaning* (Toman integer) and no public API, route, serialized
contract, or CLI surface was added or altered. Server-action input validation is
tightened, not extended.

### Conservative testing plan

Recorded in research.md R-007, summarised here because the user asked for it
explicitly. **No new test framework, no fixtures, no integration harness** — the
existing seven money test files are amended in place with sharp checks.

Two classes of test matter, and the distinction is the whole point:

- **Fail loudly** (already exist, encode old behaviour, must be updated):
  `coupon.test.ts` asserting `149999.85`; `pricing.test.ts` asserting `.toFixed(2)`
  strings and pricing a cart at `0.1` Toman; `seo.test.ts` using
  `'68500000.00'` and fractional `1234567.89`; `variants.test.ts` asserting string
  returns through a `.toString()` that will keep passing after the change.
- **Stay green while wrong** (the dangerous ones — these are the additions):

| # | Check | Guards |
|---|---|---|
| 1 | `getDiscount('100','111')` → `{percent: 9, saveAmount: 11}` | Locks the badge/typed disagreement so no later "fix" moves it silently |
| 2 | `pctToCompareAt`: `(100,10)→111`, `(999999,33)→1492536`, `(1,99)→100`, `(100,0)→null` | The 999999 case is the *only* one distinguishing half-up from floor |
| 3 | Refusals: `percent=100`, int4 overflow, `(1,1)` → no discount | Infinity and overflow guards |
| 4 | `couponDiscount('percent',15,999999)===150000`, `('percent',1,10)===0` | Rounds-to-zero boundary |
| 5 | Per cart case: `items+ship+tax===total` and every value `Number.isInteger` | SC-004 no-residual |
| 6 | `price:'100.5'` rejected, `'100'` accepted | FR-008 |
| 7 | Loop: recomputed badge **never exceeds** typed percent | The precise meaning of "never overstates" |

Plus a **read-only pre-flight audit** (R-002) run before the migration: any
fractional value across the 17 columns, and any order whose recorded total does
not balance. Zero rows ⇒ migration provably lossless. Non-zero ⇒ stop and
reconcile. This replaces a migration test, which would only be testing Postgres's
`round()`.

### Commit decomposition

Recorded in research.md R-008. Six semantic commits, dependency-ordered so a
bisect lands on a diagnosable failure:

1. `refactor(db)!: money columns to integer` — schema + the single migration SQL
2. `refactor(db): regenerate Prisma client for integer money` — isolated because
   a stale client is the quietest failure mode
3. `fix(seed): whole-Toman seed values`
4. `refactor(money): remove .toFixed(2) from money writes` + validator tightening
5. `test(money): whole-Toman arithmetic and integer storage invariants`
6. `docs(specs): 005 research, plan, data model, quickstart`

## Summary of Changes

| Concern | Files | Risk |
|---|---|---|
| Irreversible storage change | `schema.prisma`, `migration.sql` | **High** — isolated in commit 1, guarded by pre-flight |
| Silent coercion risk | `pricing.ts`, 3 action files | **High** — the actual correctness bug if missed |
| Silent type desync | generated Prisma client | Medium — isolated in commit 2 |
| Test churn | 6 test files | Low — loud failures, then additions |
| Seed data | `sample-data.ts`, `seed.ts` | Low |
| Verified unchanged | `discount.ts`, `seo.ts`, `persian.ts`, `utils.ts`, `zarinpal.ts` | None — explicitly checked, not assumed |
| **Plan was wrong** | `prisma.ts` (money transform removed), `coupon.ts` (`round2` → `Math.round`) | Runtime reasoning in R-003/R-005 held; the transform's *inferred type* did not, and coupon rounding needed whole-Toman `Math.round` once inputs stopped being decimal. Both corrected in `research.md` and here. |
