import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import { auth } from '@/auth';
import { getUserById } from '@/lib/actions/user.actions';
import { withLocalePath } from '@/lib/utils';
import ProfileForm from './profile-form';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'account' });
  return { title: t('profile') };
}

const ProfilePage = async (props: {
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await props.params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user?.id) {
    redirect(withLocalePath('/sign-in', locale));
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