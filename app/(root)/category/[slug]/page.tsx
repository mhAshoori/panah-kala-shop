import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import ProductList from '@/components/shared/product/product-list';
import SortDropdown from '@/components/shared/product/sort-dropdown';
import Pagination from '@/components/shared/pagination';
import PageSizeSelector from '@/components/shared/page-size-selector';
import { parsePageSize } from '@/lib/constants';
import {
  getCategoryBySlug,
  getCategoryTree,
  getProductsByCategorySlug,
} from '@/lib/actions/product.actions';
import { getLocale } from 'next-intl/server';
import { buildAlternates, getSiteUrl } from '@/lib/seo';
import { Link } from '@/i18n/navigation';
import Breadcrumbs from '@/components/shared/breadcrumbs';
import { formatNumberLocale } from '@/lib/persian';

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const locale = await getLocale();
  const category = await getCategoryBySlug(slug);
  if (!category) return {};

  const name = locale === 'fa' ? category.nameFa : category.name;

  return {
    title: name,
    description:
      locale === 'fa'
        ? `خرید ${name} با بهترین قیمت از فروشگاه پناه کالا`
        : `Shop ${name} at the best prices from Panah Kala Shop`,
    alternates: buildAlternates(`/category/${slug}`),
    openGraph: {
      type: 'website',
      title: name,
      url: `${getSiteUrl()}/category/${slug}`,
    },
  };
}

const CategoryPage = async (props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; sort?: string; size?: string }>;
}) => {
  const { slug } = await props.params;
  const { page, sort, size } = await props.searchParams;
  const locale = await getLocale();
  const isFa = locale === 'fa';

  const result = await getProductsByCategorySlug({
    slug,
    sort,
    page: Number(page) || 1,
    limit: parsePageSize(size),
  });

  if (!result) notFound();

  // Parent category for the breadcrumb trail (subcategory pages only)
  const tree = await getCategoryTree();
  const parentCategory = tree.find((root) =>
    root.children.some((c) => c.id === result.category.id)
  );

  const t = await getTranslations('search');
  const tCategory = await getTranslations('category');
  const tHome = await getTranslations('home');

  return (
    <div className='space-y-4'>
      {/* Breadcrumb trail: parent chain when this is a subcategory */}
      <Breadcrumbs
        className='mb-2'
        items={[
          ...(parentCategory
            ? [
                {
                  label: isFa
                    ? parentCategory.nameFa
                    : parentCategory.name,
                  href: `/category/${parentCategory.slug}`,
                },
              ]
            : []),
          {
            label: isFa ? result.category.nameFa : result.category.name,
          },
        ]}
      />

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='h2-bold'>
          {isFa ? result.category.nameFa : result.category.name}
        </h1>
        <div className='flex items-center gap-2'>
          <SortDropdown />
          <PageSizeSelector current={parsePageSize(size)} />
        </div>
      </div>

      {/* Results — or an explicit "empty" message (never a not-found) */}
      {result.data.length === 0 ? (
        <p className='py-12 text-center text-sm text-muted-foreground'>
          {tCategory('empty')}
        </p>      ) : (
        <>
          <ProductList
            title={`${t('results')} (${formatNumberLocale(result.data.length, locale)})`}
            data={result.data}
          />
        </>
      )}

      <Pagination page={Number(page) || 1} totalPages={result.totalPages} />

      <div className='flex justify-center'>
        <Link
          href='/search'
          className='text-sm text-muted-foreground hover:text-primary transition-colors'
        >
          {tHome('viewAll')}{' '}
          <span aria-hidden='true' className='rtl:hidden'>
            →
          </span>
          <span aria-hidden='true' className='hidden rtl:inline'>
            ←
          </span>
        </Link>
      </div>
    </div>
  );
};

export default CategoryPage;
