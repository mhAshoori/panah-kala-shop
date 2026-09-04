import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import ProductForm from '@/components/shared/admin/product-form';
import { getProductById, getCategoriesWithCount } from '@/lib/actions/product.actions';

const UpdateProductPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;

  const t = await getTranslations('admin');
  const [product, categories] = await Promise.all([
    getProductById(id),
    getCategoriesWithCount(),
  ]);

  if (!product) return notFound();

  const options = (product.options ?? []).map((o: {
    name: string;
    nameFa: string;
    values: { value: string; valueFa: string; hex: string | null }[];
  }) => ({
    name: o.name,
    nameFa: o.nameFa,
    values: o.values.map((v) => ({
      value: v.value,
      valueFa: v.valueFa,
      hex: v.hex ?? '#888888',
    })),
  }));
  const variants = (product.variants ?? []).map((v: {
    price: string;
    compareAtPrice: string | null;
    stock: number;
  }) => ({
    key: '',
    price: v.price,
    compareAtPrice: v.compareAtPrice ?? '',
    stock: String(v.stock),
  }));

  return (
    <div className='max-w-5xl space-y-6'>
      <h1 className='h2-bold'>{t('editProduct')}</h1>
      <ProductForm
        type='Update'
        product={product}
        productId={product.id}
        categories={categories}
        options={options}
        variants={variants}
      />
    </div>
  );
};

export default UpdateProductPage;
