# Panah Kala Shop — فروشگاه پناه کالا

A production-oriented, bilingual (Persian/English) e-commerce storefront built with Next.js 16, adapted from the [next-ecom-prostore](https://github.com/mammad-linuxer/next-ecom-prostore) roadmap for the Iranian market.

- **Default language:** Persian (`fa`, RTL) with English (`en`) — sub-path routing `/fa/...`, `/en/...`
- **Payments:** [ZarinPal](https://www.zarinpal.com/docs/) online gateway + Cash on Delivery (PayPal/Stripe intentionally skipped)
- **Currency:** Toman in the UI, IRR (×10) in structured data per schema.org requirements
- **Themes:** Light (porcelain + Persian turquoise) and dark (graphite black-grey combo)

## Stack

| Layer      | Tech                                                          |
| ---------- | ------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Server Actions, Turbopack)            |
| Language   | TypeScript                                                    |
| Database   | PostgreSQL 17 (Docker) + Prisma 7 (driver adapters)           |
| Auth       | Auth.js v5 (NextAuth) — credentials provider, JWT sessions    |
| i18n       | next-intl 4 (fa default RTL / en)                             |
| UI         | Tailwind CSS 4 + shadcn-style components (radix-ui)           |
| Payments   | ZarinPal REST (request → gateway → callback verify)           |

## Getting started

```bash
# 1. Install dependencies
npm install

# 2. Start PostgreSQL
docker compose up -d

# 3. Configure environment
cp .env.example .env   # then fill in the values

# 4. Apply migrations + seed sample data (12 products, admin + user accounts)
npx prisma migrate deploy
npm run db:seed

# 5. Run the dev server
npm run dev
```

Open http://localhost:3000 (redirects to `/fa`).

### Seeded accounts

| Role  | Email              | Password |
| ----- | ------------------ | -------- |
| Admin | admin@example.com  | 123456   |
| User  | jane@example.com   | 123456   |

## Scripts

| Command             | Description                     |
| ------------------- | ------------------------------- |
| `npm run dev`       | Start the dev server            |
| `npm run build`     | Production build                |
| `npm run lint`      | ESLint                          |
| `npm run db:seed`   | Seed sample data                |

## Features

- Product catalog (fa/en names, categories, descriptions) with search, category/price/rating filters and sorting
- Session cart (cookie-based, guest + signed-in), checkout flow (address → payment → place order)
- ZarinPal sandbox payment + cash on delivery, order history, order detail with payment status/reference
- Ratings & reviews (one review per user per product, auto-recalculated averages)
- Admin dashboard: sales overview + chart, orders (deliver/delete), products CRUD, users (role management)
- SEO for the Persian market: hreflang (`fa-IR`/`en-US`), canonical, sitemap.xml, robots.txt (Google/Yandex/Bing), Product/Organization/Breadcrumb JSON-LD, geo meta tags, PWA manifest
- Security headers, localized error boundaries, global error page

## Production notes

- Set `NEXT_PUBLIC_SITE_URL` to the real domain (drives metadata, sitemap, JSON-LD).
- Use a real ZarinPal merchant id and set `ZARINPAL_SANDBOX=false`.
- Order receipt emails use a pluggable provider (`lib/email/order-receipt.ts`); the dev provider logs to console — swap in SMTP/nodemailer for production. Resend is intentionally avoided (may be blocked from Iran).
- Product image uploads are URL-based; Cloudflare R2 + `sharp` is planned (see `docs/PRODUCTION_UPGRADE_PLAN.md`).
- Run `npx prisma migrate deploy` on deploy — never `db push` against production.
