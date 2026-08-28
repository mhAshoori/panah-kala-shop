import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import UpdateUserForm from './update-user-form';
import { getUserById } from '@/lib/actions/user.actions';

const AdminUserEditPage = async (props: {
  params: Promise<{ id: string }>;
}) => {
  const { id } = await props.params;

  const t = await getTranslations('admin');

  const user = await getUserById(id).catch(() => null);

  if (!user) return notFound();

  return (
    <div className='max-w-5xl space-y-6'>
      <h1 className='h2-bold'>{t('editUser')}</h1>
      <UpdateUserForm user={{ id: user.id, name: user.name, role: user.role }} />
    </div>
  );
};

export default AdminUserEditPage;
