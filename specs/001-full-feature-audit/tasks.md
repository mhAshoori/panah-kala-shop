---
description: "Task list for feature 001-full-feature-audit"
---

# Tasks: Full Feature Audit — Storefront & Admin Panel

**Input**: Design documents from `specs/001-full-feature-audit/` (spec.md, plan.md, contracts/audit-stations.md)

**Prerequisites**: plan.md (required), spec.md (required), contracts/ (station list + severity rules)

**Tests**: validation gate (S13) is part of the audit by spec FR-7/8 + P3 story; per-fix regression tests only where logic is pure (per constitution V).

**Organization**: tasks grouped by station groups derived from user stories; storefront-facing stations come BEFORE their admin-facing counterparts so the interactivity (shopper action → admin sees → admin replies → shopper sees) is verified within one chain, not across scrambles. Stations are ordered; a station's tasks never touch another station's feature area, so no conflicts.

**Defect rule** (applies inside every task): anything broken found = record in `specs/001-full-feature-audit/audit-notes.md` with severity; C1/C2 fixed immediately after the station completes (fix task appended inline), re-verified before moving on; C3 fixed when trivial.

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Baseline capture: run `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`; record test count (expect 286) and any pre-existing lint warnings in `specs/001-full-feature-audit/audit-notes.md` "Gate baseline" section
- [x] T002 Start dev server via preview tools (launch config `dev`, port 3000); verify DB reachable (probe `SELECT 1`, restart server on P1001); probe seeded accounts sign-in-ability implicitly during S4, not reseeding unless data destroyed
- [x] T003 Create `specs/001-full-feature-audit/audit-notes.md` with the station checklist table from `contracts/audit-stations.md` (13 stations, result + defect rows columns)

## Phase 2: Foundational (blocking prerequisites)

- [x] T004 Verify fixture accounts exist/usable: `admin@example.com/12345678`, `jane@example.com/123456`; create a third user for the banned-state test via admin (or note existing banned row); confirm at least 2 products with variants visible in DB ([db/sample-data.ts](db/sample-data.ts) names) — anything missing noted as defect, no silent workarounds

## Phase 3: US1 — Shopper golden paths (P1) — storefront stations

- [x] T005 [US1] Execute S1 (Home): load `/`, verify all enabled HomeBlocks render (bestSellers, promoBanners, hero…), header nav + mega menu hover + mobile sheet open/navigate, footer links (subscribe newsletter invalid+valid email); toggle one block disabled in admin later is covered in S12 — here only storefront render — record result in audit-notes
- [x] T006 [US1] Execute S2 (Catalog): browse category listings incl. empty-category auto-hide, run `/search` by product and by category name, test listing sort; image URLs on listing cards resolve (no broken-image icon)
- [x] T007 [US1] Execute S3 (Product): open 2+ products (one with variants: patterned-pencil-hb; one simple: test_good pen); gallery images load, variant selector switches price/stock, deep link `?variant=` restores selection on reload, reviews/Q&A sections render, schema.org JSON-LD present
- [x] T008 [US1] Execute S5 (Cart): guest add-to-cart (session cookie), quantity +/- and stock cap, remove item, then sign in as jane — cart items persist (merge); apply valid coupon, apply expired/unknown coupon (expect bilingual toast, no crash)
- [x] T009 [US1] Execute S6 part A (Checkout+payment): complete jane checkout with address book entry (create/edit), ZarinPal sandbox full ride to PAID order; then second cart with COD order; then abandon a payment at gateway/callback (order stays unpaid, no crash); verify expired/limit-hit coupon rejected at purchase time even if it applied in cart
- [x] T010 [US1] Execute S7 (Orders): jane's order history lists both orders with jalali dates, order detail shows items incl. variantLabel, coupon line, trackCode display state; COD order can be seen pending
- [x] T010.5 [US1] Fix window: repair any C1/C2 found in T005–T010 (append fix tasks + commits), re-verify each before T011

## Phase 4: US1 — Storefront interactions that feed admin (P1, continues US1)

- [x] T011 [US1] Execute S8 (UGC): jane leaves review on a product (appears per approval setting), posts a product question, favorites a product (star state persists across reload); guest attempts = auth-gated gracefully
- [x] T012 [US1] Execute S9 (Profile): jane edits profile fields incl. contact-change flow with mock codes (`123456` email / `456789` phone), adds second address + sets default, uploads avatar (succeeds, shows in header), attempts >5MB / wrong-MIME upload (friendly reject)
- [x] T013 [US1] Execute S10 (Support, shopper side): jane opens AI widget → support tab (sign-in gate for guests verified), sends message, sees it persist with jalali date; leave the thread OPEN with 1 unread sent message for admin side in Phase 5
- [x] T014 [US1] Execute S11 (AI): ask assistant a product question (grounded answer + internal link renders clickable/juicy), trigger rate limit (rapid sends → 429 → friendly Persian error), confirm no protocol leak in output
- [x] T014.5 [US1] Fix window for T011–T014

## Phase 5: US2 — Admin panel surfaces & interactivity closures (P1)

- [x] T015 [US2] Execute S12a (Admin dashboard + badges): sign in admin, verify sidebar badges reflect state jane created (order unseen, support unread ≥1, notification rows), dashboard numbers sane (not NaN/blank)
- [x] T016 [US2] Execute S12b (Orders management): orders inbox shows jane's orders as unseen; admin seen/comments/ships (trackCode assigned) and marks COD paid order delivered; verify jane's order detail reflects shipped/delivered + trackCode
- [x] T017 [US2] Execute S12c (Support inbox closure): /admin/support shows jane thread with unread badge; admin opens (badge clears) and replies; shop-side: jane's open widget shows reply within 10s poll and her own unread clears; admin Notification rows for 'support' created then cleared
- [x] T018 [US2] Execute S12d (Products + variants): create product with images (bucket URL + optional real upload), options (color w/ hex) + combo variants (price/stock propagate to parent min/aggregate), edit, then delete a TEST product (confirm dialog gates); verify hidden/deleted product's category auto-hide on storefront if left empty
- [x] T019 [US2] Execute S12e (Categories, users, coupons): category CRUD + hideEmpty toggle + hierarchy (sub under main); users list/search, grant+revoke admin on the throwaway user with confirm dialogs, ban/unban banned user; coupon create (percent + fixed + min-cart + expiry + usage-limit) — use it in Phase 6 verification
- [x] T020 [US2] Execute S12f (Content & settings): homepage blocks edit (toggle hero off/on, verify storefront /`responds` after revalidate), contact page + SEO metadata save (verify public page), AI settings round-trip (model/base-URL/enable), settings switch locale fa↔en + font + theme — verify storefront + admin re-render and parity
- [x] T020.5 [US2] Fix window for T015–T020

## Phase 6: US3 — Auth edges & misbehave-proof inputs (P2)

- [x] T021 [US3] Execute S4 negatives: wrong password ×1 (friendly error), sign-up duplicate email/mobile (bilingual message), OTP wrong code + master code `123456` success, sign-out → protected route redirect, banned user sign-in attempt + one authenticated action (expect clear denial)
- [x] T022 [US3] Execute malformed-input sweep: paste oversized/empty/homoglyph inputs into sign-in, coupon field, product review, Q&A, shipping address, admin product form (validation messages, never 500/white screen); verify guest POST rejection on a server action route (e.g., favorite calls) where quick-checkable
- [x] T022.5 [US3] Fix window for T021–T022 — one C3 candidate: add .max() caps to insertReviewSchema (title/description)

## Phase 7: US4 — Regression net & closure (P3)

- [x] T023 [US4] Full image-URL sweep re-run (all Product.images + ProductVariant.image ⇒ HTTP 200) and record result
- [x] T024 [US4] Run validation gate; test count ≥ 286 baseline; add small Jest test for any pure logic fixed during audit (coupon re-validation, auth-guard, etc.) if not covered; fa/en message parity auto-checked by suite
- [x] T025 [US4] Close out audit-notes: every station marked PASS or defect-fixed+reverified; update spec.md checklist if any scope surprise emerged; summarize C1/C2/C3 counts and commits in audit-notes footer; final commit

## Dependencies

- T001–T004 → all; T005–T010 sequential (cart→checkout builds state); T010.5 blocks T011; T011–T014 sequential; T014.5 blocks Phase 5; T015→T016→T017 (badges/chains); T018–T020 sequential; T020.5 blocks Phase 6; T021–T022 sequential; T022.5 blocks Phase 7; T023→T024→T025.
- Cross-feature interactivity verified IN-CHAIN: jane (shopper actions) → admin (management responses) → jane (observer effect). Admin stations (Phase 5) must run after the storefront stations that seed their state; never reorder.

## MVP scope

Phases 1–4 (T001–T014.5) = shopper-safe MVP: everything a customer touches verified + defect-fixed. Phases 5+ extend to admin and closure.
