import { useTranslations } from 'next-intl';
import ProductCard from './product-card';
import type { SampleProduct } from '@/db/sample-data';

export type LocalizedProduct = SampleProduct & {
  localName?: string;
  localCategory?: string;
};

const ProductList = ({
  data,
  title,
  limit,
}: {
  data: SampleProduct[];
  title?: string;
  limit?: number;
}) => {
  const t = useTranslations('common');
  const limitedData = limit ? data.slice(0, limit) : data;

  return (
    <div className="my-10">
      <h2 className="h2-bold mb-4">{title}</h2>
      {limitedData.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {limitedData.map((product) => (
            <ProductCard
              key={product.slug}
              product={
                {
                  ...product,
                  localName: product.nameFa ?? product.name,
                  localCategory: product.categoryFa ?? product.category,
                } as LocalizedProduct
              }
            />
          ))}
        </div>
      ) : (
        <p>{t('notFound')}</p>
      )}
    </div>
  );
};

export default ProductList;
