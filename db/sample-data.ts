// Temporary in-memory sample data (Section 02).
// Replaced by PostgreSQL + Prisma seed data in Section 03.
// Prices are in Toman. Names carry fa/en pairs for the bilingual UI.

export type SampleProduct = {
  name: string;
  nameFa: string;
  slug: string;
  category: string;
  categoryFa: string;
  description: string;
  descriptionFa: string;
  images: string[];
  price: number;
  brand: string;
  rating: number;
  numReviews: number;
  stock: number;
  isFeatured: boolean;
  banner?: string;
};

const products: SampleProduct[] = [
  {
    name: 'iPhone 15 Pro 256GB',
    nameFa: 'آیفون ۱۵ پرو ۲۵۶ گیگابایت',
    slug: 'iphone-15-pro',
    category: 'Mobile Phones',
    categoryFa: 'گوشی موبایل',
    description:
      'Titanium design with A17 Pro chip, 48MP main camera and ProMotion display.',
    descriptionFa:
      'بدنه تیتانیومی با تراشه A17 Pro، دوربین اصلی ۴۸ مگاپیکسلی و نمایشگر ProMotion.',
    images: ['/images/sample-products/p1.webp', '/images/sample-products/p2.webp'],
    price: 68_500_000,
    brand: 'Apple',
    rating: 4.8,
    numReviews: 132,
    stock: 12,
    isFeatured: true,
    banner: '/images/banner-1.webp',
  },
  {
    name: 'Samsung Galaxy S24 Ultra',
    nameFa: 'سامسونگ گلکسی S24 اولترا',
    slug: 'galaxy-s24-ultra',
    category: 'Mobile Phones',
    categoryFa: 'گوشی موبایل',
    description:
      'Galaxy AI, built-in S Pen, 200MP camera and a bright 6.8-inch QHD+ display.',
    descriptionFa:
      'هوش مصنوعی Galaxy AI، قلم S Pen داخلی، دوربین ۲۰۰ مگاپیکسلی و نمایشگر ۶.۸ اینچی QHD+.',
    images: ['/images/sample-products/p2.webp'],
    price: 61_900_000,
    brand: 'Samsung',
    rating: 4.7,
    numReviews: 98,
    stock: 8,
    isFeatured: false,
  },
  {
    name: 'MacBook Air M3 13"',
    nameFa: 'مک‌بوک ایر M3 ۱۳ اینچ',
    slug: 'macbook-air-m3',
    category: 'Laptops',
    categoryFa: 'لپ‌تاپ',
    description:
      'Ultra-thin laptop with M3 chip, 18-hour battery life and Liquid Retina display.',
    descriptionFa:
      'لپ‌تاپ فوق نازک با تراشه M3، تا ۱۸ ساعت شارژدهی و نمایشگر Liquid Retina.',
    images: ['/images/sample-products/p3.webp'],
    price: 54_200_000,
    brand: 'Apple',
    rating: 4.9,
    numReviews: 76,
    stock: 5,
    isFeatured: true,
  },
  {
    name: 'ASUS ROG Strix G16',
    nameFa: 'ایسوس ROG استریکس G16',
    slug: 'asus-rog-strix-g16',
    category: 'Laptops',
    categoryFa: 'لپ‌تاپ',
    description:
      'Gaming laptop with RTX 4070, Intel Core i9 and a 165Hz QHD display.',
    descriptionFa:
      'لپ‌تاپ گیمینگ با کارت گرافیک RTX 4070، پردازنده Core i9 اینتل و نمایشگر 165Hz QHD.',
    images: ['/images/sample-products/p4.webp'],
    price: 78_000_000,
    brand: 'ASUS',
    rating: 4.6,
    numReviews: 54,
    stock: 3,
    isFeatured: false,
  },
  {
    name: 'AirPods Pro 2 (USB-C)',
    nameFa: 'ایرپاد پرو ۲ (USB-C)',
    slug: 'airpods-pro-2',
    category: 'Audio',
    categoryFa: 'صوتی',
    description:
      'Active noise cancellation, adaptive transparency and up to 6h listening time.',
    descriptionFa:
      'حذف نویز فعال، شفافیت تطبیقی و تا ۶ ساعت پخش موسیقی در هر شارژ.',
    images: ['/images/sample-products/p5.webp'],
    price: 11_400_000,
    brand: 'Apple',
    rating: 4.7,
    numReviews: 210,
    stock: 25,
    isFeatured: true,
  },
  {
    name: 'Sony WH-1000XM5',
    nameFa: 'سونی WH-1000XM5',
    slug: 'sony-wh-1000xm5',
    category: 'Audio',
    categoryFa: 'صوتی',
    description:
      'Industry-leading noise cancelling headphones with 30h battery life.',
    descriptionFa:
      'هدفون بی‌سیم با بهترین حذف نویز بازار و ۳۰ ساعت شارژدهی باتری.',
    images: ['/images/sample-products/p6.webp'],
    price: 16_800_000,
    brand: 'Sony',
    rating: 4.8,
    numReviews: 167,
    stock: 14,
    isFeatured: false,
  },
  {
    name: 'Apple Watch Series 9',
    nameFa: 'اپل واچ سری ۹',
    slug: 'apple-watch-series-9',
    category: 'Wearables',
    categoryFa: 'پوشیدنی',
    description:
      'Double Tap gesture, brighter display, and advanced health sensors.',
    descriptionFa:
      'اشاره دوضربه‌ای Double Tap، نمایشگر روشن‌تر و حسگرهای سلامت پیشرفته.',
    images: ['/images/sample-products/p7.webp'],
    price: 19_900_000,
    brand: 'Apple',
    rating: 4.6,
    numReviews: 88,
    stock: 18,
    isFeatured: true,
  },
  {
    name: 'iPad Pro 11" M4',
    nameFa: 'آیپد پرو ۱۱ اینچ M4',
    slug: 'ipad-pro-m4',
    category: 'Tablets',
    categoryFa: 'تبلت',
    description:
      'Ultra Retina XDR display, M4 chip and Apple Pencil Pro support.',
    descriptionFa:
      'نمایشگر Ultra Retina XDR، تراشه M4 و پشتیبانی از اپل پنسل پرو.',
    images: ['/images/sample-products/p8.webp'],
    price: 42_300_000,
    brand: 'Apple',
    rating: 4.9,
    numReviews: 64,
    stock: 7,
    isFeatured: false,
  },
  {
    name: 'Canon EOS R50',
    nameFa: 'کنون EOS R50',
    slug: 'canon-eos-r50',
    category: 'Cameras',
    categoryFa: 'دوربین',
    description:
      '24.2MP mirrorless camera with 4K video and Dual Pixel CMOS AF II.',
    descriptionFa:
      'دوربین بدون آینه ۲۴.۲ مگاپیکسلی با فیلم‌برداری 4K و فوکوس خودکار Dual Pixel CMOS AF II.',
    images: ['/images/sample-products/p9.webp'],
    price: 32_500_000,
    brand: 'Canon',
    rating: 4.5,
    numReviews: 41,
    stock: 0,
    isFeatured: false,
  },
  {
    name: 'JBL Charge 5',
    nameFa: 'جی‌بی‌ال Charge 5',
    slug: 'jbl-charge-5',
    category: 'Audio',
    categoryFa: 'صوتی',
    description:
      'Portable Bluetooth speaker with IP67 waterproofing and 20h playtime.',
    descriptionFa:
      'اسپیکر بلوتوثی قابل حمل با ضدآب IP67 و ۲۰ ساعت پخش موسیقی.',
    images: ['/images/sample-products/p10.webp'],
    price: 7_900_000,
    brand: 'JBL',
    rating: 4.4,
    numReviews: 156,
    stock: 30,
    isFeatured: false,
  },
  {
    name: 'LG UltraGear 27" 240Hz',
    nameFa: 'ال‌جی اولتراگیر ۲۷ اینچ ۲۴۰ هرتز',
    slug: 'lg-ultragear-27',
    category: 'Monitors',
    categoryFa: 'مانیتور',
    description:
      'QHD gaming monitor with 1ms response time, 240Hz refresh and G-Sync.',
    descriptionFa:
      'مانیتور گیمینگ QHD با زمان پاسخ‌دهی ۱ میلی‌ثانیه، نرخ به‌روزرسانی ۲۴۰ هرتز و G-Sync.',
    images: ['/images/sample-products/p11.webp'],
    price: 21_700_000,
    brand: 'LG',
    rating: 4.6,
    numReviews: 72,
    stock: 9,
    isFeatured: true,
    banner: '/images/banner-2.webp',
  },
  {
    name: 'PlayStation 5 Slim',
    nameFa: 'پلی‌استیشن ۵ اسلیم',
    slug: 'playstation-5-slim',
    category: 'Gaming',
    categoryFa: 'کنسول بازی',
    description:
      '1TB console with an integrated disc drive, 4K gaming and ray tracing.',
    descriptionFa:
      'کنسول یک ترابایتی با درایو دیسک یکپارچه، بازی‌های 4K و ردیابی پرتو.',
    images: ['/images/sample-products/p12.webp'],
    price: 38_400_000,
    brand: 'Sony',
    rating: 4.8,
    numReviews: 189,
    stock: 6,
    isFeatured: false,
  },
];

const sampleData = { products };

export default sampleData;
