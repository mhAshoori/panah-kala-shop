import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils';

import ProductList from '@/components/shared/product/product-list';
import SortDropdown from '@/components/shared/product/sort-dropdown';
import Pagination from '@/components/shared/pagination';
import PageSizeSelector from '@/components/shared/page-size-selector';
import SearchBar from '@/components/shared/header/search';
import { parsePageSize } from '@/lib/constants';
import { getFilteredProducts, getCategoriesWithCount, getBrandOptions } from '@/lib/actions/product.actions';
import { filterVisibleCategories } from '@/lib/category-visibility';
import { formatNumberLocale } from '@/lib/persian';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(props: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await props.searchParams;
  const t = await getTranslations('search');
  return { title: q ? `${t('resultsFor')} ${q}` : t('title') };
}

// Toman ranges matched to the storefront's actual price scale
const PRICE_RANGES = ['all', '0-10000000', '10000000-30000000', '30000000-60000000', '60000000-'];
const RATINGS = ['all', '4', '3', '2', '1'];

const SearchPage = async (props: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    price?: string;
    rating?: string;
    sort?: string;
    brand?: string;
    inStock?: string;
    page?: string;
    size?: string;
  }>;
}) => {
  const locale = await getLocale();
  const isFa = locale === 'fa';
  const sp = await props.searchParams;

  const q = sp.q ?? '';
  const category = sp.category ?? 'all';
  const price = sp.price ?? 'all';
  const rating = sp.rating ?? 'all';
  const sort = sp.sort ?? 'newest';
  const brand = sp.brand ?? 'all';
  const inStock = sp.inStock ?? '';
  const page = Number(sp.page) || 1;
  const size = parsePageSize(sp.size);

  const t = await getTranslations('search');
  const tCommon = await getTranslations('common');

  const getFilterUrl = ({
    c,
    p,
    r,
    s,
    b,
    k,
    pg,
  }: {
    c?: string;
    p?: string;
    r?: string;
    s?: string;
    b?: string;
    k?: string;
    pg?: string;
  }) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (c && c !== 'all') params.set('category', c);
    if (p && p !== 'all') params.set('price', p);
    if (r && r !== 'all') params.set('rating', r);
    if (s && s !== 'newest') params.set('sort', s);
    if (b && b !== 'all') params.set('brand', b);
    if (k === '1') params.set('inStock', '1');
    if (pg && pg !== '1') params.set('page', pg);
    const qs = params.toString();
    return `/search${qs ? `?${qs}` : ''}`;
  };

  const products = await getFilteredProducts({
    query: q,
    category,
    price,
    rating,
    sort,
    brand,
    inStock,
    page,
    limit: size,
  });

  const [categories, brands] = await Promise.all([
    getCategoriesWithCount().then((cats) =>
      filterVisibleCategories(cats).filter((c) => !c.parentId)
    ),
    getBrandOptions(),
  ]);
  const priceLabel = (range: string) => {
    if (range === 'all') return t('priceAny');
    const [minRaw, maxRaw] = range.split('-');
    const fmt = (n: number) => new Intl.NumberFormat('en-US').format(n);
    // Number('') is 0, not NaN — test the raw string for the open-ended max
    if (maxRaw === '') return `${t('priceOver')} ${fmt(Number(minRaw))} ${tCommon('currency')}`;
    const min = Number(minRaw);
    const max = Number(maxRaw);
    if (min === 0) return `${t('priceUnder')} ${fmt(max)} ${tCommon('currency')}`;
    return `${fmt(min)} - ${fmt(max)}`;
  };

  const ratingLabel = (r: string) => {
    if (r === 'all') return t('ratingAny');
    return `${r}+`;
  };

  const chip = (active: boolean) =>
    cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors',
      active
        ? 'bg-primary text-primary-foreground border-primary'
        : 'hover:bg-muted text-muted-foreground'
    );

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='h2-bold'>
          {q
            ? `${t('resultsFor')} “${q}”`
            : category !== 'all'
              ? `${t('category')}: ${locale === 'fa' ? categories.find((c) => c.name === category)?.nameFa : category}`
              : t('title')}
        </h1>
        <div className='flex items-center gap-2'>
          <SortDropdown />
          <PageSizeSelector current={size} />
        </div>
      </div>

      {/* Search again from the results page */}
      <SearchBar
        categories={categories.map((c) => ({
          value: c.name,
          label: c.nameFa,
        }))}
        defaultQuery={q}
        defaultCategory={category}
        className='max-w-xl'
      />

      {/* Category filters */}
      <div className='flex flex-wrap items-center gap-2'>
        <Link href={getFilterUrl({ c: 'all' })} className={chip(category === 'all')}>
          {t('allCategories')}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.name}
            href={getFilterUrl({ c: c.name })}
            className={chip(category === c.name)}
          >
            {isFa ? c.nameFa : c.name}
          </Link>
        ))}
      </div>

      {/* Price + rating filters */}
      <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{tCommon('price')}:</span>
          {PRICE_RANGES.map((p) => (
            <Link key={p} href={getFilterUrl({ p })} className={chip(price === p)}>
              {priceLabel(p)}
            </Link>
          ))}
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm text-muted-foreground'>{tCommon('rating')}:</span>
          {RATINGS.map((r) => (
            <Link key={r} href={getFilterUrl({ r })} className={chip(rating === r)}>
              {ratingLabel(r)}
            </Link>
          ))}
        </div>

        {brands.length > 1 && (
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm text-muted-foreground'>
              {tCommon('brand')}:
            </span>
            <Link href={getFilterUrl({ b: 'all' })} className={chip(brand === 'all')}>
              {t('allBrands')}
            </Link>
            {brands.map((b) => (
              <Link key={b} href={getFilterUrl({ b })} className={chip(brand === b)}>
                {b}
              </Link>
            ))}
          </div>
        )}

        <div className='flex flex-wrap items-center gap-2'>
          <span className='text-sm text-muted-foreground'>
            {t('availability')}:
          </span>
          <Link
            href={getFilterUrl({ k: inStock ? '' : '1' })}
            className={chip(!!inStock)}
          >
            {t('inStockOnly')}
          </Link>
        </div>
      </div>

      {/* Results */}
      <ProductList
        title={`${t('results')} (${formatNumberLocale(products.data.length, locale)})`}
        data={products.data}
      />

      <Pagination page={page} totalPages={products.totalPages} />
    </div>
  );
};

export default SearchPage;
