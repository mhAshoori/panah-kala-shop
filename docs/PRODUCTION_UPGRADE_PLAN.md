# Panah Kala Shop — Production Launch Upgrade Plan

> Working dir: `panah-kala-shop/`
> Source: `mammad-linuxer/next-ecom-prostore` (tutorial base, English)
> Target: production launch in Persian-speaking (Iran) market
> Stack: Next.js 16.3 · React 19.2 · Prisma 7 · PostgreSQL 17 (Docker) · next-intl 4 · ZarinPal · shadcn/radix-nova · Tailwind 4 · Zod

---

## 1. TL;DR

1. The codebase is a Next.js 16 scaffold with a single `Product` model, no auth, no cart, no payments — almost every "feature" implied by the i18n strings is unwired. The first commit milestone must stand up auth + cart + orders + ZarinPal before any feature work.
2. SEO is effectively zero today: no sitemap, no robots, no JSON-LD, no hreflang, no canonical, no per-page metadata. The single biggest "quick win" is building out the SEO layer (metadata, sitemap, robots, JSON-LD, E-Namad) — it is also what differentiates a Persian-market site from a generic clone.
3. The roadmap is 8 phases, ~12.5 working days end-to-end. Phases 0–4 are the critical path (working checkout). Phases 5–8 are catalog polish, reviews, admin, and launch hardening.

---

## 2. Decisions to lock in BEFORE coding

| # | Decision | Rationale |
|---|---|---|
| 1 | **URL strategy:** sub-path `/fa/...` and `/en/...`; fa is default but **not** stripped from the URL | Simpler hreflang, no `localePrefix: 'as-needed'` edge cases; both locales are first-class. |
| 2 | **hreflang codes:** `fa-IR` and `en-US`; `x-default` points to `/fa/` | Google Search Central; fa-IR signals Iranian locality, en-US signals default English audience. |
| 3 | **Slug model:** add `slugFa String? @unique` to `Product`; keep `slug` (English) as the URL fallback | Enables Persian URLs (`/fa/product/گوشی-آیفون-۱۵-پرو`) without breaking English ones; one slug per locale. |
| 4 | **Currency policy:** Toman primary in UI (`تومان`), IRR (×10) in DB and in `Product` schema JSON-LD `offers.price` | Industry norm in Iran (Toman); aggregators like Torob expect IRR; schema.org `priceCurrency: IRR` is the only valid value. |
| 5 | **Search engine:** Google is partially restricted in Iran — also accept Yandex and Bingbot. `robots.txt` does not block them. | Practical reality of the Iranian market; out-of-region hosting (Vercel) is the only SEO-friendly option. |
| 6 | **E-Namad trust seal:** mandatory for Iranian e-commerce. Load via `next/script strategy="afterInteractive"`; allow `*.enamad.ir` in CSP. | Required for legitimacy; CSP must permit the script. |
| 7 | **Fonts:** self-host Vazirmatn (Persian) and Inter (Latin) with `next/font/local`. Drop Google Fonts. | Iranian users have high latency; Google Fonts is often blocked or slow. |
| 8 | **Error tracking:** Sentry (or alternative). Sample rate 0.2 in prod, 1.0 in dev. Scrub PII (phones, names, emails) in `beforeSend`. | Iranian users hit real production errors and Sentry works from out-of-region hosting. |
| 9 | **Email:** start with `ConsoleProvider` in dev; pluggable `EmailProvider` interface (SMTP, Resend, etc.) — **NOT Resend-only** because it may be blocked from Iran. | Resend is great in dev but unreliable in/out of Iran; use nodemailer + a swap point. |
| 10 | **SMS:** interface only in v1; no SMS provider locked in. | Kavenegar/Ghasedak add cost; defer to post-launch. |
| 11 | **State management:** Server Actions + URL state + cookies. No Zustand/Jotai/Redux. | Matches Next 16 idioms; the app does not need client state. |
| 12 | **Auth:** Auth.js v5 (NextAuth) with Credentials provider, JWT strategy, Prisma adapter. | Matches the roadmap (chapter 04) and supports the `Role` enum we need. |
| 13 | **Image storage:** Cloudflare R2 + `sharp` for resize/WebP. NO UploadThing (the tutorial uses it but it is not Persian-friendly for compliance). | R2 is cheap, S3-compatible, no egress fees. |
| 14 | **Hosting target:** Vercel. Database: Neon (or Supabase) for connection pooling + PITR backups. | Best DX for Next 16; Vercel's edge network serves Iran faster than Iranian hosting. |
| 15 | **Default theme:** light, per `lightTheme` palette already in `globals.css`. Dark = graphite black/grey combo. | Already decided; preserve current OKLCH palette. |
| 16 | **Skipped from the Prostore roadmap:** PayPal (08) and Stripe (15). | Already locked. |
| 17 | **Testing:** Vitest (unit) + Playwright (e2e) with Persian fixtures; axe-core for a11y in Playwright. | Modern, fast, RTL-friendly. |

---

## 3. SEO upgrade plan (priority #1)

### A. Metadata & hreflang

**File:** `app/[locale]/layout.tsx` — define `defaultMetadata`:

```ts
export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const base = env.NEXT_PUBLIC_SITE_URL;
  return {
    metadataBase: new URL(base),
    title: { default: t('title'), template: `%s | ${t('siteName')}` },
    description: t('description'),
    keywords: t('keywords'),  // comma-separated, fa + en
    authors: [{ name: t('siteName') }],
    creator: t('siteName'),
    publisher: t('siteName'),
    applicationName: t('siteName'),
    formatDetection: { telephone: false, address: false, email: false },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'fa-IR': `${base}/fa`,
        'en-US': `${base}/en`,
        'x-default': `${base}/fa`,
      },
    },
    openGraph: {
      type: 'website',
      siteName: t('siteName'),
      title: t('title'),
      description: t('description'),
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      alternateLocale: locale === 'fa' ? 'en_US' : 'fa_IR',
      url: `/${locale}`,
      images: [{ url: '/og.png', width: 1200, height: 630, alt: t('siteName') }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('description'),
      images: ['/og.png'],
    },
    robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-image-preview': 'large' } },
    other: {
      'geo.region': 'IR',
      'geo.placename': 'Iran',
      'geo.position': '32.4279;53.6880',  // country centroid
      'ICBM': '32.4279, 53.6880',
    },
  };
}
```

**Per-page `generateMetadata`:** every dynamic route (`product/[slug]`, `category/[slug]`, `search`, etc.) returns its own `Metadata` with localized title, description, canonical, `alternates.languages`, and `openGraph.images` (use the product image, not the global OG).

**Helper:** `lib/seo/alternates.ts` builds the alternates object for any path so we do not duplicate logic.

### B. Sitemaps & robots

**Files:**
- `app/sitemap.ts` (index)
- `app/sitemap-products.ts`
- `app/sitemap-categories.ts`
- `app/sitemap-static.ts`
- `app/robots.ts`

`app/sitemap.ts` returns an index that points to each sub-sitemap (Next.js auto-handles this). Each sub-sitemap queries the DB and emits one entry per locale per resource (with `<xhtml:link rel="alternate" hreflang="..."/>` children).

`app/robots.ts`:
```ts
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin', '/api', '/checkout', '/account', '/sign-in', '/sign-up'] },
      { userAgent: ['Googlebot', 'YandexBot', 'Bingbot'], allow: '/' },
    ],
    sitemap: `${env.NEXT_PUBLIC_SITE_URL}/sitemap.xml`,
    host: env.NEXT_PUBLIC_SITE_URL,
  };
}
```

### C. Structured data (JSON-LD)

**File:** `lib/seo/jsonld.tsx` — `<JsonLd data={...} />` server component that emits `<script type="application/ld+json" dangerouslySetInnerHTML={...} />`.

Inject in:
- `app/[locale]/layout.tsx`: `Organization` (name, logo, url, sameAs for X/Instagram, contactPoint with `areaServed: 'IR'` and `availableLanguage: ['Persian', 'English']`), `WebSite` with `inLanguage: 'fa-IR'` and `potentialAction: SearchAction`.
- `app/[locale]/(root)/page.tsx`: `WebSite` + `SearchAction` (uses `/search?q={search_term_string}`).
- `app/[locale]/(root)/product/[slug]/page.tsx`: `Product` schema with `name`, `description` (in current locale), `image[]` (full URLs), `sku`, `brand: { @type: 'Brand', name: brand }`, `aggregateRating` (only if `numReviews > 0`), `offers: { @type: 'Offer', priceCurrency: 'IRR', price: priceInIRR, availability, url, seller: { @type: 'Organization', name: APP_NAME } }`, `inLanguage: 'fa-IR' | 'en-US'`.
- PDP: also `BreadcrumbList` (Home > Category > Product).

### D. Persian content quality

**File:** `lib/persian/normalize.ts` — ZWNJ (نیم‌فاصله, U+200C) normalization:
- Dictionary of common Persian compound prefixes/suffixes that require ZWNJ: `می`, `نمی`, `بی`, `هم`, `ها`, `های`, `هایی`, `تر`, `ترین`, `ام`, `ات`, `اش`, `مان`, `تان`, `شان`, plus verbs like `می‌رود`, `می‌شود`, `می‌توان`, etc.
- `normalizePersian(input)`: replaces `می X` → `می‌X` etc. Run on all user/admin input via a Zod transform.
- `toPersianDigits(input)`: `0-9` → `۰-۹`.
- `toAsciiDigits(input)`: `۰-۹` → `0-9` (for URLs, slugs, schema.org values).
- `formatToman(priceInToman: number | string)`: `Intl.NumberFormat('fa-IR', { style: 'decimal' })` + suffix `تومان`.
- `formatRial(priceInToman: number | string)`: Toman × 10, `Intl.NumberFormat('en-US')` + `ریال`. Use only in admin / order details.

**File:** `lib/persian/date.ts` — `formatJalali(date)`, `formatGregorian(date)`. UI uses Jalali; structured data uses Gregorian ISO.

**Application points:**
- All product `nameFa`/`descriptionFa` go through `normalizePersian` on save (admin form + seed).
- All UI text that contains numbers (price, stock, date, pagination) goes through `toPersianDigits` for `fa` locale.
- Slugs: `slugify(nameEn, { lower: true, strict: true, replacement: '-' })` for `slug`; `slugify(toAsciiDigits(nameFa), { locale: 'fa', customReplacements: [[' ', '-'], ['‌', '-']] })` for `slugFa`. Both passed through `normalizePersian` first.

### E. Performance for Iran

- `next/image` with `sizes` on every responsive image; `priority` on above-fold only.
- Self-host fonts via `next/font/local` (Vazirmatn + Inter), `display: 'swap'`, `preload: true` for primary weights only.
- ISR for PDP (`revalidate: 3600`) and category pages (`revalidate: 600`).
- `<Link prefetch={true}>` for in-viewport header links.
- Wrap "Latest Products" home section in `<Suspense fallback={<ProductGridSkeleton />}>` so header/footer render before DB query.

### F. Local signals

- `meta geo.region=IR`, `geo.placename`, `geo.position`, `ICBM` (see A).
- `Organization` JSON-LD with `address: { @type: 'PostalAddress', addressCountry: 'IR', addressLocality: 'تهران' }` (replace with real address).
- Phone in `+98 21 XXX XXXX` format on contact pages and JSON-LD `contactPoint.telephone`.

### G. OpenGraph & Twitter

Already covered in A. Per-product `og:image` must be a 1200×630 image; if product images are not that ratio, generate a server-side composite using `sharp` at upload time, or use the first product image with `images: [{ url, width: 1200, height: 630 }]` in metadata.

### H. Manifest & PWA basics

**File:** `app/manifest.ts`:
```ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'پناه کالا',
    short_name: 'پناه کالا',
    description: 'فروشگاه اینترنتی پناه کالا',
    lang: 'fa',
    dir: 'rtl',
    start_url: '/fa',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0a9396',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
```

### I. E-Namad trust seal integration

**File:** `components/shared/footer/enamad.tsx`:
```tsx
export function EnamadBadge() {
  return (
    <>
      <Script src="https://trustseal.enamad.ir/logo.js" strategy="afterInteractive" />
      <a referrerPolicy="origin" target="_blank" href={`https://trustseal.enamad.ir/?id=${process.env.NEXT_PUBLIC_ENAMAD_ID}&Code=${process.env.NEXT_PUBLIC_ENAMAD_CODE}`}>
        <img src={`https://trustseal.enamad.ir/logo.aspx?ID=${process.env.NEXT_PUBLIC_ENAMAD_ID}&p=...`} alt="نماد اعتماد الکترونیکی" width={125} height={136} />
      </a>
    </>
  );
}
```

**CSP allow:** `script-src 'self' https://trustseal.enamad.ir; img-src 'self' data: https://trustseal.enamad.ir; frame-src https://trustseal.enamad.ir`.

---

## 4. Production-readiness upgrades

### A. Security headers in `next.config.ts`

```ts
async headers() {
  return [{
    source: '/(.*)',
    headers: [
      { key: 'X-DNS-Prefetch-Control', value: 'on' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
      { key: 'Content-Security-Policy', value: [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://trustseal.enamad.ir https://www.google.com https://www.gstatic.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-src https://trustseal.enamad.ir https://www.google.com",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ') },
    ],
  }];
}
```

### B. Rate limiting on auth & checkout

**File:** `lib/ratelimit.ts` — Upstash Ratelimit (sliding window) for production, in-memory `Map` for dev. Apply on:
- `/api/auth/*` (sign-in: 5/min/IP, sign-up: 3/hour/IP)
- checkout action (10/min/user)
- review submission (5/min/user)

### C. Sentry integration

- `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`.
- `instrumentation.ts` registers them by `NEXT_RUNTIME`.
- `next.config.ts` wraps with `withSentryConfig`.
- `sendDefaultPii: false`, `beforeSend` scrubs `*.phone`, `*.email`, `*.address`.

### D. Error boundaries & global error

- `app/[locale]/error.tsx` (segment-level, localized, RTL).
- `app/[locale]/(root)/error.tsx`.
- `app/global-error.tsx` (must render its own `<html>` and `<body>`).

### E. `not-found.tsx` per locale

`app/[locale]/not-found.tsx` already exists; localize it via `useTranslations('common')`. Add `app/not-found.tsx` for the root.

### F. `loading.tsx` and Suspense

- `app/[locale]/loading.tsx` already exists; add skeletons for product grid, PDP, cart.
- Wrap "Latest Products" in `<Suspense>` on the home page.

### G. Image upload security

**File:** `lib/upload.ts`:
- File-type sniffing with `file-type` (do not trust MIME).
- Max 5 MB.
- Resize to 1200×1200, WebP via `sharp`.
- Reject if dimensions < 600×600.
- Store on Cloudflare R2 with a UUID key.
- Run ClamAV on prod (worker).

### H. Environment variable validation

**File:** `lib/env.ts` — zod schema for every env var. Import at the top of `next.config.ts` and `instrumentation.ts` to fail fast at boot.

### I. Database

- Prisma 7 + `@prisma/adapter-pg` with PgBouncer transaction mode (Neon/Supabase have this built in).
- `prisma migrate deploy` in CI/CD only; never `prisma db push` in prod.
- New migration adds:
  - `slugFa String? @unique` on `Product`
  - `categoryId String?` FK to new `Category` model
  - `User`, `Account`, `Session`, `VerificationToken`, `Address`, `Order`, `OrderItem`, `Payment`, `Review`, `Category` models + `Role` enum
  - Indexes: `product_category_idx (category)`, `product_is_featured_created_at_idx (isFeatured, createdAt DESC)`, `product_brand_idx (brand)`
  - Full-text search: `product_name_fa_trgm GIN (nameFa gin_trgm_ops)` (requires `CREATE EXTENSION pg_trgm`)
  - `CHECK (stock >= 0)` constraint
  - `updatedAt` on `Product`

### J. Email & SMS

- `lib/email/index.ts` exports `EmailProvider` interface; `ConsoleProvider` (dev), `SmtpProvider` (prod via nodemailer).
- Templates: order confirmation, shipping update, refund, password reset (MJML for RTL-friendly responsive HTML).
- SMS deferred — define `SmsProvider` interface only.

### K. Shipping cost

- `lib/shipping/index.ts` exports `ShippingProvider` interface; `ManualProvider` (flat rate) for v1; `TipaxProvider`, `SnappProvider` later.

### L. Refund/cancel for ZarinPal

- `lib/zarinpal/refund.ts` calls ZarinPal's Refund endpoint with `Authority`.
- `lib/actions/order.actions.ts:cancelOrder` triggers refund for admin.
- `app/api/cron/zarinpal-reconcile/route.ts` daily reconciliation.

### M. Accessibility

- `@axe-core/playwright` in CI.
- Skip link in root layout: `<a href="#main" className="sr-only focus:not-sr-only">پرش به محتوای اصلی</a>`.
- `aria-label` on icon-only buttons (menu trigger is missing it).
- All inputs have `<label htmlFor>`.
- Color contrast on the OKLCH palette (verify with a contrast checker).

### N. Testing

- **Vitest** for unit tests: `lib/persian/normalize.ts`, `lib/persian/numerals.ts`, `lib/cart/pricing.ts`, `lib/zarinpal/client.ts`, `lib/slug.ts`.
- **Playwright** for e2e: sign-in → PDP → add-to-cart → checkout → ZarinPal sandbox → success.
- Persian fixtures in `tests/fixtures/persian-text.ts`.
- i18n coverage test: every key in `messages/en.json` exists in `messages/fa.json` and vice versa.

### O. CI (GitHub Actions)

- `.github/workflows/ci.yml`: lint, typecheck, test, test:e2e, build, on every PR.
- `.github/workflows/deploy.yml`: tag-triggered, runs `prisma migrate deploy` then `vercel deploy --prod`.

### P. Documentation

- `README.md` (rewrite): setup, env vars, scripts, deployment, E-Namad + ZarinPal sandbox process.
- `ARCHITECTURE.md` (new): data model, request flow, i18n strategy, slug/currency policy.
- `CHANGELOG.md` (new): conventional commits.
- `CONTRIBUTING.md` (new): PR template, ZWNJ normalization rule.
- `.env.example` (new, complete): every env var with description.

---

## 5. Implementation phases (ordered commit milestones)

### Phase 0 — Repo hygiene & docs (½ day)
- README rewrite, ARCHITECTURE.md, .env.example, CHANGELOG.md.
- `package.json` scripts: `db:studio`, `db:reset`, `db:migrate:deploy`, `typecheck`, `test`, `test:e2e`.
- `prisma/schema.prisma`: add `slugFa`, `updatedAt` on `Product`.
- Migration for the above.
- Fix the audit defects that are quick: `lucide-react` version, the `params` await in `(root)/layout.tsx`, `lib/utils.ts` `convertToPlainObject`, `db/prisma.ts` singleton guard, default Next.js SVGs deletion.
- **Verify:** fresh clone → `docker compose up -d && pnpm db:migrate:deploy && pnpm dev` boots, lint/typecheck/build all pass clean.

### Phase 1 — SEO foundation (1 day)
- `lib/seo/{metadata,alternates,jsonld.tsx}`.
- `lib/persian/{normalize,numerals,date,slug}.ts`.
- `app/sitemap*.ts`, `app/robots.ts`, `app/manifest.ts`.
- `app/[locale]/layout.tsx` `generateMetadata`, `<JsonLd Organization>`, `<JsonLd WebSite>`.
- `app/[locale]/(root)/page.tsx` `<JsonLd WebSite>`, Suspense wrapping.
- `app/[locale]/(root)/product/[slug]/page.tsx` `generateMetadata` + `<JsonLd Product>` + `<JsonLd BreadcrumbList>`.
- Self-host Vazirmatn + Inter.
- E-Namad script tag in footer.
- `next.config.ts` security headers + `trailingSlash: false`.
- `lib/env.ts` zod validation.
- **Verify:** Lighthouse SEO = 100 on home and PDP; Rich Results Test passes; `curl` confirms hreflang, sitemap, robots, E-Namad script.

### Phase 2 — Auth + Account (2 days)
- Prisma: `User`, `Account`, `Session`, `VerificationToken`, `Address`, `Role` enum.
- `auth.ts` + `auth.config.ts` (Auth.js v5, Credentials, JWT, Prisma adapter).
- `proxy.ts` adds `auth` middleware; protect `/account`, `/checkout`, `/admin`.
- `app/api/auth/[...nextauth]/route.ts`.
- `app/[locale]/(auth)/sign-in/page.tsx`, `sign-up/page.tsx`.
- `app/[locale]/(account)/layout.tsx`, `account/page.tsx`, `account/addresses/page.tsx`.
- `lib/actions/user.actions.ts`: `signUp`, `updateProfile`, `addAddress`.
- `lib/ratelimit.ts` (Upstash).
- Wire `header/menu.tsx` to session.
- **Verify:** sign-up → sign-in → sign-out e2e passes; sign-in rate-limit blocks 6th attempt; `User` row created; JWT includes `role`.

### Phase 3 — Cart + Wishlist (1 day)
- `lib/cart/{store,types,sync,pricing}.ts`.
- `lib/actions/cart.actions.ts`.
- `components/shared/cart/{cart-drawer,cart-icon,cart-count}.tsx`.
- `app/[locale]/(root)/cart/page.tsx`.
- Wire PDP "Add to cart" to action.
- Optional: Prisma `Cart`, `CartItem` for logged-in users; cookie-only for guests (mirrors the tutorial).
- **Verify:** add 3 items, refresh, items persist; sign-in merges/preserves cart; Toman in UI, IRR in payload; e2e add-to-cart passes.

### Phase 4 — Checkout + ZarinPal (2 days)
- Prisma: `Order`, `OrderItem`, `Payment`, `OrderStatus` enum.
- `lib/zarinpal/{client,types,refund}.ts`.
- `lib/actions/{checkout,order}.actions.ts`.
- `app/api/zarinpal/verify/route.ts` (callback verification).
- `app/api/cron/zarinpal-reconcile/route.ts` (daily).
- `app/[locale]/(checkout)/checkout/{shipping,payment,place-order,success,fail}/page.tsx`.
- `app/[locale]/(account)/account/orders/{page.tsx,[id]/page.tsx}`.
- `lib/shipping/index.ts` (ManualProvider).
- **Verify:** e2e checkout → ZarinPal sandbox mock → success → order in DB; Toman × 10 = IRR in payment payload; refund endpoint wired.

### Phase 5 — Catalog (1.5 days)
- Prisma: `Category` model with `name`, `nameFa`, `slug`, `slugFa`.
- `app/[locale]/(root)/category/[slug]/page.tsx` (locale-aware slug lookup, generateMetadata, JSON-LD `CollectionPage`).
- `app/[locale]/(root)/search/page.tsx` (Postgres FTS, `tsvector` on `nameFa`+`descriptionFa`).
- `app/[locale]/(root)/products/page.tsx` (all products, filters, sort, pagination).
- `lib/actions/product.actions.ts`: add `getProductsByCategory`, `searchProducts`, `getCategories`.
- `components/product/{filter-sidebar,sort-dropdown}.tsx`.
- `components/shared/category-nav.tsx` (header menu).
- Fill `app/sitemap-categories.ts`.
- **Verify:** category pages 200, have hreflang; search `گوشی` returns ZWNJ-normalized matches; filters work without URL state corruption.

### Phase 6 — Reviews, ratings, polish (1 day)
- Prisma: `Review` model.
- `lib/actions/review.actions.ts`.
- PDP review form (sign-in required) + list.
- `aggregateRating` JSON-LD appears after first review.
- `reviewLimiter` in `lib/ratelimit.ts`.
- **Verify:** Google Rich Results Test shows stars; rate-limit prevents >5/min.

### Phase 7 — Admin (3 days)
- `app/[locale]/(admin)/admin/{layout,page,products,products/new,products/[id],orders,orders/[id],users,categories}/...`.
- `lib/actions/admin/*.ts`.
- `lib/upload.ts` (R2 + sharp + file-type).
- `User.role: Role @default(USER)` (added in Phase 2); route guard in `proxy.ts` for `/admin/*`.
- Admin can cancel an order → triggers ZarinPal refund.
- **Verify:** non-admin user → 403; admin can upload, edit, cancel; refund endpoint called correctly.

### Phase 8 — Launch hardening (1 day)
- Sentry client/server/edge configs + `instrumentation.ts` + `withSentryConfig`.
- `error.tsx`, `(root)/error.tsx`, `global-error.tsx`.
- Self-host fonts (verify the `next/font/local` config).
- axe-core in Playwright.
- `.github/workflows/ci.yml` + `deploy.yml`.
- E-Namad widget in footer (with real seal ID).
- **Verify:** Sentry receives a test event; all routes return 200 with correct headers; axe-core 0 critical; Lighthouse Performance ≥ 90, SEO = 100, A11y ≥ 95 on home and PDP; `pnpm build` no warnings.

---

## 6. What to skip (out of scope for v1)

- No full PWA service worker / push notifications (manifest is enough).
- No Torob / Divar feed export (need ≥50 products and steady inventory).
- No multi-currency / multi-country shipping (Iran only, IRR + Toman).
- No Elasticsearch / Typesense (Postgres FTS handles v1).
- No multi-vendor marketplace.
- No iOS / Android native app.
- No AI features (recommendations, chat support).
- No loyalty / rewards.
- No subscription / recurring billing (ZarinPal does not natively support).
- No on-prem Iranian hosting (out-of-region hosting is better for SEO).
- No custom Persian date picker (use `<input type="date">` and convert).
- No SMS OTP login (email magic link only).
- No automatic product import from wholesalers.
- No multi-warehouse.
- No Postgres read replica (single primary handles v1).

---

## 7. Quick wins (can do today)

Each item: 30–60 minutes.

1. Move `app/favicon.ico` to `app/[locale]/icon.{ico,png}` (locale-aware, real logo).
2. Add `app/robots.ts` and `app/manifest.ts` (copy snippets from §3.B, §3.H).
3. Add `lib/env.ts` zod validation.
4. Self-host Vazirmatn with `next/font/local` (drop Google Fonts round-trip).
5. Add `next/script strategy="afterInteractive"` for E-Namad placeholder in the footer.
6. ZWNJ-normalize the 12 sample products in `db/sample-data.ts`.
7. Add `slugFa` to `Product` + migration.
8. Wire PDP "Add to cart" to a stub server action (no-op becomes real).
9. Add `app/[locale]/error.tsx` and `app/global-error.tsx`.
10. Add `geo.region` and `geo.placename` meta tags to layout.
11. Add `formatDetection: { telephone: false }` to default metadata.
12. Add `<JsonLd Organization>` to layout.
13. Add security headers from §4.A to `next.config.ts`.
14. Add `typecheck`, `test`, `test:e2e` scripts to `package.json`.
15. Convert all UI numbers to `toPersianDigits` on the home page.
16. Add `app/sitemap.ts` with a static home entry per locale.
17. Fix the audit defects: `lucide-react` version, the `params` await in `(root)/layout.tsx`, the singleton guard in `db/prisma.ts`, `convertToPlainObject` Decimal handling.
18. Delete `public/{file,globe,next,vercel,window}.svg` (boilerplate).
19. Fix the empty `<SheetDescription />` in `components/shared/header/menu.tsx:57`.
20. Replace hardcoded `alt="hero image"`/`alt="image"` in `ProductImages.tsx` with localized product name.

---

## Audit-driven fixes (must-do alongside phases)

These are concrete defects the audit surfaced — they block quality regardless of which feature phase we are in:

- `app/[locale]/(root)/layout.tsx:11-12` — `params` is a `Promise` but is not `await`ed. Remove the `as unknown as` cast and `await` it.
- `package.json:18` — `lucide-react@^1.34.0` does not exist on the public registry. Pin to `^0.469.0`.
- `package.json:10` — `postinstall: prisma generate` will fail in CI without `DATABASE_URL`. Guard with `if [ -n "$DATABASE_URL" ]; then prisma generate; fi` or move to a separate `db:generate` script.
- `db/prisma.ts:1-24` — add `globalThis.prisma` singleton guard.
- `lib/utils.ts:9-11` — `convertToPlainObject` is slow; replace with a typed `prismaToJson` that handles Decimal/Date explicitly.
- `components/product/product-price.tsx:4-5,19` — `Intl.NumberFormat('en-US')` regardless of locale; Toman suffix is hardcoded. Make locale-aware via `useLocale()` and a `currency.*` translation key.
- `components/product/product-images.tsx:14,29` — replace `alt="hero image"`/`alt="image"` with `alt={product.nameFa ?? product.name}`.
- `components/shared/product/product-card.tsx:9` — pass `locale` from the parent (the parent already has it) instead of inferring from data presence.
- `components/shared/product/product-list.tsx:14` — remove unused `useLocale()` import.
- `prisma/schema.prisma` — add `updatedAt @updatedAt` to `Product`; add `CHECK (stock >= 0)`; add `slugFa`; add indexes on `category`, `isFeatured`, `createdAt`, `brand`.
- `app/[locale]/not-found.tsx:18` — `alt={APP_NAME}` works today but is fragile; use a `brand.alt` translation key.
- `next.config.ts` — add `images.remotePatterns` for the R2 bucket when added; add `experimental.typedRoutes`; add `trailingSlash: false`.

---

## Definition of Done (per phase)

- `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build` all pass clean.
- For SEO phases: Lighthouse SEO = 100; Google Rich Results Test passes for any new JSON-LD; `curl` confirms hreflang, sitemap, robots.
- For feature phases: e2e covers the user story; axe-core reports 0 critical issues.
- For schema changes: a new migration is checked in; `prisma migrate diff` is empty after the change.
- Commit messages follow Conventional Commits; one logical commit per phase unless a phase is large.
