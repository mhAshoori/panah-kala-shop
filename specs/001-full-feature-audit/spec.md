# Feature Specification: Full Feature Audit — Storefront & Admin Panel

**Feature Branch**: `001-full-feature-audit`
**Created**: 2026-09-16
**Status**: Draft
**Input**:
  User description: "test every storefront + admin feature and make sure it doesn't crash on
  the hands of the user."

## User Scenarios & Testing *(mandatory)*

<!-- Every feature of the live shop is exercised as a real user (shopper, guest, support-agent
admin, super-admin) would, in the running app. Findings are recorded with severity; crashes,
data corruption, broken flows or pictures are defects to fix, not to document-only. -->

### User Story 1 — Shopper golden paths never crash (Priority: P1)

A guest or signed-in shopper can complete every core buying journey without hitting an
error page, a stuck spinner, or a broken state: browse homepage blocks, navigate
mega-menu/categories, open product pages (variants, images, reviews, Q&A), search, add
to cart (guest → session, then sign in — cart merges), apply coupons, pass checkout
(shipping address, ZarinPal sandbox payment AND cash-on-delivery), see order history and
order detail, favorite a product.

**Why this priority**: this is the revenue path. A crash here stops the store.

**Independent Test**: walk each journey on the preview server; every step ends in a
rendered, interactive page (no 500, no blank section, no dead button).

**Acceptance Scenarios**:

1. **Given** a guest browsing, **When** homepage/category/product/search pages load, **Then**
   content renders fully (products, images resolve, prices formatted) with no console-derived
   error surface shown to the user.
2. **Given** a guest with items in cart, **When** they sign in, **Then** the cart items persist
   (merge) and checkout completes to a PAID order for sandbox payment and a
   pending-but-completable order for COD.
3. **Given** a signed-in shopper, **When** they leave a review / ask a question / favorite /
   message support via the AI widget's support tab, **Then** the action persists and displays
   with correct Jalali dates and Persian text, no layout break.

### User Story 2 — Admin panel handles every management surface (Priority: P1)

A super-admin can operate each admin section for real data: orders inbox (seen/comment,
ship, deliver, trackCode), products CRUD incl. variants/combos + image upload,
categories (hierarchy, hide-empty toggle), users (search, view, role grant, ban),
coupons, notifications + support inbox (read badges, replies reach the user's widget),
homepage blocks, contact page, SEO metadata, AI settings, settings (locale/font/theme
switch). Nothing crashes; destructive actions always confirm first; badges reflect state.

**Why this priority**: admin breakage means the shop cannot be run at all.

**Independent Test**: open each admin route, create/edit/delete one real record per
section, confirm UI state and badge counts update.

**Acceptance Scenarios**:

1. **Given** admin signed in, **When** each sidebar section is visited and a representative
   create/edit/delete is performed, **Then** every operation completes with a toast and
   updated list, and confirmation dialogs gate destructive ones.
2. **Given** a shopper sends a support message and places an order, **When** admin opens the
   panel, **Then** order + support + notification badges show unread counts accurately, and
   admin replies appear in the shopper's widget within the polling window.

### User Story 3 — Auth edges & misbehave-proof inputs (Priority: P2)

Sign-up/sign-in via email/password, SMS OTP (master code), sign-out; banned user sees a
blocking state; expired/invalid inputs (bad coupon code, huge/empty form submissions,
non-Persian paste into phone field, oversized file upload) fail with a friendly toast —
never a stack trace or crash.

**Why this priority**: crash-proofing is the explicit goal; the edges are where damage
happens.

**Independent Test**: submit deliberately invalid input on each form; response is a
bilingual message or validation UI, HTTP 500 never surfaces as a white page.

**Acceptance Scenarios**:

1. **Given** any public form, **When** submitted with invalid/excessive data, **Then** the app
   shows a user-appropriate error and remains usable.
2. **Given** a banned user attempts sign-in/actions, **Then** they are denied with a clear
   message and cannot mutate data.

### User Story 4 — Regression net holds (Priority: P3)

The automated gates (type check, lint, full test suite, production build) pass after
audit; any defect fixed during the audit adds or extends a test where the logic is pure.

**Why this priority**: ensures the audit leaves the codebase safer, not just inspected.

**Independent Test**: run the validation gate; suite green and not smaller than before.

**Acceptance Scenarios**:

1. **Given** the audit concludes, **When** the gate runs, **Then** all four checks pass with a
   test count ≥ baseline.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-1**: Every storefront route reachable from navigation MUST be loaded and exercised
  (homepage blocks all enabled/disabled states, categories, product list/search, product
  detail incl. variant selector deep-link `?variant=`, cart, checkout, sign-in/up,
  profile area, order history/detail, favorites, FAQ/contact/about, blog if present).
- **FR-2**: Every admin route in the sidebar (desktop + mobile menu sheet) MUST be visited;
  each section's primary actions (view, filter/paginate, create, edit, delete-with-confirm,
  badge-affecting actions) MUST be performed on real seeded data.
- **FR-3**: Both display locales (fa and en) and all fonts/themes-switch combinations MUST
  render without broken layout on at least the homepage and a product page.
- **FR-4**: Payment flows MUST be exercised sandbox-only: full ZarinPal start→callback→PAID,
  a COD order, an intentionally failed/abandoned payment, and coupon re-validation at
  purchase (expired/limit-hit coupon rejection).
- **FR-5**: Support messaging MUST be round-tripped shopper→admin→shopper with unread badge
  verification at each hop; notification rows created and cleared.
- **FR-6**: Upload flows (product image, avatar) MUST succeed and render; a >5MB or
  disallowed-MIME file MUST be rejected with a friendly message.
- **FR-7**: Every defect found MUST be classified severity C1 (blocks a golden path /
  data loss), C2 (feature broken on some path), C3 (cosmetic/minor); C1/C2 MUST be fixed
  and re-verified before the audit closes, C3 fixed when trivial.
- **FR-8**: Findings and fixes MUST be recorded in the feature directory as the audit
  proceeds (per-station notes with route, steps, expected vs actual), and each fix
  committed separately with the failing flow named.
- **FR-9**: Guest→user cart merge, session cart cookie behavior, and sign-out cart state
  MUST be verified.

### Assumptions

- Audit runs against the current dev environment (seeded data, ZarinPal sandbox, mock
  SMS OTP `123456`, AI via configured dev gateway).
- "Crash on the hands of the user" covers: unhandled server errors surfacing to the UI,
  white-page/blank render, stuck loading states, dead buttons, broken images, corrupt
  persisted data. Performance tuning and design polish are out of scope.
- A defect that requires infra unavailable today (real SMS, real ZarinPal merchant,
  Google OAuth creds) is recorded as limited-scope, not a failure.

### Success Criteria

- 100% of storefront routes reachable from navigation and 100% of admin sidebar sections
  exercised (checklist in the audit notes shows per-route checked).
- Zero C1/C2 defects outstanding when the audit is declared complete; each fixed defect
  re-verified in the browser.
- Shoppers: a complete shopper journey (sign-in → buy paid order → review → support
  reply received) runs start to finish without user-visible errors.
- Admin: a complete run (order processed to delivered, a product created with
  variants+image, a coupon created and applied, content block edited, badges accurate)
  completes without user-visible errors.
- Validation gate passes with the test suite ≥ its pre-audit count.

### Key Entities

- **Actors**: guest shopper, signed-in shopper, banned shopper, super-admin, support-replying
  admin (same super-admin in this deployment).
- **State touched by audit**: Products(+variants/options), Categories, Carts, Orders(+items),
  Reviews(pending approval), Questions/Answers, Favorites, Coupons, SupportMessages,
  Notifications, HomeBlocks, Settings, Users, Uploads (object storage).

## Review & Acceptance Checklist

GATE: automated and manual checks will confirm the section content above.

### Content Quality

- [x] No implementation details (languages, frameworks, APIs) in the WHAT
- [x] Focused on user value and business need
- [x] All needs covered across the two roles (shopper/admin) + edge inputs

### Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers
- [x] Requirements testable and unambiguous
- [x] Success criteria measurable
- [x] Scope clearly bounded (black-box audit + fix, exclude perf tuning/prettiness)
- [x] Dependencies identified (sandbox creds, seeded data)

### Feature Readiness

- [x] Functional requirements cover both actors' acceptance criteria
- [x] Scenarios cover the independent test slices P1–P3
