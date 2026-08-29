import { getTranslations } from 'next-intl/server';

import CategoryForm from '@/components/shared/admin/category-form';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';

const CreateCategoryPage = async () => {
  const t = await getTranslations('admin');
  const parentOptions = (await getCategoriesWithCount())
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, nameFa: c.nameFa }));

  return (
    <div className='max-w-3xl space-y-6'>
      <h1 className='h2-bold'>{t('createCategory')}</h1>
      <CategoryForm type='Create' parentOptions={parentOptions} />
    </div>
  );
};

export default CreateCategoryPage;
