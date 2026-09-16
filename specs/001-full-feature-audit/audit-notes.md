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
| S6 | Pay | PASS (ZarinPal full ride env-blocked) | |
| S7 | Orders | PASS | |

## S6 detail (T009, 2026-09-16)
- Address book: created "Audit Tester" entry via checkout page, toast ok, default-selected at payment.
- Coupon drift suspicion = FALSE ALARM: `calcPrice` stores itemsPrice net-of-discount by design (258k − 20k = 238k; tax + ship + total all consistent 359,420). Cart, place-order page and DB Order row all agree.
- ZarinPal sandbox: request→authority→StartPay URL returned OK (createZarinpalPayment 200). Full gateway ride BLOCKED BY ENV: preview browser blocks ALL external navigation (even example.com), so StartPay page unreachable in-panel. Callback endpoint driven manually via curl: correct-authority call → server verify → ZarinPal code −51 (authority never completed on gateway) → order recorded FAILED, stays unpaid, renders "پرداخت نشده" gracefully, no crash. That doubles as the abandoned-payment scenario.
- authority-mismatch guard verified: callback with stale authority → paymentResult `authority-mismatch` recorded, order not paid.
- COD: option only offered when every cart product has codAvailable=true (empty cart → hidden, working as designed); with cod product selected radio + submit → order `paymentMethod:cod`, unpaid, totals correct, DB verified.
- Expired coupon at purchase: forged AUDIT-EXPIRED (discount 20,000) directly onto cart DB row → createOrder ignored it: order stored couponCode=null, couponDiscount=0, full totals. Server-side re-validation holds money integrity. Cart-side apply of same code rejected with "این کد تخفیف منقضی شده است".
- Cart cleared after each successful order (verified empty post-order).
- LIMITATION recorded: ZarinPal full ride (StartPay→pay→verify success→PAID order) not executable inside the preview browser (external nav blocked). Integration is verified up to request/verify/failure paths. Needs manual run or Playwright outside preview to complete FR-4 literal coverage.

## S7 detail (T010, 2026-09-16)
- /user/orders: 6 orders listed (4 today's audit runs unpaid + 2 historical delivered), jalali dates, paid date column, status column (در انتظار پرداخت / تحویل داده شده), reorder + detail links, page-size selector present.
- Order detail: items with variantLabel (رنگ: آبی), coupon line AUDIT-VALID −۲۰٬۰۰۰, totals correct; unpaid ZarinPal order offers پرداخت (زرین‌پال) retry button.
- Delivered order (44fcd4c9): کد رهگیری: 12345678912345678912 displayed; تاریخ تحویل jalali.
- Known artifact: 4 unpaid test orders are today's audit data; admin side (T016) will ship/deliver the COD one → trackCode appears for jane.

## S5 detail (T008, 2026-09-16)
- Qty +/-: server stock authority held (variant stock 98; increments tracked, no crash). False alarm on "cap missing" — variant stock was 98.
- Remove item to empty state OK.
- Guest add 2 lines, sign-in jane: cart merged (both items persisted).
- Coupons: unknown → "نامعتبر", min-cart → "مبلغ کافی نیست", expired AUDIT-EXPIRED → "منقضی شده", valid fixed AUDIT-VALID → "اعمال شد — 20000 تومان تخفیف". Bilingual friendly toasts.
- Test coupons created in DB: AUDIT-EXPIRED (2020 expiry), AUDIT-VALID (fixed 20000) — reused in S6/T019.
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
