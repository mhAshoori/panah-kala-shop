import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import ProductList from '@/components/shared/product/product-list';
import SortDropdown from '@/components/shared/product/sort-dropdown';
import Pagination from '@/components/shared/pagination';
import {
  getCategoryBySlug,
  getProductsByCategorySlug,
} from '@/lib/actions/product.actions';
import { getLocale } from 'next-intl/server';
import { buildAlternates, getSiteUrl } from '@/lib/seo';
import { Link } from '@/i18n/navigation';
import Breadcrumbs from '@/components/shared/breadcrumbs';

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
  searchParams: Promise<{ page?: string; sort?: string }>;
}) => {
  const { slug } = await props.params;
  const { page, sort } = await props.searchParams;
  const locale = await getLocale();
  const isFa = locale === 'fa';

  const result = await getProductsByCategorySlug({
    slug,
    sort,
    page: Number(page) || 1,
  });

  if (!result) notFound();

  const t = await getTranslations('search');
  const tHome = await getTranslations('home');

  return (
    <div className='space-y-4'>
      {/* Breadcrumb trail */}
      <Breadcrumbs
        className='mb-2'
        items={[{ label: isFa ? result.category.nameFa : result.category.name }]}
      />

      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='h2-bold'>
          {isFa ? result.category.nameFa : result.category.name}
        </h1>
        <SortDropdown />
      </div>

      <ProductList
        title={`${t('results')} (${result.data.length})`}
        data={result.data}
      />

      <Pagination page={Number(page) || 1} totalPages={result.totalPages} />

      <div className='flex justify-center'>
        <Link
          href='/search'
          className='text-sm text-muted-foreground hover:text-primary transition-colors'
        >
          {tHome('viewAll')} →
        </Link>
      </div>
    </div>
  );
};

export default CategoryPage;
