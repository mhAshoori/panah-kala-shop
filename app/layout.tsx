import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Toaster } from 'sonner';

import { dir } from '@/i18n/config';
import { getSiteLocale } from '@/lib/site-settings';
import { ThemeProvider } from '@/components/theme-provider';
import TopProgress from '@/components/shared/top-progress';
import {
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import './globals.css';

// Self-hosted Latin font
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

// Self-hosted Persian font (Shabnam) — primary typeface
const shabnam = localFont({
  src: [
    { path: './fonts/shabnam/Shabnam-Thin.ttf', weight: '100', style: 'normal' },
    { path: './fonts/shabnam/Shabnam-Light.ttf', weight: '300', style: 'normal' },
    { path: './fonts/shabnam/Shabnam.ttf', weight: '400', style: 'normal' },
    { path: './fonts/shabnam/Shabnam-Medium.ttf', weight: '500', style: 'normal' },
    { path: './fonts/shabnam/Shabnam-Bold.ttf', weight: '700', style: 'normal' },
  ],
  variable: '--font-shabnam',
  display: 'swap',
});

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

  return (
    <html lang={locale} dir={dir(locale)} suppressHydrationWarning>
      <body className={`${inter.variable} ${shabnam.variable} font-sans`}>
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
