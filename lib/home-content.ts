import { cache } from 'react';

import { prisma } from '@/db/prisma';

export type LocalizedText = { fa: string; en: string };

export type HomeIconBoxItem = {
  icon: string;
  title: LocalizedText;
  desc: LocalizedText;
};

export type HomeBlocks = {
  hero: {
    enabled: boolean;
    image: string;
    badge: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    cta: LocalizedText;
    link: string;
  };
  iconBoxes: {
    enabled: boolean;
    items: HomeIconBoxItem[];
  };
  deal: {
    enabled: boolean;
    productId: string;
    badge: LocalizedText;
  };
  stats: {
    enabled: boolean;
    labels: {
      products: LocalizedText;
      orders: LocalizedText;
      customers: LocalizedText;
    };
  };
  categoryGrid: {
    enabled: boolean;
    title: LocalizedText;
  };
  latest: {
    enabled: boolean;
    title: LocalizedText;
    limit: number;
  };
  featured: {
    enabled: boolean;
    title: LocalizedText;
    limit: number;
  };
  brands: {
    enabled: boolean;
    title: LocalizedText;
  };
  support: {
    enabled: boolean;
    title: LocalizedText;
    desc: LocalizedText;
    cta: LocalizedText;
    link: string;
  };
};

export const HOME_BLOCK_KEYS = [
  'hero',
  'iconBoxes',
  'deal',
  'stats',
  'categoryGrid',
  'latest',
  'featured',
  'brands',
  'support',
] as const;

export type HomeBlockKey = (typeof HOME_BLOCK_KEYS)[number];

/** Non-homepage blocks stored in the same table (contact page, SEO meta). */
export const EXTRA_BLOCK_KEYS = ['contact', 'meta'] as const;
export type ExtraBlockKey = (typeof EXTRA_BLOCK_KEYS)[number];

export type ContactContent = {
  phone: string;
  email: string;
  address: LocalizedText;
  hours: LocalizedText;
  desc: LocalizedText;
};

export type SiteMeta = {
  title: LocalizedText;
  description: LocalizedText;
  keywords: LocalizedText;
};

export const DEFAULT_CONTACT: ContactContent = {
  phone: '+98 21 0000 0000',
  email: 'support@panahkala.ir',
  address: {
    fa: 'تهران، ایران',
    en: 'Tehran, Iran',
  },
  hours: {
    fa: 'شنبه تا پنجشنبه، ۹ تا ۱۸',
    en: 'Saturday to Thursday, 9–18',
  },
  desc: {
    fa: 'سوالی دارید؟ تیم پشتیبانی پناه کالا آماده پاسخ‌گویی است.',
    en: 'Questions? The Panah Kala support team is ready to help.',
  },
};

export const DEFAULT_SITE_META: SiteMeta = {
  title: { fa: 'فروشگاه پناه کالا', en: 'Panah Kala Shop' },
  description: {
    fa: 'فروشگاه اینترنتی پناه کالا — خرید آنلاین با بهترین قیمت و کیفیت',
    en: 'Panah Kala online store — shop with the best prices and quality',
  },
  keywords: {
    fa: 'فروشگاه اینترنتی، خرید آنلاین، موبایل، لپ تاپ، لوازم جانبی، پناه کالا',
    en: 'online shop, iran, mobile, laptop, accessories, panah kala',
  },
};

/** Defaults mirror the current i18n strings so the homepage works with an
 *  empty HomeBlock table. Admins override any part of any block. */
export const DEFAULT_HOME_BLOCKS: HomeBlocks = {
  hero: {
    enabled: true,
    image: '/images/banner-2.webp',
    badge: { fa: 'پیشنهاد ویژه', en: 'Special Offer' },
    title: {
      fa: 'هرچه لازم دارید، سریع درِ خانه شما',
      en: 'Everything you need, delivered fast',
    },
    subtitle: {
      fa: 'موبایل، لپ‌تاپ، لوازم جانبی و بیشتر — با بهترین قیمت و ضمانت اصالت کالا',
      en: 'Mobile phones, laptops, accessories and more — with the best prices and genuine warranty',
    },
    cta: { fa: 'خرید کنید', en: 'Shop Now' },
    link: '/search',
  },
  iconBoxes: {
    enabled: true,
    items: [
      {
        icon: 'truck',
        title: { fa: 'ارسال رایگان', en: 'Free Shipping' },
        desc: {
          fa: 'برای سفارش‌های بالای ۵۰۰ هزار تومان',
          en: 'On orders over 500,000 Toman',
        },
      },
      {
        icon: 'shield',
        title: { fa: 'پرداخت امن', en: 'Secure Payment' },
        desc: {
          fa: 'درگاه پرداخت مطمئن زرین‌پال',
          en: 'Trusted ZarinPal gateway',
        },
      },
      {
        icon: 'headset',
        title: { fa: 'پشتیبانی', en: 'Customer Support' },
        desc: {
          fa: 'پاسخگویی در تمام روزهای هفته',
          en: 'Here to help every day',
        },
      },
      {
        icon: 'undo',
        title: { fa: 'ضمانت بازگشت وجه', en: 'Money-Back Guarantee' },
        desc: {
          fa: 'تا ۷ روز پس از دریافت کالا',
          en: 'Within 7 days of delivery',
        },
      },
    ],
  },
  deal: {
    enabled: true,
    productId: '',
    badge: { fa: 'پیشنهاد ویژه', en: 'Special Offer' },
  },
  stats: {
    enabled: true,
    labels: {
      products: { fa: 'کالای فعال', en: 'Products in stock' },
      orders: { fa: 'سفارش ثبت‌شده', en: 'Orders delivered' },
      customers: { fa: 'مشتری راضی', en: 'Happy customers' },
    },
  },
  categoryGrid: {
    enabled: true,
    title: { fa: 'خرید بر اساس دسته‌بندی', en: 'Shop by Category' },
  },
  latest: {
    enabled: true,
    title: { fa: 'جدیدترین محصولات', en: 'Latest Products' },
    limit: 4,
  },
  featured: {
    enabled: true,
    title: { fa: 'محصولات ویژه', en: 'Featured Products' },
    limit: 4,
  },
  brands: {
    enabled: true,
    title: { fa: 'برندهای منتخب', en: 'Featured Brands' },
  },
  support: {
    enabled: true,
    title: { fa: 'هر روز کنار شما هستیم', en: "We're here for you, every day" },
    desc: {
      fa: 'سوالی درباره سفارش، ارسال یا مرجوعی دارید؟ تیم پشتیبانی ما شبانه‌روز پاسخ‌گو است — سریع، فارسی و دقیق.',
      en: 'Questions about your order, shipping or returns? Our support team answers around the clock — fast, in Persian, and to the point.',
    },
    cta: { fa: 'تماس با پشتیبانی', en: 'Contact Support' },
    link: '/user/orders',
  },
};

// Shallow-merge stored block data over the defaults (top-level keys)
function mergeBlock<T>(fallback: T, stored: unknown): T {
  if (typeof stored !== 'object' || stored === null) return fallback;
  return { ...fallback, ...(stored as object) } as T;
}

/** Homepage content for rendering — admin overrides merged onto defaults. */
export const getHomeConfig = cache(async (): Promise<HomeBlocks> => {
  const config = structuredClone(DEFAULT_HOME_BLOCKS);

  try {
    const rows = await prisma.homeBlock.findMany();
    for (const row of rows) {
      if (!(HOME_BLOCK_KEYS as readonly string[]).includes(row.key)) continue;
      const key = row.key as HomeBlockKey;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const merged: any = mergeBlock(config[key], row.data);
      merged.enabled = row.enabled;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      config[key] = merged as any;
    }
  } catch {
    // DB unavailable — defaults are used
  }

  return config;
});

/** Contact-page content — admin-editable, defaults provided. */
export const getContactContent = cache(async (): Promise<ContactContent> => {
  try {
    const row = await prisma.homeBlock.findUnique({ where: { key: 'contact' } });
    if (row) {
      return mergeBlock(DEFAULT_CONTACT, row.data) as ContactContent;
    }
  } catch {
    // DB unavailable — defaults
  }
  return DEFAULT_CONTACT;
});

/** Site-wide SEO metadata — admin-editable, defaults provided. */
export const getSiteMeta = cache(async (): Promise<SiteMeta> => {
  try {
    const row = await prisma.homeBlock.findUnique({ where: { key: 'meta' } });
    if (row) {
      return mergeBlock(DEFAULT_SITE_META, row.data) as SiteMeta;
    }
  } catch {
    // DB unavailable — defaults
  }
  return DEFAULT_SITE_META;
});
