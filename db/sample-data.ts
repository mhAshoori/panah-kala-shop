// Seed source data. Prices are whole Toman numbers (Int columns).
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
    email: 'admin@panahkalashop.com',
    password: hashSync('123456', 10),
    role: 'admin',
    mobile: '+989120000001',
  },
  {
    name: 'Jane',
    email: 'user@panahkalashop.com',
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
  price: number; // Toman, whole numbers (Int column)
  compareAtPrice?: number;
  stock: number;
  image?: string; // per-variant photo override (ArvanCloud bucket URL)
};

// Explicit variant combos for multi-option products instead of the full
// cartesian product. options = value index per option, same order as
// product.options. A missing combination simply isn't sold.
export type SampleCombo = {
  options: number[];
  price: number;
  compareAtPrice?: number;
  stock: number;
  image?: string;
};

export type SampleOption = {
  name: string; // 'color' | 'design'
  nameFa: string; // 'رنگ' | 'طرح'
  values: SampleOptionValue[];
  variants?: SampleVariant[]; // one row per value, same order (single-option use)
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
  combos?: SampleCombo[]; // multi-option products: explicit variant combos
};

// Shared color swatches (fa name → hex)
const C = {
  blue: { value: 'Blue', valueFa: 'آبی', hex: '#2255A4' },
  red: { value: 'Red', valueFa: 'قرمز', hex: '#D32F2F' },
  jigari: { value: 'jigari', valueFa: 'جیگری', hex: '#6a0f0f' },
  black: { value: 'Black', valueFa: 'مشکی', hex: '#000000' },
  jade: { value: 'Jade Green', valueFa: 'سبز یشمی', hex: '#07bb2b' },
  purple: { value: 'Purple', valueFa: 'بنفش', hex: '#7B1FA2' },
  orange: { value: 'Orange', valueFa: 'نارنجی', hex: '#EF6C00' },
  lightYellow: { value: 'Light Yellow', valueFa: 'زرد روشن', hex: '#FBC02D' },
  skyBlue: { value: 'Sky Blue', valueFa: 'آبی آسمانی', hex: '#87CEEB' },
  green: { value: 'Green', valueFa: 'سبز', hex: '#0a6135' },
  pink: { value: 'Pink', valueFa: 'صورتی', hex: '#dc8ba6' },
  white: { value: 'White', valueFa: 'سفید', hex: '#FFFFFF' },
  gray: { value: 'Gray', valueFa: 'طوسی', hex: '#9E9E9E' },
  yellow: { value: 'Yellow', valueFa: 'زرد', hex: '#FDD835' },
  lightBrown: { value: 'Light Brown', valueFa: 'قهوه‌ای', hex: '#8c7f7b' },
  cream: { value: 'Cream', valueFa: 'کرمی', hex: '#EFEBE0' },
  multicolor: { value: 'Multicolor', valueFa: 'چند رنگ', hex: '#B0BEC5' },
};

// Non-color "طرح" values (no hex → rendered as chips, not swatches)
const design = (value: string, valueFa: string): SampleOptionValue => ({
  value,
  valueFa,
});
// Prices are the SELLING price (Product.price) and compareAtPrice is the
// original. The admin form derives compareAtPrice from a base price plus a
// percentage, so these pairs are what that derivation produces: 9% off
// 96,000 gives 96,000 -> 87,361, and so on. Reversed pairs would be invalid —
// compareAtPrice must be strictly greater than price.
const products: SampleProduct[] = [
  // 1 — نوشت‌افزار > خودکار
  {
    name: 'Test Good Pen G-2501',
    nameFa: 'خودکار تست گود مدل G-2501',
    slug: 'test-good-pen-g-2501',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pens',
    description: 'Smooth-writing ballpoint pen, model G-2501, in three colors across five designs.',
    descriptionFa: 'خودکار گازی با نوشتاری روان، مدل G-2501، در سه رنگ و پنج طرح. مناسب استفاده روزمره در مدرسه و محل کار.',
    images: [
      asset('products/initial-products/imgs/khodkar-testgood-1-2-abi.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-2-2-abi.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp'),
      asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp'),
    ],
    brand: 'Test Good',
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
        values: [C.red, C.skyBlue, C.lightBrown, C.black],
        variants: [],
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Design 1', 'طرح آدمک'),
          design('Design 2', 'طرح کودک'),
          design('Design 3', 'طرح گربه'),
          design('Design 4', 'طرح ایموجی'),
          design('Design 5', 'طرح ستاره'),
        ],
        variants: [],
      },
    ],
    // 3 colors × 5 designs = 15 combinations, all at the same price, so the
    // product-level discount is honest and every row agrees on the ratio.
    combos: [
      { options: [0, 0], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp') },
      { options: [0, 1], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-1-2-abi.webp') },
      { options: [0, 2], price: 96000, compareAtPrice: 105600, stock: 12, image: asset('products/initial-products/imgs/khodkar-testgood-2-2-abi.webp') },
      { options: [0, 3], price: 96000, compareAtPrice: 105600, stock: 16, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp') },
      { options: [0, 4], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp') },
      { options: [1, 0], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-abi.webp') },
      { options: [1, 1], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-2-2-abi.webp') },
      { options: [1, 2], price: 96000, compareAtPrice: 105600, stock: 12, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-abi.webp') },
      { options: [1, 3], price: 96000, compareAtPrice: 105600, stock: 16, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp') },
      { options: [1, 4], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-abi.webp') },
      { options: [2, 0], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-ghermez.webp') },
      { options: [2, 1], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-1-2-abi.webp') },
      { options: [2, 2], price: 96000, compareAtPrice: 105600, stock: 12, image: asset('products/initial-products/imgs/khodkar-testgood-2-2-abi.webp') },
      { options: [2, 3], price: 96000, compareAtPrice: 105600, stock: 16, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-meshki.webp') },
      { options: [2, 4], price: 96000, compareAtPrice: 105600, stock: 15, image: asset('products/initial-products/imgs/khodkar-testgood-1-1-abi.webp') },
    ],
  },
  // 2 — نوشت‌افزار > دفتر
  {
    name: 'Golbarg Notebook 80 Sheets',
    nameFa: 'دفتر ۸۰ برگ مدل گلبرگ',
    slug: 'golbarg-notebook-80',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Notebooks',
    description: '80-sheet notebook with the Golbarg cover design, in five colors.',
    descriptionFa: 'دفتر ۸۰ برگ با طرح گلبرگ روی جلد، در پنج رنگ؛ کاغذ باکیفیت و صحافی محکم.',
    images: [
      asset('products/initial-products/seed-data/daftar-golbarg-abi-nafti-1.jpg'),
      asset('products/initial-products/seed-data/daftar-golbarg-yashmi-1.jpg'),
      asset('products/initial-products/seed-data/daftar-golbarg-banafsh-1.jpg'),
      asset('products/initial-products/seed-data/daftar-golbarg-narenji-1.jpg'),
      asset('products/initial-products/seed-data/daftar-golbarg-abi-1.jpg'),
      asset('products/initial-products/seed-data/daftar-golbarg-sabz-1.jpg'),
    ],
    brand: 'Golbarg',
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
        values: [C.lightBrown, C.yellow, C.white, C.purple, C.skyBlue],
        variants: [
          { price: 199000, compareAtPrice: 218900, stock: 5 },
          { price: 199000, compareAtPrice: 218900, stock: 5 },
          { price: 199000, compareAtPrice: 218900, stock: 5 },
          { price: 199000, compareAtPrice: 218900, stock: 5 },
          { price: 199000, compareAtPrice: 218900, stock: 5 },
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
    description: 'HB pencil in seven colors, one design per color.',
    descriptionFa: 'مداد HB در هفت رنگ، هر رنگ با طرح مخصوص خود؛ مغز تراش‌خور استاندارد.',
    images: [
      asset('products/initial-products/seed-data/medad-hb-1.jpg'),
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
        name: 'color',
        nameFa: 'رنگ',
        values: [
          C.red,
          C.skyBlue,
          C.pink,
          C.lightYellow,
          C.green,
          C.gray,
          C.purple,
        ],
        variants: [
          { price: 139000, compareAtPrice: 152900, stock: 2 },
          { price: 139000, compareAtPrice: 152900, stock: 2 },
          { price: 139000, compareAtPrice: 152900, stock: 3 },
          { price: 139000, compareAtPrice: 152900, stock: 2 },
          { price: 139000, compareAtPrice: 152900, stock: 2 },
          { price: 139000, compareAtPrice: 152900, stock: 2 },
          { price: 139000, compareAtPrice: 152900, stock: 2 },
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
    description: 'Funny eraser, "Kachol Sho" series, in three colors.',
    descriptionFa: 'پاک‌کن فانی سری «کچل شو» در سه رنگ؛ پاک‌کنندگی ملایم بدون آسیب به کاغذ.',
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
        name: 'color',
        nameFa: 'رنگ',
        values: [C.yellow, C.skyBlue, C.pink],
        variants: [
          { price: 290000, compareAtPrice: 318900, stock: 4, image: asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp') },
          { price: 290000, compareAtPrice: 318900, stock: 3, image: asset('products/initial-products/imgs/pak-kon-1-2-all-kachal-sho.webp') },
          { price: 290000, compareAtPrice: 318900, stock: 6, image: asset('products/initial-products/imgs/pak-kon-1-3-all-kachal-sho.webp') },
        ],
      },
    ],
  },
  // 5 — نوشت‌افزار > مداد نوکی
  {
    name: 'Bare Naghala Mechanical Pencil 0.7',
    nameFa: 'مداد نوکی 0.7 بره ناقلا',
    slug: 'bare-naghala-pencil-07',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Mechanical Pencils',
    description: '0.7mm mechanical pencil, "Bare Naghala" series, six colors.',
    descriptionFa: 'مداد نوکی ۰٫۷ میلی‌متری سری «بره ناقلا» در شش رنگ؛ همراه نوک محافظ.',
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
        values: [C.gray, C.purple, C.skyBlue, C.blue, C.green, C.black],
        variants: [
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
          { price: 2609130, compareAtPrice: 2999000, stock: 1 },
        ],
      },
    ],
  },
  // 6 — کیف > کوله پشتی
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
      asset('products/initial-products/seed-data/kif-pashmaloo-keremi-1.jpg'),
      asset('products/initial-products/seed-data/kif-pashmaloo-keremi-2.jpg'),
      asset('products/initial-products/seed-data/kif-pashmaloo-keremi-3.jpg'),

      asset('products/initial-products/seed-data/kif-pashmaloo-abi-roushan-1.jpg'),
      asset('products/initial-products/seed-data/kif-pashmaloo-abi-roushan-2.jpg'),
      asset('products/initial-products/seed-data/kif-pashmaloo-abi-roushan-3.jpg'),

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
        values: [C.skyBlue, C.lightYellow],
        variants: [
          { price: 2097900, compareAtPrice: 2590000, stock: 2, image: asset('products/initial-products/seed-data/kif-pashmaloo-abi-roushan-1.jpg') },
          { price: 2097900, compareAtPrice: 2590000, stock: 2, image: asset('products/initial-products/seed-data/kif-pashmaloo-keremi-1.jpg') },
        ],
      },
    ],
  },
  // 7 — کیف > کوله پشتی
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
      asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-soorati-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-soorati-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-jigari-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-jigari-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-jigari-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-meshki-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-meshki-3.jpg'),

      asset('products/initial-products/imgs/kif-sadeh-1-1-ghermez.jpg'),
      asset('products/initial-products/imgs/kif-sadeh-2-1-keremi.jpg'),
      asset('products/initial-products/imgs/kif-sadeh-2-1-keremi.jpg'),
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
        values: [C.lightBrown, C.black, C.gray, C.pink],
        variants: [
          { price: 1910090, compareAtPrice: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg') },
          { price: 1910090, compareAtPrice: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg') },
          { price: 1910090, compareAtPrice: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-keremi-2.jpg') },
          { price: 1910090, compareAtPrice: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg') },
        ],
      },
    ],
  },
  // 8 — نوشت‌افزار > پاک کن
  {
    name: 'Eraser 3 Designs Multicolor',
    nameFa: 'پاک‌کن چهار طرح رنگی',
    slug: 'eraser-3-designs-multicolor',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Erasers',
    description: 'Multicolor eraser available in four printed designs.',
    descriptionFa: 'پاک‌کن چند رنگ با چهار طرح چاپی روی بدنه.',
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
        name: 'color',
        nameFa: 'رنگ',
        values: [C.multicolor],
        variants: [], // single color; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Design 1', 'طرح ۱'),
          design('Design 2', 'طرح ۲'),
          design('Design 3', 'طرح ۳'),
          design('Design 4', 'طرح ۴'),
        ],
      },
    ],
    combos: [
      { options: [0, 0], price: 19900, compareAtPrice: 21900, stock: 36, image: asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp') },
      { options: [0, 1], price: 19900, compareAtPrice: 21900, stock: 36, image: asset('products/initial-products/imgs/pak-kon-1-2-all-kachal-sho.webp') },
      { options: [0, 2], price: 19900, compareAtPrice: 21900, stock: 36, image: asset('products/initial-products/imgs/pak-kon-1-3-all-kachal-sho.webp') },
      { options: [0, 3], price: 19900, compareAtPrice: 21900, stock: 36, image: asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp') },
    ],
  },
  // 9 — نوشت‌افزار > مداد تراش
  {
    name: 'Pastel Pencil Sharpener',
    nameFa: 'مداد تراش پاستیلی',
    slug: 'pastel-sharpener',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Sharpeners',
    description: 'Pastel-colored pencil sharpener in five designs.',
    descriptionFa: 'مداد تراش پاستیلی در پنج طرح؛ تیغه فولادی با ظرف جمع‌آوری تراشه.',
    images: [
      asset('products/initial-products/seed-data/medad-tarash-1.jpg'),
      asset('products/initial-products/imgs/medad-tarash-1.jpg'),
    ],
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
        values: [C.multicolor],
        variants: [], // single color; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Adhesive', 'چسبدار'),
          design('Full Size', 'درشت'),
          design('Slim', 'باریک'),
          design('Two Hole', 'سوراخ‌دار'),
          design('Pencil Box', 'مدادی'),
        ],
      },
    ],
    combos: [
      { options: [0, 0], price: 10900, compareAtPrice: 11900, stock: 19 },
      { options: [0, 1], price: 10900, compareAtPrice: 11900, stock: 19 },
      { options: [0, 2], price: 10900, compareAtPrice: 11900, stock: 19 },
      { options: [0, 3], price: 10900, compareAtPrice: 11900, stock: 31 },
      { options: [0, 4], price: 10900, compareAtPrice: 11900, stock: 19 },
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
    description: '80-sheet notebook with elastic closure, in three fantasy designs.',
    descriptionFa: 'دفتر ۸۰ برگ با بند کشی در سه طرح فانتزی؛ مناسب یادداشت روزانه.',
    images: [
      asset('products/initial-products/seed-data/daftar-fantasy-1.jpg'),
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
        values: [C.multicolor],
        variants: [], // single color; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Black with Flowers', 'مشکی گل‌دار'),
          design('Red Plain', 'قرمز ساده'),
          design('White Plain', 'سفید ساده'),
        ],
      },
    ],
    combos: [
      { options: [0, 0], price: 159000, compareAtPrice: 174900, stock: 3 },
      { options: [0, 1], price: 159000, compareAtPrice: 174900, stock: 2 },
      { options: [0, 2], price: 159000, compareAtPrice: 174900, stock: 4 },
    ],
  },
  // 11 — کیف > کوله پشتی
  // قهوه‌ای ۴ طرح، زرد ۱ طرح — the yellow designs are not sold, which is what
  // makes the product-level discount honest: only the four brown combinations
  // exist, and all four carry the same ratio.
  {
    name: 'Fantasy Backpack',
    nameFa: 'کیف کوله پشتی طرح فانتزی',
    slug: 'fantasy-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description:
      'Fantasy-print backpack in two colors: light brown (4 designs) and yellow (1 design).',
    descriptionFa:
      'کوله پشتی با چاپ فانتزی در دو رنگ: قهوه‌ای (۴ طرح) و زرد (۱ طرح). دوخت مقاوم و زیپ روان.',
    images: [
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-3.jpg'),

      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-3.jpg'),

      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-3.jpg'),

      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-3.jpg'),

      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-5-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-5-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-5-3.jpg'),

      asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-3.jpg'),

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
        name: 'color',
        nameFa: 'رنگ',
        values: [C.lightBrown, C.yellow],
        variants: [], // combos below carry the variants (multi-option sparse)
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Design 1', 'طرح ۱'),
          design('Design 2', 'طرح ۲'),
          design('Design 3', 'طرح ۳'),
          design('Design 4', 'طرح ۴'),
          design('Design 5', 'طرح ۵'),
        ],
        variants: [],
      },
    ],
    combos: [
      { options: [0, 0], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-1.jpg') },
      { options: [0, 1], price: 96000, compareAtPrice: 105600, stock: 9, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-1.jpg') },
      { options: [0, 2], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-1.jpg') },
      { options: [0, 3], price: 96000, compareAtPrice: 105600, stock: 7, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-1.jpg') },
      { options: [1, 0], price: 96000, compareAtPrice: 105600, stock: 8, image: asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-1.jpg') },
    ],
  },
  // 12 — کیف > کوله پشتی
  {
    name: 'Sareh Bag',
    nameFa: 'کوله پشتی طرح ساحل و فیوز',
    slug: 'sareh-bag',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description: 'Backpack printed with beach and fuse designs, in five colors.',
    descriptionFa: 'کوله پشتی با چاپ طرح ساحل و فیوز، در پنج رنگ. جادار با جیب جانبی.',
    images: [
      asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-jigari-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-2.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '29.00',
    widthCm: '12.00',
    heightCm: '36.00',
    weightG: '460.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.pink, C.gray, C.black, C.skyBlue, C.lightBrown],
        variants: [
          { price: 3399000, compareAtPrice: 3738900, stock: 20, image: asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg') },
          { price: 3399000, compareAtPrice: 3738900, stock: 24, image: asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg') },
          { price: 3399000, compareAtPrice: 3738900, stock: 23, image: asset('products/initial-products/seed-data/kif-khersi-jigari-1.jpg') },
          { price: 3399000, compareAtPrice: 3738900, stock: 110, image: asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg') },
          { price: 3399000, compareAtPrice: 3738900, stock: 100, image: asset('products/initial-products/seed-data/kif-khersi-keremi-2.jpg') },
        ],
      },
    ],
  },
];

export const sampleData = { users, products };
export default sampleData;
