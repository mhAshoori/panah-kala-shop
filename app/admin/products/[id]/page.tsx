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

  return (
    <div className='max-w-5xl space-y-6'>
      <h1 className='h2-bold'>{t('editProduct')}</h1>
      <ProductForm
        type='Update'
        product={product}
        productId={product.id}
        categories={categories}
      />
    </div>
  );
};

export default UpdateProductPage;
