// Read-only grounding tools for the AI assistants. Every fact the assistant
// tells a customer/admin comes from these — the model never invents prices,
// stock, or order data. Admin tools are strictly read-only.

import { prisma } from '@/db/prisma';
import { getDiscount } from '@/lib/discount';

export type ToolDef = {
  name: string;
  description: string;
  parameters: string; // compact JSON-schema-ish description for the prompt
};

export type ToolResult = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Storefront tools (customer-facing; only public data)
// ---------------------------------------------------------------------------

export async function toolSearchProducts(args: {
  query?: string;
  categoryFa?: string;
  maxPriceToman?: number;
}): Promise<ToolResult> {
  const q = args.query?.slice(0, 60).trim() ?? '';
  const where: Record<string, unknown> = {};

  if (q) {
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { nameFa: { contains: q } },
      { brand: { contains: q, mode: 'insensitive' } },
      { categoryFa: { contains: q } },
    ];
  }
  if (args.categoryFa) {
    where.categoryFa = { contains: args.categoryFa.slice(0, 40) };
  }
  if (args.maxPriceToman && Number.isFinite(args.maxPriceToman) && args.maxPriceToman > 0) {
    where.price = { lte: args.maxPriceToman };
  }

  const rows = await prisma.product.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 6,
    select: {
      nameFa: true, name: true, slug: true, brand: true,
      categoryFa: true, price: true, compareAtPrice: true,
      stock: true, rating: true, numReviews: true,
    },
  });

  return {
    products: rows.map((p) => {
      const discount = getDiscount(p.price, p.compareAtPrice);
      const name = p.nameFa || p.name;
      return {
        name,
        brand: p.brand,
        category: p.categoryFa,
        priceToman: Number(p.price),
        originalPriceToman: p.compareAtPrice ? Number(p.compareAtPrice) : null,
        discountPercent: discount?.percent ?? null,
        inStock: p.stock > 0,
        stock: p.stock,
        rating: Number(p.rating),
        reviews: p.numReviews,
        url: `/product/${p.slug}`,
        link: `[${name}](/product/${p.slug})`,
      };
    }),
    count: rows.length,
  };
}

export async function toolGetProductDetails(args: { nameOrSlug: string }) {
  const needle = args.nameOrSlug?.slice(0, 60).trim() ?? '';
  const p = await prisma.product.findFirst({
    where: {
      OR: [
        { slug: needle },
        { nameFa: { contains: needle } },
        { name: { contains: needle, mode: 'insensitive' } },
      ],
    },
    select: {
      nameFa: true, name: true, slug: true, brand: true, categoryFa: true,
      description: true, descriptionFa: true, price: true, compareAtPrice: true,
      stock: true, rating: true, numReviews: true, codAvailable: true,
    },
  });
  if (!p) return { found: false };
  const discount = getDiscount(p.price, p.compareAtPrice);
  const name = p.nameFa || p.name;
  return {
    found: true,
    name,
    brand: p.brand,
    category: p.categoryFa,
    description: p.descriptionFa || p.description,
    priceToman: Number(p.price),
    originalPriceToman: p.compareAtPrice ? Number(p.compareAtPrice) : null,
    discountPercent: discount?.percent ?? null,
    stock: p.stock,
    codAvailable: p.codAvailable,
    rating: Number(p.rating),
    reviews: p.numReviews,
    url: `/product/${p.slug}`,
    link: `[${name}](/product/${p.slug})`,
  };
}

export async function toolListCategories(): Promise<ToolResult> {
  const cats = await prisma.category.findMany({
    where: { parentId: null },
    orderBy: { sortOrder: 'asc' },
    select: { nameFa: true, name: true, slug: true },
    take: 20,
  });
  return {
    categories: cats.map((c) => {
      const name = c.nameFa || c.name;
      return {
        name,
        url: `/category/${c.slug}`,
        link: `[${name}](/category/${c.slug})`,
      };
    }),
  };
}

export async function toolShippingAndPaymentInfo(): Promise<ToolResult> {
  return {
    shipping: 'ارسال رایگان برای سفارش‌های بالای ۵۰۰٬۰۰۰ تومان، در غیر این صورت ۵۰٬۰۰۰ تومان',
    payment: ['پرداخت آنلاین با درگاه امن زرین‌پال', 'پرداخت در محل (برای کالاهای واجد شرایط)'],
    returns: 'تا ۷ روز پس از دریافت کالا',
  };
}

// ---------------------------------------------------------------------------
// Admin tools (read-only analytics)
// ---------------------------------------------------------------------------

export async function toolSalesSummary() {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const [ordersCount, revenueAgg, usersCount, productsCount, paidCount] =
    await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalPrice: true } }),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count({ where: { isPaid: true } }),
    ]);

  const recent30 = await prisma.order.findMany({
    where: { createdAt: { gte: since } },
    select: { totalPrice: true },
  });
  const revenue30 = recent30.reduce((a, o) => a + Number(o.totalPrice), 0);

  return {
    last30Days: { orders: recent30.length, revenueToman: revenue30 },
    allTime: {
      orders: ordersCount,
      paidOrders: paidCount,
      revenueToman: Number(revenueAgg._sum.totalPrice ?? 0),
      users: usersCount,
      products: productsCount,
    },
  };
}

export async function toolLowStock(args: { threshold?: number }) {
  const threshold = Math.min(Math.max(args.threshold ?? 5, 1), 50);
  const rows = await prisma.product.findMany({
    where: { stock: { lte: threshold } },
    orderBy: { stock: 'asc' },
    take: 10,
    select: { nameFa: true, name: true, slug: true, stock: true },
  });
  return {
    products: rows.map((p) => {
      const name = p.nameFa || p.name;
      return {
        name,
        stock: p.stock,
        url: `/admin/products`,
        link: `[${name}](/admin/products)`,
      };
    }),
  };
}

export async function toolRecentOrders(args: { limit?: number }) {
  const limit = Math.min(Math.max(args.limit ?? 5, 1), 10);
  const rows = await prisma.order.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true, totalPrice: true, isPaid: true, isDelivered: true,
      paymentMethod: true, createdAt: true,
      user: { select: { name: true } },
    },
  });
  return {
    orders: rows.map((o) => ({
      id: o.id.slice(0, 8),
      customer: o.user.name,
      totalToman: Number(o.totalPrice),
      paid: o.isPaid,
      delivered: o.isDelivered,
      method: o.paymentMethod,
      date: o.createdAt.toISOString().slice(0, 10),
      url: `/admin/orders/${o.id}`,
      link: `[${o.id.slice(0, 8)}](/admin/orders/${o.id})`,
    })),
  };
}

// ---------------------------------------------------------------------------
// Registry per persona
// ---------------------------------------------------------------------------

export const STOREFRONT_TOOLS = {
  searchProducts: {
    def: { name: 'searchProducts', description: 'جستجوی محصولات فروشگاه بر اساس نام، دسته یا حداکثر قیمت (تومان).', parameters: 'query?: string, categoryFa?: string, maxPriceToman?: number' },
    run: toolSearchProducts,
  },
  getProductDetails: {
    def: { name: 'getProductDetails', description: 'جزئیات کامل یک محصول با نام یا اسلاگ.', parameters: 'nameOrSlug: string' },
    run: toolGetProductDetails,
  },
  listCategories: {
    def: { name: 'listCategories', description: 'فهرست دسته‌بندی‌های فروشگاه.', parameters: '' },
    run: toolListCategories,
  },
  shopInfo: {
    def: { name: 'shopInfo', description: 'اطلاعات ارسال، پرداخت و مرجوعی فروشگاه.', parameters: '' },
    run: toolShippingAndPaymentInfo,
  },
} as const;

export const ADMIN_TOOLS = {
  salesSummary: {
    def: { name: 'salesSummary', description: 'خلاصه فروش ۳۰ روز گذشته و کل (تعداد سفارش، درآمد، کاربران، محصولات).', parameters: '' },
    run: toolSalesSummary,
  },
  lowStock: {
    def: { name: 'lowStock', description: 'محصولاتی که موجودی آن‌ها کم است.', parameters: 'threshold?: number' },
    run: toolLowStock,
  },
  recentOrders: {
    def: { name: 'recentOrders', description: 'آخرین سفارش‌ها با وضعیت پرداخت و تحویل.', parameters: 'limit?: number' },
    run: toolRecentOrders,
  },
} as const;

export type StorefrontToolName = keyof typeof STOREFRONT_TOOLS;
export type AdminToolName = keyof typeof ADMIN_TOOLS;
