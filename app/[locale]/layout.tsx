import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Vazirmatn } from 'next/font/google';
import { Toaster } from 'sonner';

import { routing } from '@/i18n/routing';
import { dir } from '@/i18n/config';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
});

export const metadata: Metadata = {
  title: 'فروشگاه پناه کالا | Panah Kala Shop',
  description: 'فروشگاه اینترنتی پناه کالا — خرید آنلاین با بهترین قیمت و کیفیت',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  return (
    <html lang={locale} dir={dir(locale as never)} suppressHydrationWarning>
      <body className={`${inter.variable} ${vazirmatn.variable} font-sans`}>
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster
              richColors
              position={locale === 'fa' ? 'top-left' : 'top-right'}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
