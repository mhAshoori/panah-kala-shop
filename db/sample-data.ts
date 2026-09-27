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
  // A product with no options at all carries its own price and stock; the
  // parent row is written from these instead of being derived from variants.
  price?: number;
  compareAtPrice?: number;
  stock?: number;
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
  navy: { value: 'Navy', valueFa: 'سرمه‌ای', hex: '#1A237E' },
  springGreen: { value: 'Spring Green', valueFa: 'سبز بهاری', hex: '#7CB342' },
  gold: { value: 'Gold', valueFa: 'طلایی', hex: '#D4AF37' },
  redPurple: { value: 'Red Purple', valueFa: 'سرخابی', hex: '#AD1457' },
  lightPurple: { value: 'Light Purple', valueFa: 'بنفش کم‌رنگ', hex: '#C5A3D9' },
  dustyBlue: { value: 'Dusty Blue', valueFa: 'آبی خاکستری', hex: '#8FA5B0' },
  dustyPink: { value: 'Dusty Pink', valueFa: 'صورتی خاکی', hex: '#C9A9A6' },
  softGreen: { value: 'Soft Green', valueFa: 'سبز ملایم', hex: '#A5C4A0' },
  lightPink: { value: 'Light Pink', valueFa: 'صورتی روشن', hex: '#F0B6C2' },
};

// Non-color "طرح" values (no hex → rendered as chips, not swatches)
const design = (value: string, valueFa: string): SampleOptionValue => ({
  value,
  valueFa,
});
// `price` is the SELLING price and `compareAtPrice` the original. The only
// discounted item in the source data is the Golbarg notebook, at 9% off a
// 169,000 original (15,210 saved, exactly as the source states), so its
// selling price is 153,790. Every other product is carried at its list price
// with no discount, which is what the source shows.
const products: SampleProduct[] = [
  // 1 — نوشت‌افزار > مداد
  {
    name: 'KMT Triangle HB Pencil Fantasy',
    nameFa: 'مداد HB برند KMT مدل Triangle طرح فانتزی',
    slug: 'kmt-triangle-hb-pencil',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pencils',
    description:
      'HB pencil with a fantasy print, sold in packs of 12. Four child-friendly designs on the barrel.',
    descriptionFa:
      'مداد HB برند KMT مدل Triangle با طراحی فانتزی و جذاب، انتخابی مناسب برای استفاده روزمره در مدرسه، دفتر و نوشتن‌های روزانه است. این محصول در بسته‌بندی ۱۲ عددی عرضه می‌شود و طرح‌های متنوع و کودک‌پسندی روی بدنه مدادها دارد.',
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
    brand: 'KMT',
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
        values: [C.multicolor],
        variants: [], // single colour; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Emoji', 'ایموجی'),
          design('Boy and Girl', 'دختر پسر'),
          design('Doll', 'آدمک'),
          design('Cat', 'گربه'),
        ],
      },
    ],
    combos: [
      { options: [0, 0], price: 19900, stock: 36, image: asset('products/initial-products/seed-data/medad-hb-1.jpg') },
      { options: [0, 1], price: 19900, stock: 36, image: asset('products/initial-products/imgs/medad-1-1-kaleh-ghermez.jpg') },
      { options: [0, 2], price: 19900, stock: 36, image: asset('products/initial-products/imgs/medad-2-1-kaleh-siah.jpg') },
      { options: [0, 3], price: 19900, stock: 36, image: asset('products/initial-products/imgs/medad-2-3-kaleh-siah.jpg') },
    ],
  },
  // 2 — نوشت‌افزار > پاک کن
  {
    name: 'Kachol Sho Eraser',
    nameFa: 'پاک‌کن مدل کچل شو',
    slug: 'kachol-sho-eraser',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Erasers',
    description:
      'Erasers shaped as a bald gentleman: pull the top (hair and coat) and the eraser slides out. Three character designs.',
    descriptionFa:
      'پاک‌کن‌های مدل کچل شو، به شکل یه آقای سبیلوی بامزه طراحی شدن که با کشیدن قسمت بالایی (موها و کت)، پاک‌کن اصلی از زیرش بیرون میاد و شخصیت «کچل» می‌شه؛ همین حرکت ساده و بامزه باعث شده جذابیت زیادی برای بچه‌ها و نوجوان‌ها داشته باشه. این کالکشن در سه طرح پسربچه سفید، مرد سبز و مرد سفید و قرمز موجوده و هم کاربرد پاک‌کن معمولی داره هم به‌عنوان یه اسباب‌بازی کوچیک سرگرم‌کننده‌ست.',
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
        variants: [], // single colour; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('White Boy', 'پسربچه سفید'),
          design('Green Man', 'مرد سبز'),
          design('White and Red Man', 'مرد سفید و قرمز'),
        ],
      },
    ],
    combos: [
      { options: [0, 0], price: 159000, stock: 3, image: asset('products/initial-products/imgs/pak-kon-1-1-all-kachal-sho.webp') },
      { options: [0, 1], price: 159000, stock: 2, image: asset('products/initial-products/imgs/pak-kon-1-2-all-kachal-sho.webp') },
      { options: [0, 2], price: 159000, stock: 4, image: asset('products/initial-products/imgs/pak-kon-1-3-all-kachal-sho.webp') },
    ],
  },
  // 3 — نوشت‌افزار > مداد تراش
  {
    name: 'KMT Pastel Pencil Sharpener',
    nameFa: 'مدادتراش پاستلی KMT',
    slug: 'kmt-pastel-pencil-sharpener',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Sharpeners',
    description:
      'Pocket pencil sharpener in five pastel colours with a single-screw steel blade.',
    descriptionFa:
      'این تراش‌ها در پنج رنگ پاستلی صورتی، سبز، آبی، زرد و بنفش عرضه می‌شوند و بدنه‌ی پلاستیکی کوچک و سبکی دارند. تیغه‌ی فلزی آن‌ها با یک پیچ روی بدنه ثابت شده و برای تراشیدن سریع مداد رنگی و مداد معمولی مناسب است. اندازه‌ی جیبی‌شان باعث می‌شود به‌راحتی در جامدادی یا کیف جا بگیرند.',
    images: [
      asset('products/initial-products/seed-data/medad-tarash-1.jpg'),
      asset('products/initial-products/imgs/medad-tarash-1.jpg'),
    ],
    brand: 'KMT',
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
        values: [C.pink, C.green, C.skyBlue, C.yellow, C.purple],
        variants: [
          { price: 10900, stock: 19 },
          { price: 10900, stock: 19 },
          { price: 10900, stock: 19 },
          { price: 10900, stock: 16 },
          { price: 10900, stock: 21 },
        ],
      },
    ],
  },
  // 4 — نوشت‌افزار > استیکی نوت
  {
    name: 'Pastel Sticky Notes 6 Colors',
    nameFa: 'استیکی نوت پاستلی ۶ رنگ',
    slug: 'pastel-sticky-notes-6',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Sticky Notes',
    description:
      'Sticky note pad in six soft pastel colours, for notes, page marking and colour-coded tasks.',
    descriptionFa:
      'استیکی نوت طرح پاستلی، شش رنگ ملایم و فانتزی دارد: قهوه‌ای روشن، بنفش کم‌رنگ، آبی خاکستری، کرم، صورتی خاکی و سبز ملایم. رنگ‌های آرام و هماهنگشان روی میز کار و دفتر ظاهری مرتب می‌سازد. از آن‌ها می‌شود برای نوشتن یادآوری، علامت‌گذاری صفحه‌ی کتاب و دفتر، و دسته‌بندی کارها با رنگ‌های جدا استفاده کرد.',
    images: [
      asset('products/initial-products/seed-data/sticky-note-fantasy-1.jpg'),
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
        values: [
          C.lightBrown,
          C.lightPurple,
          C.dustyBlue,
          C.cream,
          C.dustyPink,
          C.softGreen,
        ],
        variants: [
          { price: 30000, stock: 10 },
          { price: 30000, stock: 10 },
          { price: 30000, stock: 10 },
          { price: 30000, stock: 10 },
          { price: 30000, stock: 10 },
          { price: 30000, stock: 10 },
        ],
      },
    ],
  },
  // 5 — نوشت‌افزار > مداد نوکی
  {
    name: 'Bare Naghala Mechanical Pencil 0.7mm',
    nameFa: 'مدادنوکی بره ناقلا ۰٫۷ میلیمتر',
    slug: 'bare-naghala-pencil-07',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Mechanical Pencils',
    description:
      '0.7mm mechanical pencil with a bear-head topper and a ridged matte barrel, in four colours.',
    descriptionFa:
      'این مداد نوکی ۰٫۷ میلی‌متری در چهار رنگ صورتی، مشکی، سفید و آبی روشن عرضه می‌شود و سر آن به شکل یک بره‌ی کوچک با چشم‌های گرد طراحی شده است. بدنه‌ی مات آن حلقه‌حلقه است و همین برجستگی‌ها گرفتنش را در دست راحت‌تر می‌کند. نوک فلزی و ضخامت ۰٫۷ برای نوشتن روزمره و تمرین در مدرسه و دانشگاه مناسب است.',
    images: [
      asset('products/initial-products/imgs/medad-noki-1-1-barreh-naghola.webp'),
    ],
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
        values: [C.white, C.black, C.skyBlue, C.pink],
        variants: [
          { price: 69000, stock: 8 },
          { price: 69000, stock: 15 },
          { price: 69000, stock: 12 },
          { price: 69000, stock: 16 },
        ],
      },
    ],
  },
  // 6 — نوشت‌افزار > مداد نوکی
  {
    name: 'Mermaid Mechanical Pencil 0.5mm',
    nameFa: 'مدادنوکی پری دریایی ۰٫۵ میلیمتر',
    slug: 'mermaid-pencil-05',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Mechanical Pencils',
    description:
      '0.5mm mechanical pencil with a mermaid-tail body and raised fin pattern, in four colours.',
    descriptionFa:
      'این مداد نوکی ۰٫۵ میلی‌متری بدنه‌ای به شکل دم پری دریایی دارد و در چهار رنگ صورتی، آبی، بنفش و طلایی عرضه می‌شود. رنگ‌های بدنه به‌صورت طیفی و براق از یک رنگ به رنگ دیگر می‌رسند و طرح فلس‌ها روی آن برجسته است. نوک فلزی و باریک آن برای نوشتن و طراحی‌های ریز مناسب است و ظاهر متفاوتش، آن را به گزینه‌ی خوبی برای هدیه دادن یا استفاده‌ی شخصی تبدیل می‌کند.',
    images: [
      asset('products/initial-products/imgs/medad-noki-2-1-pari-daryaii.webp'),
    ],
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
        values: [C.redPurple, C.pink, C.skyBlue, C.gold],
        variants: [
          { price: 69000, stock: 8 },
          { price: 69000, stock: 6 },
          { price: 69000, stock: 8 },
          { price: 69000, stock: 7 },
        ],
      },
    ],
  },
  // 7 — نوشت‌افزار > دفتر
  {
    name: 'Fantasy Elastic Notebook',
    nameFa: 'دفتر فانتری کش دار',
    slug: 'fantasy-elastic-notebook',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Notebooks',
    description:
      'Small hardcover notebook with a black cover printed with blue lilies and flowers, closed by a black elastic.',
    descriptionFa:
      'این دفتر جلد سخت و قطع کوچکی دارد و روی زمینه‌ی مشکی آن، طرح گل‌ها و برگ‌های نیلوفر آبی با رنگ‌های صورتی، بنفش و سبز چاپ شده است. بعضی از گل‌ها براق و هولوگرامی‌اند و در نور رنگ عوض می‌کنند، و همین طرح ساده را جذاب‌تر می‌کند. کش مشکی روی جلد دفتر را بسته نگه می‌دارد و گوشه‌های گرد آن، حمل‌کردنش را در کیف راحت‌تر می‌کند.',
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
    // No diversity: the source lists a single price and a single stock count.
    options: [],
    price: 199000,
    stock: 5,
  },
  // 8 — نوشت‌افزار > دفتر
  {
    name: 'Golbarg Notebook 80 Sheets',
    nameFa: 'دفتر ۸۰ برگ مدل گلبرگ',
    slug: 'golbarg-notebook-80',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Notebooks',
    description:
      'Golbarg notebook with a semi-gloss cover and a tone-on-tone vine print, in six colours.',
    descriptionFa:
      'دفترهای گلبرگ با جلد نیمه براق و طرح پیچازی هم‌رنگ، ظاهری ساده و مرتب دارند و در شش رنگ آبی آسمانی، سرمه‌ای، بنفش، نارنجی، سبز بهاری و یشمی موجودند. این دفتر برای استفاده در خانه، مدرسه و محل کار مناسب است. تنوع رنگ‌ها هم انتخاب را راحت می‌کند و می‌توانید برای هر درس یا کار، یک رنگ جدا بردارید.',
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
        values: [
          C.skyBlue,
          C.navy,
          C.purple,
          C.orange,
          C.springGreen,
          C.jade,
        ],
        variants: [
          // The one discount in the source: 9% off a 169,000 original, which
          // is 15,210 saved — the figure the source states.
          { price: 153790, compareAtPrice: 169000, stock: 2 },
          { price: 153790, compareAtPrice: 169000, stock: 2 },
          { price: 153790, compareAtPrice: 169000, stock: 2 },
          { price: 153790, compareAtPrice: 169000, stock: 2 },
          { price: 153790, compareAtPrice: 169000, stock: 2 },
          { price: 153790, compareAtPrice: 169000, stock: 2 },
        ],
      },
    ],
  },
  // 9 — نوشت‌افزار > خودکار
  {
    name: 'Test Good Pen 0.5mm G2501-A',
    nameFa: 'خودکار تست گود 0.5mm مدل G2501-A',
    slug: 'test-good-pen-g-2501-a',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pens',
    description: 'Smooth-writing 0.5mm gel pen, model G2501-A, in five colours.',
    descriptionFa:
      'خودکار گازی با نوشتاری روان و نوک ۰٫۵ میلی‌متری، مدل G2501-A، در پنج رنگ. مناسب استفاده روزمره در مدرسه و محل کار.',
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
        values: [C.black, C.blue, C.red, C.purple, C.green],
        variants: [
          { price: 34900, stock: 200 },
          { price: 34900, stock: 220 },
          { price: 34900, stock: 220 },
          { price: 34900, stock: 110 },
          { price: 34900, stock: 100 },
        ],
      },
    ],
  },
  // 10 — نوشت‌افزار > جامدادی
  {
    name: 'Fluffy Bunny Pencil Case',
    nameFa: 'جامدادی فانتزی پشمالو طرح گوش خرگوشی',
    slug: 'fluffy-bunny-pencilcase',
    category: 'Stationery',
    categoryFa: 'نوشت‌افزار',
    subCategory: 'Pencil Cases',
    description:
      'Holographic pencil case with fluffy bunny ears, in three dreamy colours.',
    descriptionFa:
      'جامدادی خرگوشی هولوگرامی با گوش‌های خرگوشی پشمالو؛ بدنه از پارچه‌ی هولوگرامی براق است که با تغییر زاویه‌ی نور رنگش می‌درخشد و پایینش با لایه‌ای پشم نرم و کرکی پر شده. روی هرکدام دو گوش خرگوشی با داخل گلیتری قرار گرفته که از بالای جامدادی سرک می‌کشند. فضای داخلی برای مداد، خودکار، پاک‌کن و وسایل نوشتاری روزمره کافی است و زیپش روان و باکیفیت است. در سه رنگ‌بندی ارغوانی، آبی روشن و صورتی عرضه می‌شود.',
    images: [
      asset('products/initial-products/seed-data/jamedadi-soorati-1.jpg'),
      asset('products/initial-products/seed-data/jamedadi-banafsh-1.jpg'),
      asset('products/initial-products/seed-data/jamedadi-posht1.jpg'),
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
        values: [C.purple, C.skyBlue, C.pink],
        variants: [
          { price: 290000, stock: 4, image: asset('products/initial-products/seed-data/jamedadi-banafsh-1.jpg') },
          { price: 290000, stock: 2, image: asset('products/initial-products/seed-data/jamedadi-posht1.jpg') },
          { price: 290000, stock: 6, image: asset('products/initial-products/seed-data/jamedadi-soorati-1.jpg') },
        ],
      },
    ],
  },
  // 11 — کیف > کوله پشتی
  {
    name: 'Teddy Patch Backpack',
    nameFa: 'کوله پشتی طرح دار مدل خرسی',
    slug: 'teddy-patch-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description:
      'Minimal everyday backpack with a small bear patch wearing a bow tie, in four colours.',
    descriptionFa:
      'این کوله پشتی با پارچه‌ی ساده و بادوام و طراحی مینیمال، برای استفاده‌ی روزانه در مدرسه یا مسافرت مناسب هست و در عین کاربردی بودن، ظاهری شیک و دوست‌داشتنی داره. روی بدنه‌ی آن، پچ یک خرس کوچولو با کراوات نشسته که ترکیبی ساده و شیکه و حس بامزه بودن رو بدون شلوغی بیش‌ازحد منتقل می‌کنه. فضای داخلی جادارش، جای کافی برای کتاب، دفتر و وسایل شخصی فراهم می‌کنه. جیب جلوی زیپ‌دار به همراه یک کیف کوچک گرد آویزون برای نگهداری وسایل ریز و جیب‌های کناری برای دسترسی سریع به بطری آب در نظر گرفته شدن. بندهای قابل تنظیم و پشتی راحت هم حمل روزانه رو بدون فشار به شانه و کمر ممکن می‌کنن. این کوله در چهار رنگ‌بندی زرشکی، کرمی، مشکی و صورتی روشن موجوده و گزینه‌ای مناسب هم برای استفاده‌ی شخصی و هم برای هدیه دادن به کودکان و نوجوانانی که به ظاهر و کیفیت وسایلشان اهمیت می‌دن.',
    images: [
      asset('products/initial-products/seed-data/kif-khersi-jigari-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-jigari-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-jigari-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-keremi-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-meshki-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-meshki-3.jpg'),

      asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-soorati-2.jpg'),
      asset('products/initial-products/seed-data/kif-khersi-soorati-3.jpg'),
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
        values: [C.jigari, C.cream, C.black, C.lightPink],
        variants: [
          { price: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-jigari-1.jpg') },
          { price: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-keremi-1.jpg') },
          { price: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-meshki-1.jpg') },
          { price: 2099000, stock: 1, image: asset('products/initial-products/seed-data/kif-khersi-soorati-1.jpg') },
        ],
      },
    ],
  },
  // 12 — کیف > کوله پشتی
  {
    name: 'Velvet Doll Backpack',
    nameFa: 'کوله پشتی مخملی عروسک دار',
    slug: 'velvet-doll-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description:
      'Velvet backpack with small floral, polka-dot and bow prints and a plush bear charm, in six designs.',
    descriptionFa:
      'این کوله پشتی با طرح ملایم گل‌های ریز، پاپیونی و خال‌خالی، روی پارچه‌ی مخمل کبریتی بادوام، برای استفاده‌ی روزانه در مدرسه یا مسافرت طراحی شده و در عین کاربردی بودن، ظاهری شیک و متفاوت داره. به زیپ جلوی اون، یه آویز عروسکی خرس پشمالو با گردنبند مروارید وصل شده که حس دوست‌داشتنی و شخصی‌سازی‌شده‌ای به کوله می‌بخشه. فضای داخلی جادارش، جای کافی برای کتاب، دفتر و وسایل شخصی فراهم می‌کنه. جیب جلوی زیپ‌دار و جیب‌های کناری کشی برای دسترسی سریع به وسایل کوچک و بطری آب در نظر گرفته شده، و بندهای قابل تنظیم به همراه پشتی طراحی‌شده برای راحتی، حمل روزانه رو بدون فشار به شانه و کمر ممکن می‌کنه. در مجموع گزینه‌ای مناسب هم برای استفاده‌ی شخصی و هم برای هدیه دادن به کسانی است که به ظاهر ظریف و کیفیت وسایلشان اهمیت می‌دهند.',
    images: [
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-1.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-5-2.jpg'),
      asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-1.jpg'),
    ],
    brand: 'Panah Kala',
    rating: '0',
    numReviews: 0,
    isFeatured: false,
    lengthCm: '30.00',
    widthCm: '13.00',
    heightCm: '36.00',
    weightG: '450.00',
    options: [
      {
        name: 'color',
        nameFa: 'رنگ',
        values: [C.cream],
        variants: [], // single colour; combos below carry the variants
      },
      {
        name: 'design',
        nameFa: 'طرح',
        values: [
          design('Cream Checkered', 'کرمی چهارخونه'),
          design('Cream Floral', 'کرمی گل‌ریز'),
          design('Cream Polka Dot', 'کرمی خال‌دار'),
          design('Cream Flower', 'کرمی گل‌دار'),
          design('Cream Bow', 'کرمی پاپیون‌دار'),
          design('Yellow Polka Dot', 'زرد خال‌دار'),
        ],
      },
    ],
    combos: [
      // Value order: 0 چهارخونه, 1 گل‌ریز, 2 خال‌دار, 3 گل‌دار, 4 پاپیون‌دار, 5 زرد خال‌دار.
      // گل‌دار has no photo of its own yet and reuses keremi-2-1 until one is uploaded.
      { options: [0, 0], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-1-1.jpg') },
      { options: [0, 1], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-4-1.jpg') },
      { options: [0, 2], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-3-1.jpg') },
      { options: [0, 3], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-2-1.jpg') },
      { options: [0, 4], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-keremi-5-2.jpg') },
      { options: [0, 5], price: 2399000, stock: 1, image: asset('products/initial-products/seed-data/kif-aroosk-dar-zard-1-1.jpg') },
    ],
  },
  // 13 — کیف > کوله پشتی
  {
    name: 'Puppy Plush Doll Backpack',
    nameFa: 'کوله پشتی عروسکی سگ پشمالو',
    slug: 'puppy-plush-doll-backpack',
    category: 'Bags',
    categoryFa: 'کیف',
    subCategory: 'Backpacks',
    description:
      'Everyday checked backpack topped with a plush puppy in an orange hat, in two colours.',
    descriptionFa:
      'این کوله پشتی با طرح چهارخانه‌ی ملایم و جنس بادوام، برای استفاده‌ی روزانه در مدرسه یا مسافرت طراحی شده و در عین کاربردی بودن، ظاهری دوست‌داشتنی و متفاوت داره. روی بدنه‌ی اون، یک عروسک پشمالو با گوش‌های نرم و کلاه نارنجی‌رنگ قرار گرفته که با جزئیاتی مثل دکمه‌های قلب و نشان خنده تکمیل شده. فضای داخلی جادارش، جای کافی برای کتاب، دفتر و وسایل شخصی فراهم می‌کند، دو جیب جلوی پشمالو با درپوش برای دسترسی سریع به وسایل کوچک در نظر گرفته شده، و بند‌های قابل تنظیم به همراه پشتی طراحی‌شده برای راحتی، حمل روزانه را بدون فشار به شانه و کمر ممکن می‌کنه. در مجموع گزینه‌ای مناسب هم برای استفاده‌ی شخصی و هم برای هدیه دادن به کودکان و نوجوانانی که به ظاهر و کیفیت وسایلشان اهمیت می‌دهند.',
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
        values: [C.skyBlue, C.lightYellow],
        variants: [
          { price: 2590000, stock: 2, image: asset('products/initial-products/imgs/kif-khargooshi-1-1.jpg') },
          { price: 2590000, stock: 2, image: asset('products/initial-products/imgs/kif-khargooshi-1-2.jpg') },
        ],
      },
    ],
  },
];
export const sampleData = { users, products };
export default sampleData;
