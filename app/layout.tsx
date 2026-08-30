import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { Inter } from 'next/font/google';
import AppToaster from '@/components/shared/app-toaster';

import { dir } from '@/i18n/config';
import { getSiteFont, getSiteLocale, getSiteTheme } from '@/lib/site-settings';
import { getSiteMeta } from '@/lib/home-content';
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
  const meta = await getSiteMeta();
  const siteUrl = getSiteUrl();

  // Admin-editable SEO content with fallbacks between languages
  const title =
    (locale === 'fa' ? meta.title.fa || meta.title.en : meta.title.en || meta.title.fa) ||
    'فروشگاه پناه کالا';
  const description =
    (locale === 'fa'
      ? meta.description.fa || meta.description.en
      : meta.description.en || meta.description.fa) || '';
  const keywords =
    (locale === 'fa'
      ? meta.keywords.fa || meta.keywords.en
      : meta.keywords.en || meta.keywords.fa) || '';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description,
    keywords: keywords
      .split(/[،,]/)
      .map((k) => k.trim())
      .filter(Boolean),
    applicationName: title,
    formatDetection: { telephone: false, address: false, email: false },
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: title,
      title,
      description,
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      url: siteUrl,
      images: [{ url: '/images/banner-2.webp', width: 1920, height: 680, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/images/banner-2.webp'],
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

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f7fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1826' },
  ],
} as const;

export default async function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getSiteLocale();
  const font = await getSiteFont();
  const theme = await getSiteTheme();

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
            defaultTheme={theme}
            enableSystem
            disableTransitionOnChange
          >
            <Suspense fallback={null}>
              <TopProgress />
            </Suspense>
            {children}
            <AppToaster rtl={locale === 'fa'} />
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
