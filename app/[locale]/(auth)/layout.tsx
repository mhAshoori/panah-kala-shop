import { setRequestLocale } from 'next-intl/server';

export default function AuthLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = params as unknown as { locale: string };
  setRequestLocale(locale);

  return <div className='flex-center min-h-screen w-full py-10'>{children}</div>;
}