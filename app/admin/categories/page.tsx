import { getTranslations } from 'next-intl/server';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DeleteDialog from '@/components/shared/delete-dialog';
import {
  deleteCategory,
  getAllCategoriesAdmin,
} from '@/lib/actions/category.actions';
import { Link } from '@/i18n/navigation';
import { formatId } from '@/lib/utils';

const AdminCategoriesPage = async () => {
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  const categories = await getAllCategoriesAdmin();

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h1 className='h2-bold'>{t('categories')}</h1>
        <Button asChild>
          <Link href='/admin/categories/create'>{t('createCategory')}</Link>
        </Button>
      </div>

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('id')}</TableHead>
              <TableHead>{t('categoryEn')}</TableHead>
              <TableHead>{t('categoryFa')}</TableHead>
              <TableHead>{t('slug')}</TableHead>
              <TableHead>{t('icon')}</TableHead>
              <TableHead>{t('sortOrder')}</TableHead>
              <TableHead>{t('products')}</TableHead>
              <TableHead className='text-end'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='text-center text-muted-foreground'>
                  {tCommon('notFound')}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className='font-mono text-xs'>
                    {formatId(c.id)}
                  </TableCell>
                  <TableCell className='font-medium'>
                    {c.parentName && (
                      <span className='text-xs text-muted-foreground'>
                        {c.parentName} ›{' '}
                      </span>
                    )}
                    {c.name}
                  </TableCell>
                  <TableCell>{c.nameFa}</TableCell>
                  <TableCell className='font-mono text-xs'>{c.slug}</TableCell>
                  <TableCell className='font-mono text-xs'>{c.icon}</TableCell>
                  <TableCell>{c.sortOrder}</TableCell>
                  <TableCell>{c.count}</TableCell>
                  <TableCell className='flex justify-end gap-1'>
                    <Button asChild size='sm' variant='outline'>
                      <Link href={`/admin/categories/${c.id}`}>{t('edit')}</Link>
                    </Button>
                    <DeleteDialog id={c.id} action={deleteCategory} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default AdminCategoriesPage;
