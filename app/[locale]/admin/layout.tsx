import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';

import AdminSidebar from '@/components/shared/admin/sidebar';
import { auth } from '@/auth';
import { withLocalePath } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
  const t = await getTranslations({ locale, namespace: 'admin' });
  return { title: `${t('dashboard')} | ${APP_NAME}` };
}

const AdminLayout = async ({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  setRequestLocale(locale);

  // Route guard: only admins may enter /admin
  const session = await auth();
  if (!session) redirect(withLocalePath('/sign-in', locale));
  if (session.user?.role !== 'admin') redirect(withLocalePath('/user/orders', locale));

  const t = await getTranslations('admin');

  return (
    <div className='flex min-h-screen flex-col md:flex-row'>
      <aside className='border-b bg-card p-4 md:w-64 md:border-e md:border-b-0'>
        <p className='mb-4 hidden px-3 text-sm font-bold md:block'>
          {t('dashboard')}
        </p>
        <AdminSidebar />
      </aside>
      <main className='flex-1 p-4 md:p-6'>{children}</main>
    </div>
  );
};

export default AdminLayout;
