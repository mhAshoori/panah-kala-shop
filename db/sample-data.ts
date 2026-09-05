// Seed source data. Prices are in Toman (stored as Decimal strings for Prisma).
// Names carry fa/en pairs for the bilingual UI.
//
// Catalog: the user's real stationery/bag products with color/pattern
// diversity. Each product carries its options (color values with hex for
// swatches) and per-variant price/stock; seed.ts creates the option/value/
// variant rows and derives the parent price/stock from them.

import { hashSync } from 'bcrypt-ts-edge';

// Public asset base: ArvanCloud CDN/bucket when configured, local fallback.
const ASSET_BASE =
  process.env.ARVAN_PUBLIC_BASE_URL?.replace(/\/$/, '') ||
  (process.env.ARVAN_BUCKET
    ? `https://${process.env.ARVAN_BUCKET}.s3.${
        process.env.ARVAN_REGION ?? 'ir-thr-at1'
      }.arvanstorage.ir`
    : '');
const asset = (path: string) => (ASSET_BASE ? `${ASSET_BASE}/${path}` : path);

export type SampleUser = {
  name: string;
  email: string;
  password: string;
  role: string;
  mobile?: string;
};

const users: SampleUser[] = [
  {
    name: 'Admin',
    email: 'admin@example.com',
    password: hashSync('123456', 10),
    role: 'admin',
    mobile: '+989120000001',
  },
  {
    name: 'Jane',
    email: 'jane@example.com',
    password: hashSync('123456', 10),
    role: 'user',
    mobile: '+989120000002',
  },
];

export type SampleOptionValue = {
  value: string;
  valueFa: string;
  hex?: string; // color swatch; undefined for non-color options (طرح)
};

export type SampleVariant = {
  price: string; // Toman, two decimals for Prisma Decimal
  compareAtPrice?: string;
  stock: number;
  image?: string; // per-variant photo override (ArvanCloud bucket URL)
};

export type SampleOption = {
  name: string; // 'color' | 'design'
  nameFa: string; // 'رنگ' | 'طرح'
  values: SampleOptionValue[];
  variants: SampleVariant[]; // one row per value, same order
};

export type SampleProduct = {
  name: string;
  nameFa: string;
  slug: string;
  category: string; // main category name (en)
  categoryFa: string;
  subCategory: string; // subcategory name (en) — matches seed.ts tree
  description: string;
  descriptionFa: string;
  images: string[];
  brand: string;
  rating: string;
  numReviews: number;
  isFeatured: boolean;
  banner?: string | null;
  codAvailable?: boolean;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  weightG: string;
  options: SampleOption[];
};

// Shared color swatches (fa name → hex)
const C = {
  blue: { value: 'Blue', valueFa: 'آبی', hex: '#2255A4' },
  red: { value: 'Red', valueFa: 'قرمز', hex: '#D32F2F' },
  black: { value: 'Black', valueFa: 'مشکی', hex: '#000000' },
  jade: { value: 'Jade Green', valueFa: 'سبز یشمی', hex: '#00A86B' },
  purple: { value: 'Purple', valueFa: 'بنفش', hex: '#7B1FA2' },
  orange: { value: 'Orange', valueFa: 'نارنجی', hex: '#EF6C00' },
  lightYellow: { value: 'Light Yellow', valueFa: 'زرد روشن', hex: '#FBC02D' },
  skyBlue: { value: 'Sky Blue', valueFa: 'آبی آسمانی', hex: '#87CEEB' },
  green: { value: 'Green', valueFa: 'سبز', hex: '#2E7D32' },
  pink: { value: 'Pink', valueFa: 'صورتی', hex: '#F06292' },
  white: { value: 'White', valueFa: 'سفید', hex: '#FFFFFF' },
  gray: { value: 'Gray', valueFa: 'طوسی', hex: '#9E9E9E' },
  yellow: { value: 'Yellow', valueFa: 'زرد', hex: '#FDD835' },
  brown: { value: 'Brown', valueFa: 'قهوه‌ای', hex: '#795548' },
  cream: { value: 'Cream', valueFa: 'کرمی', hex: '#EFEBE0' },
};

// Non-color "طرح" values (no hex → rendered as chips, not swatches)
const design = (value: string, valueFa: string): SampleOptionValue => ({
  value,
  valueFa,
});

const products: SampleProduct[] = [
  // 1 — نوشت‌افزار > خودکار
  {
    name: 'Good Test Pen G-2501',
    nameFa: 'خودکار تست گود مدل G-2501',
    slug: 'good-test-pen-g-2501',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pens',
    description: 'Smooth-writing ballpoint pen, model G-2501. Available in three colors.',
    descriptionFa: 'خودکار گازی با نوشتاری روان، مدل G-2501. مناسب استفاده روزمره در مدرسه و محل کار.',
    images: [
      asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-1-2-abi.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-2-2-abi.webp'),
    ],
    brand: 'Good Test',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '14.20',
    widthCm: '1.50',
    heightCm: '1.50',
    weightG: '10.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.blue, C.red, C.black],
        variants: [
          { price: '49000.00', stock: 100, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-abi.webp') },
          { price: '49000.00', stock: 100, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp') },
          { price: '49000.00', stock: 100, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp') },
        ],
      },
    ],
  },
  // 2 — نوشت‌افزار > دفتر
  {
    name: 'Golberg Notebook 80 Sheets',
    nameFa: 'دفتر ۸۰ برگ مدل گلبرگ',
    slug: 'golberg-notebook-80',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Notebooks',
    description: '80-sheet notebook with the Golberg cover design.',
    descriptionFa: 'دفتر ۸۰ برگ با طرح گلبرگ روی جلد؛ کاغذ باکیفیت و صحافی محکم.',
    images: [
      asset('products/initial-products/imgs/daftar-fantesi-1.jpg'),
      asset('products/initial-products/imgs/daftar-fantesi-2.jpg'),
      asset('products/initial-products/imgs/daftar-fantesi-3.jpg'),
    ],
    brand: 'Golberg',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '20.00',
    widthCm: '14.00',
    heightCm: '0.80',
    weightG: '180.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.blue, C.jade, C.purple, C.orange],
        variants: [
          { price: '199000.00', stock: 2 },
          { price: '199000.00', stock: 2 },
          { price: '199000.00', stock: 2 },
          { price: '199000.00', stock: 2 },
        ],
      },
    ],
  },
  // 3 — نوشت‌افزار > مداد
  {
    name: 'Patterned Pencil HB',
    nameFa: 'مداد طرح دار HB',
    slug: 'patterned-pencil-hb',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pencils',
    description: 'HB pencil with three different printed patterns.',
    descriptionFa: 'مداد HB با سه طرح متفاوت روی بدنه؛ مغز تراش‌خور استاندارد.',
    images: [
      asset('products/initial-products/imgs/medad-1-1-kaleh-ghermez.jpg'),
      asset('products/initial-products/imgs/medad-1-2-kaleh-ghermez.jpg'),
      asset('products/initial-products/imgs/medad-2-1-kaleh-siah.jpg'),
      asset('products/initial-products/imgs/medad-2-2-kaleh-siah.jpg'),
      asset('products/initial-products/imgs/medad-2-3-kaleh-siah.jpg'),
      asset('products/initial-products/imgs/medad-2-4-kaleh-siah.jpg'),
      asset('products/initial-products/imgs/medad-2-5-kaleh-siah.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '17.50',
    widthCm: '0.80',
    heightCm: '0.80',
    weightG: '6.00',
    options: [
      {
        name: 'design',
        nameFa: 'طرح',
        values: [design('Design 1', 'طرح ۱'), design('Design 2', 'طرح ۲'), design('Design 3', 'طرح ۳')],
        variants: [
          { price: '49000.00', stock: 10, image: asset('products/initial-products/imgs/medad-1-1-kaleh-ghermez.jpg') },
          { price: '49000.00', stock: 10, image: asset('products/initial-products/imgs/medad-2-1-kaleh-siah.jpg') },
          { price: '49000.00', stock: 10, image: asset('products/initial-products/imgs/medad-2-3-kaleh-siah.jpg') },
        ],
      },
    ],
  },
  // 4 — نوشت‌افزار > پاک کن
  {
    name: 'Kachol Sho Eraser',
    nameFa: 'پاک کن کچل شو',
    slug: 'kachol-sho-eraser',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Erasers',
    description: 'Funny eraser, "Kachol Sho" series, three different designs.',
    descriptionFa: 'پاک کن فانی سری «کچل شو» در سه طرح متفاوت؛ پاک‌کنندگی ملایم بدون آسیب به کاغذ.',
    images: [
      asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp'),
      asset('products/initial-products/imgs/pak-kon-1-2-all-kachal-sho.webp'),
      asset('products/initial-products/imgs/pak-kon-1-3-all-kachal-sho.webp'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '4.00',
    widthCm: '2.00',
    heightCm: '0.90',
    weightG: '12.00',
    options: [
      {
        name: 'design',
        nameFa: 'طرح',
        values: [design('Design 1', 'طرح ۱'), design('Design 2', 'طرح ۲'), design('Design 3', 'طرح ۳')],
        variants: [
          { price: '99000.00', stock: 2, image: asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp') },
          { price: '99000.00', stock: 2, image: asset('products/initial-products/imgs/pak-kon-1-2-all-kachal-sho.webp') },
          { price: '99000.00', stock: 2, image: asset('products/initial-products/imgs/pak-kon-1-3-all-kachal-sho.webp') },
        ],
      },
    ],
  },
  // 5 — نوشت‌افزار > مداد نوکی
  {
    name: 'Bare Naghala Mechanical Pencil 0.7',
    nameFa: 'مداد نوکی بره ناقلا 0.7',
    slug: 'bare-naghala-pencil-07',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Mechanical Pencils',
    description: '0.7mm mechanical pencil, "Bare Naghala" series, four colors.',
    descriptionFa: 'مداد نوکی ۰٫۷ میلی‌متری سری «بره ناقلا» در چهار رنگ؛ همراه نوک محافظ.',
    images: [asset('products/initial-products/imgs/medad-noki-1-1-barreh-naghola.webp')],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '14.50',
    widthCm: '1.10',
    heightCm: '1.10',
    weightG: '12.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.blue, C.pink, C.green, C.yellow],
        variants: [
          { price: '99000.00', stock: 10 },
          { price: '99000.00', stock: 10 },
          { price: '99000.00', stock: 10 },
          { price: '99000.00', stock: 10 },
        ],
      },
    ],
  },
  // 6 — نوشت‌افزار > مداد نوکی
  {
    name: 'Mermaid Mechanical Pencil 0.5',
    nameFa: 'مداد نوکی پری دریایی 0.5',
    slug: 'mermaid-pencil-05',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Mechanical Pencils',
    description: '0.5mm mechanical pencil, "Mermaid" series, four colors.',
    descriptionFa: 'مداد نوکی ۰٫۵ میلی‌متری سری «پری دریایی» در چهار رنگ؛ مناسب نوشتاری دقیق.',
    images: [asset('products/initial-products/imgs/medad-noki-2-1-pari-daryaii.webp')],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '14.20',
    widthCm: '1.00',
    heightCm: '1.00',
    weightG: '10.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.purple, C.skyBlue, C.pink, C.white],
        variants: [
          { price: '99000.00', stock: 5 },
          { price: '99000.00', stock: 5 },
          { price: '99000.00', stock: 5 },
          { price: '99000.00', stock: 5 },
        ],
      },
    ],
  },
  // 7 — نوشت‌افزار > جامدادی
  {
    name: 'Fluffy Bunny Pencil Case',
    nameFa: 'جامدادی پشمالو مدل خرگوشی',
    slug: 'fluffy-bunny-pencilcase',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pencil Cases',
    description: 'Fluffy bunny pencil case, three colors.',
    descriptionFa: 'جامدادی پشمالو با طرح خرگوش در سه رنگ؛ جادار و نرم.',
    images: [
      asset('products/initial-products/imgs/jamedadi-all-1.jpg'),
      asset('products/initial-products/imgs/jamedadi-all-2.jpg'),
      asset('products/initial-products/imgs/jamedadi-all-3.jpg'),
      asset('products/initial-products/imgs/jamedadi-all-4.jpg'),
      asset('products/initial-products/imgs/jamedadi-all-5.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '20.00',
    widthCm: '9.00',
    heightCm: '5.00',
    weightG: '90.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.pink, C.skyBlue, C.gray],
        variants: [
          { price: '699000.00', stock: 4, image: asset('products/initial-products/imgs/jamedadi-1-1.jpg') },
          { price: '699000.00', stock: 4, image: asset('products/initial-products/imgs/jamedadi-2-1.jpg') },
          { price: '699000.00', stock: 4, image: asset('products/initial-products/imgs/jamedadi-3-1.jpg') },
        ],
      },
    ],
  },
  // 8 — نوشت‌افزار > مداد تراش
  {
    name: 'Pastel Pencil Sharpener',
    nameFa: 'مداد تراش پاستیلی',
    slug: 'pastel-sharpener',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Sharpeners',
    description: 'Pastel-colored pencil sharpener, three colors.',
    descriptionFa: 'مداد تراش پاستیلی در سه رنگ؛ تیغه فولادی با ظرف جمع‌آوری تراشه.',
    images: [asset('products/initial-products/imgs/medad-tarash-1.jpg')],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '4.50',
    widthCm: '2.50',
    heightCm: '2.00',
    weightG: '15.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.pink, C.skyBlue, C.lightYellow],
        variants: [
          { price: '39000.00', stock: 10 },
          { price: '39000.00', stock: 10 },
          { price: '39000.00', stock: 10 },
        ],
      },
    ],
  },
  // 9 — نوشت‌افزار > استیکی نوت
  {
    name: 'Fantasy Sticky Notes',
    nameFa: 'استیکی نوت طرح فانتزی چند رنگ',
    slug: 'fantasy-sticky-notes',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Sticky Notes',
    description: 'Multi-color fantasy sticky notes pad.',
    descriptionFa: 'پد استیکی نوت طرح فانتزی چند رنگ؛ چسب مناسب و جداشدن آسان از سطح.',
    images: [
      asset('products/initial-products/imgs/sticky-note-1-1.jpg'),
      asset('products/initial-products/imgs/sticky-note-1-2.jpg'),
      asset('products/initial-products/imgs/sticky-note-1-3.jpg'),
      asset('products/initial-products/imgs/sticky-note-1-4.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '7.60',
    widthCm: '7.60',
    heightCm: '0.50',
    weightG: '25.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [design('Multicolor', 'چند رنگ')],
        variants: [{ price: '299000.00', stock: 10 }],
      },
    ],
  },
  // 10 — نوشت‌افزار > دفتر
  {
    name: 'Fantasy Elastic Notebook 80 Sheets',
    nameFa: 'دفتر فانتری کش دار ۸۰ برگ',
    slug: 'fantasy-elastic-notebook-80',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Notebooks',
    description: '80-sheet notebook with elastic closure, fantasy design.',
    descriptionFa: 'دفتر ۸۰ برگ با بند کشی و طرح فانتزی؛ مناسب یادداشت‌ روزانه.',
    images: [
      asset('products/initial-products/imgs/daftar-fantesi-1.jpg'),
      asset('products/initial-products/imgs/daftar-fantesi-2.jpg'),
      asset('products/initial-products/imgs/daftar-fantesi-3.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '21.00',
    widthCm: '14.50',
    heightCm: '1.00',
    weightG: '200.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [design('Standard', 'استاندارد')],
        variants: [{ price: '299000.00', stock: 5 }],
      },
    ],
  },
  // 11 — کیف > کوله پشتی
  {
    name: 'Fluffy Bunny Backpack',
    nameFa: 'کیف کوله پشتی خرگوشی پشمالو',
    slug: 'fluffy-bunny-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description: 'Fluffy bunny backpack in light yellow and sky blue.',
    descriptionFa: 'کوله پشتی پشمالو با طرح خرگوش در دو رنگ زرد روشن و آبی آسمانی.',
    images: [
      asset('products/initial-products/imgs/kif-khargooshi-1-1.jpg'),
      asset('products/initial-products/imgs/kif-khargooshi-1-2.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '28.00',
    widthCm: '12.00',
    heightCm: '35.00',
    weightG: '450.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.lightYellow, C.skyBlue],
        variants: [
          { price: '3299000.00', stock: 2, image: asset('products/initial-products/imgs/kif-khargooshi-1-1.jpg') },
          { price: '3299000.00', stock: 2, image: asset('products/initial-products/imgs/kif-khargooshi-1-2.jpg') },
        ],
      },
    ],
  },
  // 12 — کیف > کوله پشتی
  {
    name: 'Teddy Bear Backpack',
    nameFa: 'کیف کوله پشتی خرسی',
    slug: 'teddy-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description: 'Teddy bear backpack in four colors.',
    descriptionFa: 'کوله پشتی طرح خرس در چهار رنگ؛ مناسب مدرسه و گردش.',
    images: [
      asset('products/initial-products/imgs/kif-sadeh-1-1-ghermez.jpg'),
      asset('products/initial-products/imgs/kif-sadeh-2-1-keremi.jpg'),
      asset('products/initial-products/imgs/kif-sadeh-3-1-keremi.jpg'),
      asset('products/initial-products/imgs/kif-sadeh-4-1-meshki.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '27.00',
    widthCm: '11.00',
    heightCm: '33.00',
    weightG: '420.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.red, C.cream, C.green, C.black],
        variants: [
          { price: '1999000.00', stock: 1, image: asset('products/initial-products/imgs/kif-sadeh-1-1-ghermez.jpg') },
          { price: '1999000.00', stock: 1, image: asset('products/initial-products/imgs/kif-sadeh-2-1-keremi.jpg') },
          { price: '1999000.00', stock: 1, image: asset('products/initial-products/imgs/kif-sadeh-3-1-keremi.jpg') },
          { price: '1999000.00', stock: 1, image: asset('products/initial-products/imgs/kif-sadeh-4-1-meshki.jpg') },
        ],
      },
    ],
  },
  // 13 — کیف > کوله پشتی
  {
    name: 'Fantasy Backpack',
    nameFa: 'کیف کوله پشتی طرح فانتزی',
    slug: 'fantasy-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description: 'Fantasy-print backpack in four different patterns.',
    descriptionFa: 'کوله پشتی با چاپ فانتزی در چهار طرح متفاوت؛ دوخت مقاوم و زیپ روان.',
    images: [
      asset('products/initial-products/imgs/kif-aroosak-dar-2-1.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-3-1.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-3-2.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-3-3.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-4-1.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-5-1.jpg'),
      asset('products/initial-products/imgs/kif-aroosak-dar-6-1.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '30.00',
    widthCm: '13.00',
    heightCm: '38.00',
    weightG: '480.00',
    options: [
      {
        name: 'design',
        nameFa: 'طرح',
        values: [design('Design 1', 'طرح ۱'), design('Design 2', 'طرح ۲'), design('Design 3', 'طرح ۳'), design('Design 4', 'طرح ۴')],
        variants: [
          { price: '2199000.00', stock: 1, image: asset('products/initial-products/imgs/kif-aroosak-dar-2-1.jpg') },
          { price: '2199000.00', stock: 1, image: asset('products/initial-products/imgs/kif-aroosak-dar-3-1.jpg') },
          { price: '2199000.00', stock: 1, image: asset('products/initial-products/imgs/kif-aroosak-dar-3-2.jpg') },
          { price: '2199000.00', stock: 1, image: asset('products/initial-products/imgs/kif-aroosak-dar-3-3.jpg') },
        ],
      },
    ],
  },
];

export const sampleData = { users, products };
export default sampleData;
