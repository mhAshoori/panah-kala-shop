import { getTranslations } from 'next-intl/server';

import ProductForm from '@/components/shared/admin/product-form';

const CreateProductPage = async () => {
  const t = await getTranslations('admin');

  return (
    <div className='max-w-5xl space-y-6'>
      <h1 className='h2-bold'>{t('createProduct')}</h1>
      <ProductForm type='Create' />
    </div>
  );
};

export default CreateProductPage;
