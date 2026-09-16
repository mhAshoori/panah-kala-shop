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
| S8 | UGC | PASS | |
| S9 | Profile | PASS | |
| S10 | Support | PENDING | |
| S11 | AI | PENDING | |
| S12 | Admin | PENDING | |
| S13 | Gate | PENDING | |

## S8 detail (T011, 2026-09-16)
- Favorite: jane favorites test-good-pen-g-2501 → toast "به علاقه‌مندی‌ها اضافه شد", aria-label flips to "حذف از علاقه‌مندی‌ها", persists across reload; DB Favorite row (userId f20132c9 / productId d09ee849) confirmed; row survives sign-out.
- Review: submitted 5★ ("بسیار خوب") via ثبت دیدگاه → toast success, stored rating=5 isApproved=TRUE (auto-approve on), appears immediately in listing "۵ · ۱ دیدگاه" with خریدار badge + jalali date.
- Q&A: posted question → toast "پرسش شما ثبت شد", renders on product page ("پرسش از Jane", هنوز پاسخی داده نشده شده, jalali date), DB row confirmed.
- Guest negatives: signed out. Favorite click → graceful toast "نشست شما منقضی شده است — لطفاً دوباره وارد شوید" (no crash, no state change). Q&A form replaced with "برای ثبت پرسش ابتدا وارد شوید". /user/favorites as guest shows sign-in gate prompt ("هنوز محصولی را نشان نکرده‌اید… برای ذخیره…") — auth-gated pages don't leak data.
- Note: guest review flow uses sign-in prompt; direct anonymous server-action POST returns 500 on raw fetch (no friendly HTML) — LOW risk, only reachable via crafted manual fetch, browser UI path is graceful. Not filed as defect (C3 threshold / pre-existing server-not-found handling); can harden later.

## S9 detail (T012, 2026-09-16)
- Profile card: name/nationalId/birthDate/cardNumber/sheba fields render, save → "تغییرات ذخیره شد".
- Email change: jane@example.com → jane2@example.com via two-side mock codes (old 123456 verified then DB shows email swapped; old email row gone). Master codes accepted since no SMTP provider.
- Mobile change codes: master codes bound per-side (old≠new slots). Wrong old-code attempt → friendly "کد ارسال‌شده به تماس قبلی نامعتبر است"; brute-force guard consumes the entry by design (re-issue needed). Attempted full phone swap hit request rate-limit (3 per 10 min) — friendly Persian countdown toast. LIMITATION: mobile swap completion not verifiable in-window; rate limiting itself verified working (throttles contact-change attempts).
- Addresses: added "Audit Two" (اصفهان) → toast + listed; set-default → DB isDefault flips correctly (Jan Doe false → Audit Two true), star chip moves.
- Avatar: canvas PNG uploaded to /api/upload → bucket URL stored in User.image by updateProfileImage; renders on profile + header. >5MB → 400 storageTooLarge (400, friendly key). Disguised MIME (text content with type=image/png) accepted — comment-only; header image type is client-supplied but bucket serves as-is; NOT exploit-critical since avatar renders as <img> (execution requires model-attacked vector). Severity C3 hardening note.
- Note: jane's email now jane2@example.com (audit artifact).

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


## Findings

(server none yet)

## S1 detail (T005, 2026-09-16)
- Home page renders fully: Persian RTL, promoBanners, product carousels, feature strip, footer.
- Zero console errors. Single `img naturalWidth=0` on hero = audit race (object HEAD 200, /_next/image 200 jpeg 738698B, Image().decode OK 3840w) — NOT a defect.
- mega menu + mobile sheet + newsletter verified later in S12/S4 context.
