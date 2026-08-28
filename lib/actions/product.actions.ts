'use server';

import { prisma } from '@/db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import {
  insertProductSchema,
  updateProductSchema,
} from '../validator';
import type { ActionState } from '@/types';

// Get the latest products
export async function getLatestProducts() {
  const data = await prisma.product.findMany({
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(data);
}

// Get featured products
export async function getFeaturedProducts() {
  const data = await prisma.product.findMany({
    where: { isFeatured: true },
    take: LATEST_PRODUCTS_LIMIT,
    orderBy: { createdAt: 'desc' },
  });

  return convertToPlainObject(data);
}

// Get distinct brands for the homepage marquee
export async function getBrands() {
  const products = await prisma.product.findMany({
    select: { brand: true },
    distinct: ['brand'],
    orderBy: { brand: 'asc' },
  });

  return products.map((p) => p.brand);
}

// Get homepage counters (products, orders, customers)
export async function getSiteStats() {
  const [products, orders, users] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.user.count(),
  ]);

  return { products, orders, users };
}

// Get single product by slug
export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({
    where: { slug: slug },
  });
}

// Get all distinct categories (fa/en pairs) with product counts
export async function getAllCategories() {
  const products = await prisma.product.findMany({
    select: { category: true, categoryFa: true },
  });

  const map = new Map<string, { category: string; categoryFa: string; _count: number }>();
  for (const p of products) {
    const entry = map.get(p.category);
    if (entry) {
      entry._count += 1;
    } else {
      map.set(p.category, { category: p.category, categoryFa: p.categoryFa, _count: 1 });
    }
  }

  return Array.from(map.values()).sort((a, b) => b._count - a._count);
}

// Get categories for navigation (dock, grids, filters) with product counts
export async function getCategoriesWithCount() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return convertToPlainObject(categories) as {
    id: string;
    slug: string;
    name: string;
    nameFa: string;
    icon: string;
    sortOrder: number;
    _count: { products: number };
  }[];
}

// Get a single category by id
export async function getCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

// Get a single category by slug
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

// Get paginated products for a category slug
export async function getProductsByCategorySlug({
  slug,
  sort,
  page,
  limit = PAGE_SIZE,
}: {
  slug: string;
  sort?: string;
  page: number;
  limit?: number;
}) {
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) return null;

  const orderBy =
    sort === 'lowest'
      ? { price: 'asc' as const }
      : sort === 'highest'
        ? { price: 'desc' as const }
        : sort === 'rating'
          ? { rating: 'desc' as const }
          : { createdAt: 'desc' as const };

  const where = { categoryId: category.id };

  const data = await prisma.product.findMany({
    where,
    orderBy,
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.product.count({ where });

  return {
    category: convertToPlainObject(category),
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Whether every product in the given list allows cash on delivery
// (ZarinPal is always available; COD is a per-product opt-in)
export async function canPayCashOnDelivery(productIds: string[]) {
  if (productIds.length === 0) return false;

  const [codCount, total] = await Promise.all([
    prisma.product.count({
      where: { id: { in: productIds }, codAvailable: true },
    }),
    prisma.product.count({ where: { id: { in: productIds } } }),
  ]);

  return codCount === total;
}

// Get products for the public search page with filters + sorting + pagination
export async function getFilteredProducts({
  query,
  category,
  price,
  rating,
  sort,
  limit = PAGE_SIZE,
  page,
}: {
  query?: string;
  category?: string;
  price?: string;
  rating?: string;
  sort?: string;
  limit?: number;
  page: number;
}) {
  const filters: Record<string, unknown> = {};

  if (query && query.trim() !== '') {
    filters.OR = [
      { name: { contains: query, mode: 'insensitive' as const } },
      { nameFa: { contains: query } },
      { brand: { contains: query, mode: 'insensitive' as const } },
      { description: { contains: query, mode: 'insensitive' as const } },
      { descriptionFa: { contains: query } },
    ];
  }

  if (category && category !== 'all') {
    filters.category = category;
  }

  if (price && price !== 'all') {
    const [min, max] = price.split('-').map(Number);
    filters.price = { gte: min, ...(Number.isFinite(max) ? { lte: max } : {}) };
  }

  if (rating && rating !== 'all') {
    filters.rating = { gte: Number(rating) };
  }

  const orderBy =
    sort === 'lowest'
      ? { price: 'asc' as const }
      : sort === 'highest'
        ? { price: 'desc' as const }
        : sort === 'rating'
          ? { rating: 'desc' as const }
          : { createdAt: 'desc' as const };

  const data = await prisma.product.findMany({
    where: filters,
    orderBy,
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.product.count({ where: filters });

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Get all products for the admin table with optional name/category search + pagination
export async function getAllProducts({
  query,
  limit = PAGE_SIZE,
  page,
}: {
  query?: string;
  limit?: number;
  page: number;
}) {
  const queryFilter =
    query && query.trim() !== ''
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { nameFa: { contains: query } },
            { category: { contains: query, mode: 'insensitive' as const } },
            { categoryFa: { contains: query } },
          ],
        }
      : {};

  const data = await prisma.product.findMany({
    where: queryFilter,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.product.count({ where: queryFilter });

  return {
    data: convertToPlainObject(data),
    totalPages: Math.ceil(dataCount / limit),
  };
}

// Get single product by id (admin)
export async function getProductById(productId: string) {
  const data = await prisma.product.findFirst({
    where: { id: productId },
  });

  return convertToPlainObject(data);
}

// Build a product payload from FormData (shared by create/update)
function productDataFromFormData(formData: FormData) {
  const imagesRaw = formData.get('images') as string | null;
  const banner = (formData.get('banner') as string | null)?.trim() || null;

  return {
    name: formData.get('name') as string,
    nameFa: formData.get('nameFa') as string,
    slug: formData.get('slug') as string,
    category: formData.get('category') as string,
    categoryFa: formData.get('categoryFa') as string,
    brand: formData.get('brand') as string,
    description: formData.get('description') as string,
    descriptionFa: formData.get('descriptionFa') as string,
    stock: Number(formData.get('stock')),
    price: formData.get('price') as string,
    images: imagesRaw ? (JSON.parse(imagesRaw) as string[]) : [],
    isFeatured: formData.get('isFeatured') === 'on',
    banner,
    codAvailable: formData.get('codAvailable') === 'on',
  };
}

// Find or create the Category row for a product's category pair
async function upsertCategory(category: string, categoryFa: string) {
  const slug = category
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const existing = await prisma.category.findFirst({
    where: { OR: [{ name: category }, { slug }] },
  });

  if (existing) {
    if (existing.nameFa !== categoryFa) {
      await prisma.category.update({
        where: { id: existing.id },
        data: { nameFa: categoryFa },
      });
    }
    return existing.id;
  }

  const maxOrder = await prisma.category.aggregate({
    _max: { sortOrder: true },
  });

  const created = await prisma.category.create({
    data: {
      slug,
      name: category,
      nameFa: categoryFa,
      icon: 'package',
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
    },
  });

  return created.id;
}

// Create a product (admin)
export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const product = insertProductSchema.parse(productDataFromFormData(formData));
    const categoryId = await upsertCategory(product.category, product.categoryFa);

    await prisma.product.create({ data: { ...product, categoryId } });

    return { success: true, message: await withActionMessage('productCreated') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a product (admin)
export async function updateProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const product = updateProductSchema.parse({
      ...productDataFromFormData(formData),
      id: formData.get('id') as string,
    });

    const productExists = await prisma.product.findFirst({
      where: { id: product.id },
    });
    if (!productExists)
      throw new Error(await withActionMessage('productNotFound'));

    const categoryId = await upsertCategory(product.category, product.categoryFa);

    await prisma.product.update({
      where: { id: product.id },
      data: { ...product, categoryId },
    });

    return { success: true, message: await withActionMessage('productUpdated') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete a product (admin)
export async function deleteProduct(id: string) {
  try {
    await requireAdmin();

    const productExists = await prisma.product.findFirst({
      where: { id },
    });
    if (!productExists)
      throw new Error(await withActionMessage('productNotFound'));

    await prisma.product.delete({ where: { id } });

    return { success: true, message: await withActionMessage('productDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
