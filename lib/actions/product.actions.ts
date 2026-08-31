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

export type CategoryNode = {
  id: string;
  slug: string;
  name: string;
  nameFa: string;
  icon: string;
  sortOrder: number;
  parentId: string | null;
  count: number;
  children: CategoryNode[];
};

// Flat list with product counts; a parent's count includes its descendants.
export async function getCategoriesWithCount() {
  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: {
          mainProducts: true,
          subProducts: true,
          subSubProducts: true,
        },
      },
    },
  });

  const flat = convertToPlainObject(categories).map((c) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    nameFa: c.nameFa,
    icon: c.icon,
    sortOrder: c.sortOrder,
    parentId: c.parentId as string | null,
    count:
      c._count.mainProducts + c._count.subProducts + c._count.subSubProducts,
  }));

  // Propagate counts up to parents
  const byId = new Map(flat.map((c) => [c.id, c]));
  for (const c of flat) {
    if (c.parentId && byId.has(c.parentId)) {
      const parent = byId.get(c.parentId)!;
      parent.count += c.count;
    }
  }

  return flat;
}

// Full category tree (mains with nested children) for the mega menu & forms
export async function getCategoryTree(): Promise<CategoryNode[]> {
  const flat = await getCategoriesWithCount();

  const nodes = new Map<string, CategoryNode>();
  for (const c of flat) {
    nodes.set(c.id, { ...c, children: [] });
  }
  const roots: CategoryNode[] = [];
  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// Collect a category and all of its descendant ids
function collectDescendantIds(
  tree: CategoryNode[],
  id: string
): string[] {
  const ids: string[] = [];
  const walk = (nodes: CategoryNode[]) => {
    for (const n of nodes) {
      if (n.id === id) {
        const collect = (node: CategoryNode) => {
          ids.push(node.id);
          node.children.forEach(collect);
        };
        collect(n);
        return true;
      }
      if (walk(n.children)) return true;
    }
    return false;
  };
  walk(tree);
  return ids;
}

// Get a single category by id
export async function getCategoryById(id: string) {
  return prisma.category.findUnique({ where: { id } });
}

// Get a single category by slug
export async function getCategoryBySlug(slug: string) {
  return prisma.category.findUnique({ where: { slug } });
}

// Get paginated products for a category slug (includes subcategory products)
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

  const tree = await getCategoryTree();
  const ids = collectDescendantIds(tree, category.id);

  const orderBy =
    sort === 'lowest'
      ? { price: 'asc' as const }
      : sort === 'highest'
        ? { price: 'desc' as const }
        : sort === 'rating'
          ? { rating: 'desc' as const }
          : { createdAt: 'desc' as const };

  const where = {
    OR: [
      { categoryId: { in: ids } },
      { subCategoryId: { in: ids } },
      { subSubCategoryId: { in: ids } },
    ],
  };

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

// Sanitize user-supplied filter params so malformed input can never reach
// Prisma (NaN comparisons crash with a 500).
function parsePriceFilter(price: string | undefined): { gte: number; lte?: number } | undefined {
  if (!price || price === 'all') return undefined;
  const [minRaw, maxRaw] = price.split('-');
  const min = Number(minRaw);
  const max = Number(maxRaw);
  if (!Number.isFinite(min) || min < 0) return undefined;
  return {
    gte: min,
    ...(Number.isFinite(max) && max >= min ? { lte: max } : {}),
  };
}

function parseRatingFilter(rating: string | undefined): { gte: number } | undefined {
  if (!rating || rating === 'all') return undefined;
  const value = Number(rating);
  if (!Number.isFinite(value) || value < 0 || value > 5) return undefined;
  return { gte: value };
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
  // Cap query length and page number (worst-case abuse guard)
  const q = query ? query.slice(0, 100).trim() : '';
  const safePage = Math.max(1, Math.min(Number(page) || 1, 10_000));

  const filters: Record<string, unknown>[] = [];

  if (q !== '') {
    filters.push({
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { nameFa: { contains: q } },
        { brand: { contains: q, mode: 'insensitive' as const } },
        { description: { contains: q, mode: 'insensitive' as const } },
        { descriptionFa: { contains: q } },
        // Persian users search by category type ("گوشی", "لپ‌تاپ") — include
        // the category fields so such queries match the category's products.
        { category: { contains: q, mode: 'insensitive' as const } },
        { categoryFa: { contains: q } },
      ],
    });
  }

  // Category filter includes products in all descendant subcategories
  if (category && category !== 'all' && category.length <= 100) {
    const main = await prisma.category.findFirst({
      where: { OR: [{ name: category }, { nameFa: category }] },
    });
    if (main) {
      const tree = await getCategoryTree();
      const ids = collectDescendantIds(tree, main.id);
      filters.push({
        OR: [
          { categoryId: { in: ids } },
          { subCategoryId: { in: ids } },
          { subSubCategoryId: { in: ids } },
        ],
      });
    } else {
      // Unknown category — match nothing
      filters.push({ id: { in: [] } });
    }
  }

  const priceFilter = parsePriceFilter(price);
  if (priceFilter) {
    filters.push({ price: priceFilter });
  }

  const ratingFilter = parseRatingFilter(rating);
  if (ratingFilter) {
    filters.push({ rating: ratingFilter });
  }

  const where = filters.length > 0 ? { AND: filters } : {};

  const orderBy =
    sort === 'lowest'
      ? { price: 'asc' as const }
      : sort === 'highest'
        ? { price: 'desc' as const }
        : sort === 'rating'
          ? { rating: 'desc' as const }
          : { createdAt: 'desc' as const };

  const data = await prisma.product.findMany({
    where,
    orderBy,
    take: limit,
    skip: (safePage - 1) * limit,
  });

  const dataCount = await prisma.product.count({ where });

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
    compareAtPrice: ((formData.get('compareAtPrice') as string | null)?.trim() || '') as string,
    images: imagesRaw ? (JSON.parse(imagesRaw) as string[]) : [],
    isFeatured: formData.get('isFeatured') === 'on',
    banner,
    codAvailable: formData.get('codAvailable') === 'on',
  };
}


// Validate the main -> sub -> sub-sub chain chosen in the product form and
// return the three ids for storage.
async function resolveCategoryChain(formData: FormData) {
  const categoryId = (formData.get('categoryId') as string) || null;
  const subCategoryId = (formData.get('subCategoryId') as string) || null;
  const subSubCategoryId = (formData.get('subSubCategoryId') as string) || null;

  if (!categoryId) throw new Error('Main category is required');
  if (!subCategoryId) throw new Error('Subcategory is required');

  const main = await prisma.category.findFirst({
    where: { id: categoryId, parentId: null },
  });
  if (!main) throw new Error('Invalid main category');

  const sub = await prisma.category.findFirst({
    where: { id: subCategoryId, parentId: categoryId },
  });
  if (!sub) throw new Error('Invalid subcategory for this main category');

  if (subSubCategoryId) {
    const subSub = await prisma.category.findFirst({
      where: { id: subSubCategoryId, parentId: subCategoryId },
    });
    if (!subSub) throw new Error('Invalid sub-subcategory for this subcategory');
  }

  return { categoryId, subCategoryId, subSubCategoryId };
}

// Create a product (admin)
export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const product = insertProductSchema.parse(productDataFromFormData(formData));
    const chain = await resolveCategoryChain(formData);

    await prisma.product.create({
      data: {
        ...product,
        categoryId: chain.categoryId,
        subCategoryId: chain.subCategoryId,
        subSubCategoryId: chain.subSubCategoryId,
      },
    });

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

    const chain = await resolveCategoryChain(formData);

    await prisma.product.update({
      where: { id: product.id },
      data: {
        ...product,
        categoryId: chain.categoryId,
        subCategoryId: chain.subCategoryId,
        subSubCategoryId: chain.subSubCategoryId,
      },
    });

    return { success: true, message: await withActionMessage('productUpdated') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete a product (admin). Refuses when the product appears in orders —
// deleting it would cascade-delete historical order items.
export async function deleteProduct(id: string) {
  try {
    await requireAdmin();

    const productExists = await prisma.product.findFirst({
      where: { id },
    });
    if (!productExists)
      throw new Error(await withActionMessage('productNotFound'));

    const orderItemCount = await prisma.orderItem.count({
      where: { productId: id },
    });
    if (orderItemCount > 0) {
      throw new Error(
        await withActionMessage('productHasOrders', { count: orderItemCount })
      );
    }

    await prisma.product.delete({ where: { id } });

    return { success: true, message: await withActionMessage('productDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
