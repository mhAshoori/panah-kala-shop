import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { auth } from '@/auth';
import { getUserById } from '@/lib/actions/user.actions';
import ProfileForm from './profile-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('account');
  return { title: t('profile') };
}

const ProfilePage = async () => {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/sign-in');
  }

  const user = await getUserById(session.user.id);
  const t = await getTranslations('account');

  return (
    <div className='max-w-md mx-auto space-y-4'>
      <h2 className='h2-bold'>{t('profile')}</h2>
      <ProfileForm name={user.name} email={user.email} />
    </div>
  );
};

export default ProfilePage;
