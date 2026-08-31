# سئو (SEO) برای فروشگاه پناه کالا — نقشه راه و آموزش

> This guide assumes **zero SEO knowledge**. Read it top to bottom once, then
> use §7 as your weekly checklist. Everything labeled **[پنل مدیریت]** can be
> done from the admin panel without touching code.

---

## 1. What is SEO and why should you care?

SEO (بهینه‌سازی برای موتورهای جستجو) is the practice of making your shop easy
for Google (and Yandex/Bing) to **understand, trust, and recommend**.

When someone in Iran searches **"خرید آیفون ۱۵"** or **"قیمت هدست سونی"**,
Google picks ~10 results out of millions. SEO decides whether پناه کالا is
among them. Unlike ads, organic traffic is free — and shoppers trust organic
results more.

The three pillars, in order of importance for a new shop:

| Pillar | What it means | Your job |
|---|---|---|
| **Technical** (فنی) | Googlebot can crawl, read, and index every page | Mostly done in code — see §3 |
| **Content** (محتوا) | Pages answer what people actually search for | Product names/descriptions in good Persian — §4 |
| **Trust** (اعتماد) | Other sites & users vouch for you | E-Namad, backlinks, reviews — §5 |

---

## 2. How Persian users search (market specifics)

Persian search behavior differs from English in ways that matter:

1. **Half-space (نیم‌فاصله) matters.** People type `گوشی موبایل`, `لپ تاپ`,
   `می‌خواهم`. ZWNJ (`‌`) vs space changes matching. Keep product names
   consistent: always `لپ‌تاپ` with half-space in `nameFa`.
2. **Category words are search words.** Users search `گوشی سامسونگ`, not
   model numbers first. This is why category names must be searchable —
   the shop's search already matches `categoryFa` because of this.
3. **Toman vs Rial.** Persian users think in تومان. Prices in UI stay Toman;
   structured data uses Rial (Google's requirement) — this is already handled.
4. **Google is partially throttled in Iran** — so we also welcome
   **Yandex** and **Bing** in robots.txt (already done). Persian users on
   Android often use Chrome+Google anyway; don't optimize *only* for Yandex.
5. **Trust symbols drive clicks.** A result showing "نماد اعتماد" or a real
   address gets more clicks from Iranian users — clicks are an SEO ranking
   signal too.

---

## 3. What the app already does (technical foundation ✅)

You don't need to do anything for these — they are automatic:

- **Sitemap** (`/sitemap.xml`) — a list of every product/category page,
  auto-updated from the database.
- **robots.txt** (`/robots.txt`) — tells crawlers what to index; blocks
  admin/cart/account pages.
- **Structured data (JSON-LD)** — every product page tells Google its price
  (IRR), availability, rating, and brand → enables **star ratings and price
  in search results**.
- **Meta title & description per page** — what users see in the blue Google
  result line.
- **Mobile-first RTL design, fast self-hosted fonts** — speed is a ranking
  factor and Iranian mobile users are the majority.
- **Canonical URLs** — prevents duplicate-content penalties.

**[پنل مدیریت] The SEO block** in *پنل مدیریت → صفحه اصلی* lets you change:
- Site title (the `<title>` shown in Google)
- Site description (the black summary text under the title)
- Keywords (comma-separated; Google mostly ignores them, but Yandex reads them)

---

## 4. Content playbook (your main job)

### 4.1 Product naming formula (most important thing you'll do)

Bad: `آیفون اپل` — competes with millions.
Good: `خرید آیفون ۱۵ پرو مکس ۲۵۶ گیگابایت اکتیویتیده` — includes what people type.

Formula for `nameFa`:
```
[نوع محصول] + [برند] + [مدل دقیق] + [ویژگی تمایز: رنگ/حافظه/گارانتی]
```
Examples:
- `گوشی موبایل سامسونگ گلکسی S24 اولترا ۵۱۲ گیگ حافظه`
- `هدفون بی‌سیم سونی WH-1000XM5 نویز کنسلینگ`
- `لپ‌تاپ ایسوس ROG Strix G16 RTX4070 گیمینگ`

### 4.2 Description formula (2–4 sentences minimum)

1. What it is + who it's for (a Persian sentence a human would write)
2. 2–3 key specs with the words people search (`باتری ۵۰۰۰`, `حافظه ۲۵۶`)
3. Trust line: `۱۸ ماه گارانتی شرکتی + ارسال سریع از تهران`

Never copy the manufacturer's English text — Google penalizes duplicate
content, and Persian users skim past it.

### 4.3 Categories = landing pages

Each category page (`/category/mobile-phones`) is a search landing page.
Give every category a proper `nameFa` (`هدفون و هندزفری`, not just `صوتی`)
— the name becomes the page's H1 and title.

### 4.4 Blogs? (later, phase 2)

A small blog (`راهنمای خرید لپ‌تاپ گیمینگ`, `مقایسه آیفون و گلکسی`) is the
#1 way to rank for informational queries. Not built yet — worth a dev task
after launch when there's time to write content.

---

## 5. Trust building (Iranian specifics)

### 5.1 E-Namad (نماد اعتماد الکترونیکی) — do this FIRST

Without E-Namad, Iranian users (and indirectly Google) trust the shop less.

1. Register at [enamad.ir](https://enamad.ir) — needs a real business
   identity, domain, and working checkout (we have one).
2. Once approved, you get a seal code → give it to the developer to embed
   in the footer (there is already a placeholder slot for it).
3. E-Namad also **syndicates your shop to other Iranian trust lists**.

### 5.2 Google Search Console (ابزار اصلی شما)

This is Google's free dashboard telling you **what Google sees**.

1. Go to [search.google.com/search-console](https://search.google.com/search-console)
2. Add property → `https://YOUR-DOMAIN.ir` (URL prefix method)
3. Choose "HTML tag" verification → copy the `google-site-verification` code
   → **[پنل مدیریت]** paste it into the SEO block's verification field.
   The tag appears in `<head>` automatically. Click Verify.
4. Submit sitemap: left menu → Sitemaps → type `sitemap.xml` → Submit.
5. **Weekly habit:** open Performance → see which queries show your pages →
   if a product shows for a query at position 8–20, improve its `nameFa`/
   `descriptionFa` to match that query better.

### 5.3 Other directories & signals (one-time, ~2 hours)

- Add the shop to **Yandex Webmaster** (yandex.com/webmaster) — same
  verification flow; submit the same sitemap.
- Create **Google Business Profile** with the real Tehran address.
- Neshan/Balad listing if you have a physical pickup address.
- Later: get listed on 2–3 Iranian tech blogs / price-comparison sites
  (Torob, Emalls) — these "backlinks" are trust votes.

### 5.4 Reviews (already built!)

The review system feeds `aggregateRating` → **stars in Google results**.
Encourage buyers to leave reviews (an order-receipt email nudge is a good
future feature). More reviews = more stars = more clicks.

---

## 6. Measurement — how do you know it's working?

| Metric | Where | Healthy target (3 months) |
|---|---|---|
| Indexed pages | Search Console → Pages | ≈ products + categories + 5 |
| Impressions/clicks | Search Console → Performance | growing week over week |
| Persian keyword positions | Search Console → Queries | any top-20 hit = progress |
| Core Web Vitals | PageSpeed Insights (pagespeed.web.dev) | green ≥ 90 mobile |

Check **PageSpeed Insights** on the home page and one product page after
launch. Anything red on mobile → tell the developer, it's fixable.

---

## 7. Routine checklist

### After adding each product (5 min)
- [ ] `nameFa` follows the §4.1 formula
- [ ] `descriptionFa` is original Persian, 2+ sentences, mentions searchable specs
- [ ] At least 2 clean images (first image is what Google shows)
- [ ] Correct category + stock + price

### Weekly (10 min)
- [ ] Search Console: any new queries/positions worth acting on?
- [ ] Any product with 0 impressions for 2+ weeks → rewrite its name/description

### Monthly (30 min)
- [ ] PageSpeed check on home + top product
- [ ] Search Console → Pages: anything important marked "not indexed"?
- [ ] Ask 2–3 recent customers for reviews

---

## 8. What's automated vs. what's on you

| Automated in code | Your job (no code) |
|---|---|
| Sitemap, robots, JSON-LD, meta tags, speed, mobile | Persian product content |
| Canonical URLs, hreflang-ready structure | E-Namad registration |
| Search matching Persian half-space style queries | Search Console setup & weekly check |
| Stars in results via review data | Getting those reviews |
| **[پنل مدیریت]** title/description/keywords/OG image/verification | Blog content (future) |

---

## 9. Glossary (quick reference)

- **Crawl/index** — Google reading and storing your pages. Check via
  `site:yourdomain.ir` in Google.
- **Canonical** — the "official" URL of a page; prevents duplicate penalties.
- **OG image** — the preview image when someone shares your link in
  WhatsApp/Telegram (huge in Iran — always have one set). **[پنل مدیریت]**
- **Structured data** — machine-readable labels (price, rating) that earn
  rich results (stars, price badges).
- **Backlink** — another site linking to yours = a trust vote.
