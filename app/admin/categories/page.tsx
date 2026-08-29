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
import { getCategoryIcon } from '@/components/shared/category/category-icons';
import {
  deleteCategory,
  getAllCategoriesAdmin,
} from '@/lib/actions/category.actions';
import { Link } from '@/i18n/navigation';
import { formatId } from '@/lib/utils';

// Sort hierarchy-first: each main category followed by its subs/sub-subs
function sortHierarchically<
  T extends { id: string; parentId: string | null; sortOrder: number },
>(rows: T[]): T[] {
  const mains = rows.filter((r) => !r.parentId);
  const childrenOf = (id: string) =>
    rows.filter((r) => r.parentId === id);
  const result: T[] = [];
  const visit = (node: T) => {
    result.push(node);
    childrenOf(node.id)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .forEach(visit);
  };
  mains
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .forEach(visit);
  // Orphans (shouldn't happen) appended at the end
  rows.forEach((r) => {
    if (!result.includes(r)) result.push(r);
  });
  return result;
}

const AdminCategoriesPage = async () => {
  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  const categories = sortHierarchically(await getAllCategoriesAdmin());

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
              <TableHead>{t('nameFa')}</TableHead>
              <TableHead dir='ltr'>{t('nameEn')}</TableHead>
              <TableHead>{t('icon')}</TableHead>
              <TableHead>{t('products')}</TableHead>
              <TableHead className='text-end'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center text-muted-foreground'>
                  {tCommon('notFound')}
                </TableCell>
              </TableRow>
            ) : (
              categories.map((c) => {
                const Icon = getCategoryIcon(c.icon);
                const depth = c.parentName ? 1 : 0;
                return (
                  <TableRow key={c.id} className={depth > 0 ? 'bg-muted/30' : ''}>
                    <TableCell className='font-mono text-xs'>
                      {formatId(c.id)}
                    </TableCell>
                    {/* Persian name — subcategories show their Persian parent */}
                    <TableCell>
                      {depth > 0 && (
                        <span className='text-xs text-muted-foreground'>
                          {c.parentName} ›{' '}
                        </span>
                      )}
                      <span className={depth > 0 ? '' : 'font-medium'}>
                        {c.nameFa}
                      </span>
                    </TableCell>
                    {/* English name — subcategories show their English parent */}
                    <TableCell dir='ltr'>
                      {depth > 0 && (
                        <span className='text-xs text-muted-foreground'>
                          {slugToEnParent(categories, c.parentId)} ›{' '}
                        </span>
                      )}
                      <span className={depth > 0 ? '' : 'font-medium'}>
                        {c.name}
                      </span>
                    </TableCell>
                    {/* Rendered icon */}
                    <TableCell>
                      <span className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                        <Icon className='h-4 w-4' aria-hidden='true' />
                      </span>
                    </TableCell>
                    <TableCell>{c.count}</TableCell>
                    <TableCell className='flex justify-end gap-1'>
                      <Button asChild size='sm' variant='outline'>
                        <Link href={`/admin/categories/${c.id}`}>{t('edit')}</Link>
                      </Button>
                      <DeleteDialog id={c.id} action={deleteCategory} />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// English parent name lookup
function slugToEnParent(
  rows: { id: string; parentId: string | null; name: string }[],
  parentId: string | null
): string | null {
  if (!parentId) return null;
  return rows.find((r) => r.id === parentId)?.name ?? null;
}

export default AdminCategoriesPage;
