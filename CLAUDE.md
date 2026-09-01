@AGENTS.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                 # dev server (Turbopack) on :3000
npm run build               # production build — the final gate before any commit
npm run lint                # ESLint
npx tsc --noEmit            # type check (no dedicated script)
npm test                    # all Jest tests (~184, node environment)
npx jest __tests__/lib/coupon.test.ts   # single test file
npx jest -t "applies percentage"        # tests matching a name
npm run db:seed             # seed sample data (12 products, admin + user accounts)
npx prisma migrate deploy   # apply migrations (NEVER db push against production)
```

Validation before every commit: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.

Environment notes:
- Git repo root is this folder (`panah-kala-shop/`), not the parent directory.
- Commits use the repo-local author `Mammad Linuxer <mammad.linuxer@gmail.com>`.
- Windows shell: always use forward slashes in paths passed to tools.
- Port 3000 stale process: `netstat -ano | findstr :3000` then `taskkill //PID <pid> //F`.
- Dev logs: `.next/dev/logs/next-development.log`.

## Big-picture architecture

### Single-URL, DB-driven i18n & theming (unusual — read this first)
There is **no `[locale]` URL segment** and next-intl middleware is NOT used. The display language, font, and default theme live in the DB `Setting` table and are admin-switchable ([lib/actions/settings.actions.ts](lib/actions/settings.actions.ts)):

- [lib/site-settings.ts](lib/site-settings.ts) — `getSiteLocale()` (fa default), `getSiteFont()`, `getSiteTheme()`; React-`cache`d per request, DB-failure-safe for builds.
- [i18n/request.ts](i18n/request.ts) — resolves the request locale from that setting; [i18n/routing.ts](i18n/routing.ts) has `localePrefix: 'never'` and `localeDetection: false`.
- All user-facing strings live in `messages/fa.json` + `messages/en.json`. A parity test (`__tests__/messages.test.ts`) fails the suite if keys diverge — add every new key to **both** files.
- Server actions return bilingual messages via [lib/action-messages.ts](lib/action-messages.ts) (`withActionMessage`), surfaced as toasts.

[proxy.ts](proxy.ts) (Next 16's middleware convention) only assigns the `sessionCartId` cookie for guest carts.

### Data layer
Prisma 7 with **driver adapters** (`@prisma/adapter-pg`); client is generated to `lib/generated/prisma/` (not the default location). [db/prisma.ts](db/prisma.ts) appends `uselibpqcompat=true` for Neon URLs and guards a `globalThis` singleton — without it, HMR exhausts the connection pool (Neon free tier). `product.price/compareAtPrice/rating` are Decimal → exposed as strings via a `$extends` result transform; always treat money as strings/Toman in the UI (schema.org JSON-LD multiplies ×10 → IRR, see [lib/seo.ts](lib/seo.ts)).

Deployed DB is Neon free tier (`DATABASE_URL` in `.env`, gitignored). Migrations are hand-authored folders under `prisma/migrations/` (Prisma 7 `--create-only` sometimes produces nothing; write `migration.sql` manually with one statement per line).

### Auth (Auth.js v5)
[auth.ts](auth.ts) — JWT strategy with `PrismaAdapter`; role comes from a DB lookup in the `jwt` callback. Three providers: email/password credentials, SMS OTP via `VerificationToken` (mock master code `123456` — real provider goes in `requestPhoneOtp`), and Google OAuth (env-gated on `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `allowDangerousEmailAccountLinking`). Guest carts merge into user carts in the `jwt` callback. Guards: [lib/auth-guard.ts](lib/auth-guard.ts) `requireAdmin()` for admin pages/actions.

### Server actions pattern
All mutations live in `lib/actions/*.actions.ts` with `'use server'`. Pattern: `requireAdmin()`/session check → validate with [lib/validator.ts](lib/validator.ts) (zod) → `prisma` write → `revalidatePath` → throw `withActionMessage('key')` on failure. Confirmation dialogs (`components/shared/delete-dialog.tsx`, `confirm-dialog.tsx`) wrap all destructive/critical admin actions — keep that convention.

### AI assistants
Two personas (`storefront`, `admin`) share one backend; the browser only ever talks to `app/api/assistant/chat/route.ts` (SSE), never to the AI provider. Import direction is critical: `lib/ai/sanitize.ts` and `lib/ai/use-assistant.ts` must stay **client-safe** (no prisma/DB imports — importing server code pulls `pg` into the browser bundle).

- [lib/ai/provider.ts](lib/ai/provider.ts) — OpenAI-compatible streaming client (9Router/Groq/OpenRouter/…); config from DB `Setting` (model/base-URL/enable, admin-editable at `/admin/settings`, see `lib/ai/settings.ts`) with `AI_*` env fallback; key stays env-only.
- [lib/ai/run.ts](lib/ai/run.ts) — tool loop (max 3 rounds); [lib/ai/tools.ts](lib/ai/tools.ts) — read-only DB grounding tools (the model must never invent prices/stock/orders; admin tools are strictly read-only).
- [route.ts](app/api/assistant/chat/route.ts) — eager first provider call (real 502/429/503 statuses before headers are sent), rate limiting (`lib/rate-limit.ts`), PII scrubbing, and a `TOOL_CALL:` hold-back buffer so the internal tool protocol never leaks to the UI. Errors are logged server-side with the `[ai]` prefix.
- [lib/ai/sanitize.ts](lib/ai/sanitize.ts) — strips braces/parens/protocol text from output; `friendlyAssistantError()` maps statuses to Persian messages.

### Payments
ZarinPal only (sandbox by default; PayPal/Stripe intentionally skipped): request → StartPay redirect → callback verify in [app/api/zarinpal](app/api/zarinpal). The callback verifies `order.paymentAuthority === authority` (authority binding) and re-validates the coupon at purchase time. COD is per-product (`codAvailable`). Money flows through [lib/pay/zarinpal.ts](lib/pay/zarinpal.ts).

### Admin-managed frontend content
Homepage blocks, SEO metadata, contact page, and AI settings are all stored as rows (Setting/HomeBlocks tables) and edited from the admin panel (`app/admin/homepage`, `app/admin/settings`) — prefer adding an admin setting over hardcoding store content.

## RTL / i18n conventions
- fa is RTL and default; use logical Tailwind properties (`start`/`end`, `ms-`/`me-`), never `left`/`right` (or reset both explicitly, e.g. `sm:left-auto sm:right-auto`).
- Directional icons (arrows, send) need `rtl:-scale-x-100`.
- Persian digits: `lib/persian.ts` formatters handle locale-aware numbers/prices.

## Testing
Jest 30 via `next/jest`, `testEnvironment: 'node'`, tests only under `__tests__/**/*.test.ts`. Focus is on pure logic (lib/) — coupons, discounts, sanitizers, phone normalization, SEO, rate limiting, AI wire format. After any feature change, run the full validation gate; keep test count growing for new logic.

---

## Project status (snapshot 2026-09-01, commit c307287 — 90 commits, tree clean)

### What's done
- **Core store** (roadmap steps 1–11 of premium-docs): scaffold → i18n/themes → catalog+seed → header/footer → auth (NextAuth v5) → cart → checkout → ZarinPal payment + COD → order history → reviews/ratings → admin dashboard (orders, products, users, categories) → search page → SEO foundation → security hardening.
- **Custom decisions layered on top:**
  - Single-URL DB-driven locale/font/theme (admin-switchable), Persian-first RTL throughout.
  - Hierarchical categories (main > sub > sub-sub) with mega menu + mobile sheet; category-name search.
  - Admin-editable homepage blocks + contact page + SEO metadata (all DB-backed via Setting/HomeBlocks).
  - Favorites (star toggle), multi-address book, profile extras (nationalId/sheba/card/birthDate), SMS OTP sign-in/up, dual-mode (email/phone) accounts, unique-mobile constraint, guest/user cart merge.
  - Discounts (`compareAtPrice`), coupon system (percent/fixed, min-cart, expiry, usage limit, purchase-time re-validation), coupon line in order summaries.
  - Confirmation AlertDialogs on every destructive/critical action (orders, products, users, addresses, coupons, admin-role grant).
  - AI assistants (storefront widget + admin sidebar chat): 9Router OpenAI-compatible gateway, DB-grounded read-only tools, admin-managed model/base-URL/enable at `/admin/settings`, sanitized Persian output, eager HTTP error statuses, rate limiting, PII scrub.
  - Google OAuth (env-gated) beneath sign-in/up buttons; SMS OTP mock master code `123456`; contact-change mock codes `123456`/`456789`.
  - ~184 Jest tests (pure lib logic + fa/en message parity).
- **Verified E2E** via preview browser: full checkout (COD + ZarinPal paths), coupon flow, sign-in variants, AI chats (grounded answers), rate-limit 429, ChatWidget positioning at mobile/desktop breakpoints.

### Key decisions
- ZarinPal replaces PayPal/Stripe (user request). Toman in UI, IRR ×10 in JSON-LD.
- Money values are Prisma Decimals exposed as **strings** via `$extends`; never do arithmetic on them client-side without conversion.
- AI: key stays in env only; model/base-URL/enabled are DB settings the admin can change without redeploy.
- Migrations are hand-authored SQL folders (Prisma 7 `--create-only` is unreliable here).
- Validation gate before every commit: `tsc --noEmit` → `lint` → `test` → `build`.

### Pending (for production launch)
- Real SMS provider (Kavenegar/Ghasedak) to replace mock OTP in `requestPhoneOtp`.
- Real ZarinPal merchant id + `ZARINPAL_SANDBOX=false`; set `NEXT_PUBLIC_SITE_URL` to the domain.
- Email receipts: dev provider logs to console — swap to SMTP/nodemailer (Resend avoided, may be blocked from Iran).
- Image uploads are URL-based; Cloudflare R2 + `sharp` planned (see `docs/PRODUCTION_UPGRADE_PLAN.md`).
- 9Router at `http://localhost:20128/v1` only works same-machine — on Vercel, colocate on a VPS or expose the gateway with auth (retargetable in the admin panel without redeploy).
- Run `npx prisma migrate deploy` on each deploy (never `db push`); deployed on Vercel + Neon free tier.
