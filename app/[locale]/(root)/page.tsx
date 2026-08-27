import { getTranslations, setRequestLocale } from 'next-intl/server';
import ProductList from '@/components/shared/product/product-list';
import { getLatestProducts } from '@/lib/actions/product.actions';

const HomePage = async ({
  params,
}: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('home');

  const latestProducts = await getLatestProducts();

  return (
    <div className="space-y-8">
      <h2 className="h2-bold">{t('latestProducts')}</h2>
      <ProductList title={t('latestProducts')} data={latestProducts} />
    </div>
  );
};

export default HomePage;
