import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { dir } from '@/i18n/config';
import { getSiteFont, getSiteLocale } from '@/lib/site-settings';
import { ThemeProvider } from '@/components/theme-provider';
import TopProgress from '@/components/shared/top-progress';
import {
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import { shabnamFont, vazirmatnFont } from './fonts';
import './globals.css';

// Self-hosted Latin font
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSiteLocale();
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const siteUrl = getSiteUrl();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t('title'),
      template: `%s | ${t('title')}`,
    },
    description: t('description'),
    applicationName: t('title'),
    formatDetection: { telephone: false, address: false, email: false },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: t('title'),
      title: t('title'),
      description: t('description'),
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      url: siteUrl,
    },
    twitter: {
      card: 'summary',
      title: t('title'),
      description: t('description'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large' },
    },
    other: {
      'geo.region': 'IR',
      'geo.placename': 'Iran',
    },
  };
}

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getSiteLocale();
  const font = await getSiteFont();

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      data-font={font}
      suppressHydrationWarning
      className={`${inter.variable} ${shabnamFont.variable} ${vazirmatnFont.variable}`}
    >
      <body className='font-sans'>
        <NextIntlClientProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <TopProgress />
            </Suspense>
            {children}
            <Toaster
              richColors
              position={locale === 'fa' ? 'top-left' : 'top-right'}
            />
          </ThemeProvider>
        </NextIntlClientProvider>
        {/* Structured data for the Persian market (Google / Yandex / Bing) */}
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type='application/ld+json'
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd(locale)) }}
        />
      </body>
    </html>
  );
}
