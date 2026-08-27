import { setRequestLocale } from 'next-intl/server';
import MainNav from './main-nav';

export default async function UserLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className='flex flex-col gap-6 py-4'>
      <MainNav />
      {children}
    </div>
  );
}