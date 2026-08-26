import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/shared/header';
import Footer from '@/components/footer';

export default function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = params as unknown as { locale: string };
  setRequestLocale(locale);

  return (
    <div className="flex h-screen flex-col">
      <Header />
      <main className="flex-1 wrapper">{children}</main>
      <Footer />
    </div>
  );
}
