import { getTranslations } from 'next-intl/server';

import CategoryForm from '@/components/shared/admin/category-form';

const CreateCategoryPage = async () => {
  const t = await getTranslations('admin');

  return (
    <div className='max-w-3xl space-y-6'>
      <h1 className='h2-bold'>{t('createCategory')}</h1>
      <CategoryForm type='Create' />
    </div>
  );
};

export default CreateCategoryPage;
