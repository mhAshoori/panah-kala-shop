import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import CategoryForm from '@/components/shared/admin/category-form';
import { getCategoriesWithCount } from '@/lib/actions/product.actions';
import { prisma } from '@/db/prisma';

const UpdateCategoryPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;
  const t = await getTranslations('admin');

  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) return notFound();

  const parentOptions = (await getCategoriesWithCount())
    .filter((c) => !c.parentId)
    .map((c) => ({ id: c.id, nameFa: c.nameFa }));

  return (
    <div className='max-w-3xl space-y-6'>
      <h1 className='h2-bold'>{t('editCategory')}</h1>
      <CategoryForm
        type='Update'
        category={{
          id: category.id,
          name: category.name,
          nameFa: category.nameFa,
          slug: category.slug,
          icon: category.icon,
          sortOrder: category.sortOrder,
          parentId: category.parentId,
          hideEmpty: category.hideEmpty,
        }}
        parentOptions={parentOptions}
      />
    </div>
  );
};

export default UpdateCategoryPage;
