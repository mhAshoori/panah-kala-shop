# Product Categorization — Plan

## Current implementation (done)

- **`Category` model**: `slug` (unique, URL key), `name` (English), `nameFa` (Persian),
  `icon` (lucide key used by the dock), `sortOrder`, `products[]` relation.
- **`Product.categoryId`** FK (`onDelete: SetNull`); legacy `category` / `categoryFa`
  string columns are kept in sync for search filtering and backward compatibility.
- **Seeding**: `db/seed.ts` derives categories from the sample data
  (Mobile Phones, Laptops, Audio, Wearables, Tablets, Cameras, Monitors, Gaming)
  and links every product to its category.
- **Admin sync**: `createProduct` / `updateProduct` upsert the `Category` row from
  the form's category pair, so the catalog never drifts.
- **Surfaces**:
  - Floating category dock ("hovering bar") on every storefront page → `/category/[slug]`
  - "Shop by category" grid on the homepage
  - `/category/[slug]` pages with sorting + pagination + per-category SEO metadata
  - Categories included in `sitemap.xml`
  - Category filter chips on `/search` (query-param based, works alongside)

## Next phases (proposed order)

1. **Admin CRUD for categories** (`/admin/categories`): list with product counts,
   create/edit form (name, nameFa, slug auto-generated + editable, icon picker,
   sortOrder drag handle), delete guarded when products are attached
   (offer "move products to another category").
2. **Sub-categories (2-level tree)**: add `parentId` to `Category`; dock panel
   gains a two-column flyout (parent on the left, children on the right).
   `Product` keeps a single `categoryId` (leaf node).
3. **Category banners & SEO fields**: `banner`, `description`, `descriptionFa`,
   `metaTitle`, `metaDescription` per category for landing-page quality SEO.
4. **Faceted navigation**: brand + price + rating filters inside category pages
   (reuse the `/search` filter URL builder), with URL state preserved.
5. **Auto-categorization**: when creating a product without an explicit category,
   infer it from keywords in the name (normalized against `Category.aliases`
   JSON field).
6. **Performance**: materialized `_count` cache column on `Category` refreshed
   via a Prisma extension hook, once catalogs exceed ~10k products.
