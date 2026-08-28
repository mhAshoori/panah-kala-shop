import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import Pagination from '@/components/shared/pagination';
import AdminSearch from '@/components/shared/admin/search';
import DeleteDialog from '@/components/shared/delete-dialog';
import { Button } from '@/components/ui/button';
import { getAllUsers, deleteUser } from '@/lib/actions/user.actions';
import { formatDateTime, formatId } from '@/lib/utils';
import { Link } from '@/i18n/navigation';

const AdminUsersPage = async (props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page: string; q?: string }>;
}) => {
  const { locale } = await props.params;
  const { page, q } = await props.searchParams;
  setRequestLocale(locale);

  const t = await getTranslations('admin');
  const tCommon = await getTranslations('common');

  const users = await getAllUsers({
    page: Number(page) || 1,
    query: q,
  });

  return (
    <div className='space-y-4'>
      <h1 className='h2-bold'>{t('users')}</h1>
      <AdminSearch />

      <div className='overflow-x-auto rounded-lg border'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('id')}</TableHead>
              <TableHead>{t('name')}</TableHead>
              <TableHead>{tCommon('email')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{t('createdAt')}</TableHead>
              <TableHead className='text-end'>{t('actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className='text-center text-muted-foreground'>
                  {tCommon('notFound')}
                </TableCell>
              </TableRow>
            ) : (
              users.data.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className='font-mono text-xs'>
                    {formatId(user.id)}
                  </TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatDateTime(user.createdAt).dateOnly}
                  </TableCell>
                  <TableCell className='flex justify-end gap-1'>
                    <Button asChild size='sm' variant='outline'>
                      <Link href={`/admin/users/${user.id}`}>{t('edit')}</Link>
                    </Button>
                    <DeleteDialog id={user.id} action={deleteUser} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Pagination page={Number(page) || 1} totalPages={users.totalPages} query={q} />
    </div>
  );
};

export default AdminUsersPage;
