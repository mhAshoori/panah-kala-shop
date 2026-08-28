import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Inter } from 'next/font/google';
import { Vazirmatn } from 'next/font/google';
import { Toaster } from 'sonner';

import { routing } from '@/i18n/routing';
import { dir } from '@/i18n/config';
import { ThemeProvider } from '@/components/theme-provider';
import {
  buildAlternates,
  getSiteUrl,
  organizationJsonLd,
  websiteJsonLd,
} from '@/lib/seo';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const vazirmatn = Vazirmatn({
  subsets: ['arabic'],
  variable: '--font-vazirmatn',
});

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await props.params;
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
    alternates: buildAlternates('/'),
    openGraph: {
      type: 'website',
      siteName: t('title'),
      title: t('title'),
      description: t('description'),
      locale: locale === 'fa' ? 'fa_IR' : 'en_US',
      alternateLocale: locale === 'fa' ? 'en_US' : 'fa_IR',
      url: `${siteUrl}/${locale}`,
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
