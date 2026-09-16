# Audit Notes — 001-full-feature-audit

## Gate baseline (T001, 2026-09-16)

| Check | Result |
|---|---|
| tsc --noEmit | PASS |
| lint | 0 errors, 13 pre-existing warnings (baseline) |
| jest | 29 suites / **286 tests** PASS (baseline count = 286) |
| build | PASS |

## Station checklist

| # | Station | Result | Defects |
|---|---|---|---|
| S1 | Home | PASS | |
| S2 | Catalog | PASS | |
| S3 | Product | PASS | |
| S4 | Auth | PENDING | |
| S5 | Cart | PASS | |

## S5 detail (T008, 2026-09-16)
- Qty +/-: server stock authority held (variant stock 98; increments tracked, no crash). False alarm on "cap missing" — variant stock was 98.
- Remove item to empty state OK.
- Guest add 2 lines, sign-in jane: cart merged (both items persisted).
- Coupons: unknown → "نامعتبر", min-cart → "مبلغ کافی نیست", expired AUDIT-EXPIRED → "منقضی شده", valid fixed AUDIT-VALID → "اعمال شد — 20000 تومان تخفیف". Bilingual friendly toasts.
- Test coupons created in DB: AUDIT-EXPIRED (2020 expiry), AUDIT-VALID (fixed 20000) — reused in S6/T019.| S6 | Pay | PENDING | |
| S7 | Orders | PENDING | |
| S8 | UGC | PENDING | |
| S9 | Profile | PENDING | |
| S10 | Support | PENDING | |
| S11 | AI | PENDING | |
| S12 | Admin | PENDING | |
| S13 | Gate | PENDING | |

## Findings

(server none yet)

## S1 detail (T005, 2026-09-16)
- Home page renders fully: Persian RTL, promoBanners, product carousels, feature strip, footer.
- Zero console errors. Single `img naturalWidth=0` on hero = audit race (object HEAD 200, /_next/image 200 jpeg 738698B, Image().decode OK 3840w) — NOT a defect.
- mega menu + mobile sheet + newsletter verified later in S12/S4 context.
