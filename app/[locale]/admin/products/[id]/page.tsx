import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import ProductForm from '@/components/shared/admin/product-form';
import { getProductById } from '@/lib/actions/product.actions';

const UpdateProductPage = async (props: {
  params: Promise<{ locale: string; id: string }>;
}) => {
  const { locale, id } = await props.params;
  setRequestLocale(locale);

  const t = await getTranslations('admin');

  const product = await getProductById(id);

  if (!product) return notFound();

  return (
    <div className='max-w-5xl space-y-6'>
      <h1 className='h2-bold'>{t('editProduct')}</h1>
      <ProductForm type='Update' product={product} productId={product.id} />
    </div>
  );
};

export default UpdateProductPage;
