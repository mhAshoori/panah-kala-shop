'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma/client';
import { convertToPlainObject, formatError } from '../utils';
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import {
  insertProductSchema,
  updateProductSchema,
  productOptionsPayloadSchema,
} from '../validator';
import { buildVariantKey, cartesian, recomputeParent } from '../variants';
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

// Best sellers proxy until real sales tracking lands: highest-rated first,
// most-reviewed as tiebreak (products with no reviews fall to the end).
export async function getBestSellers(limit: number) {
  const data = await prisma.product.findMany({
    where: { numReviews: { gt: 0 } },
    take: Math.min(Math.max(limit, 1), 12),
    orderBy: [{ rating: 'desc' }, { numReviews: 'desc' }],
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

// Get single product by slug (with diversity: options + variants)
export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({
    where: { slug: slug },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
        include: {
          values: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      variants: true,
    },
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

// Get single product by id (admin) — with diversity data
export async function getProductById(productId: string) {
  const data = await prisma.product.findFirst({
    where: { id: productId },
    include: {
      options: {
        orderBy: { sortOrder: 'asc' },
        include: { values: { orderBy: { sortOrder: 'asc' } } },
      },
      variants: true,
    },
  });

  return convertToPlainObject(data);
}

// Build a product payload from FormData (shared by create/update)
function productDataFromFormData(formData: FormData) {
  const imagesRaw = formData.get('images') as string | null;
  const banner = (formData.get('banner') as string | null)?.trim() || null;
  const dim = (key: string) => {
    const raw = (formData.get(key) as string | null)?.trim() || '';
    return raw === '' ? null : raw;
  };

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
    lengthCm: dim('lengthCm'),
    widthCm: dim('widthCm'),
    heightCm: dim('heightCm'),
    weightG: dim('weightG'),
  };
}

// Parse the diversity payloads from the admin form's hidden JSON inputs
function diversityFromFormData(formData: FormData) {
  const optionsRaw = formData.get('optionsJson') as string | null;
  const variantsRaw = formData.get('variantsJson') as string | null;
  if (!optionsRaw || !variantsRaw) return null;
  if (optionsRaw === '[]' && variantsRaw === '[]') return null;
  return productOptionsPayloadSchema.parse({
    options: JSON.parse(optionsRaw),
    variants: JSON.parse(variantsRaw),
  });
}

type DiversityPayload = NonNullable<
  ReturnType<typeof diversityFromFormData>
>;

/**
 * Replace a product's options + variants transactionally and recompute the
 * parent's derived price/compareAtPrice/stock from the variant rows.
 * Keys are rebuilt server-side from the created value ids — the client
 * cannot forge a combo signature.
 */
async function replaceProductDiversity(
  tx: Prisma.TransactionClient,
  productId: string,
  diversity: DiversityPayload
) {
  await tx.productOption.deleteMany({ where: { productId } });
  await tx.productVariant.deleteMany({ where: { productId } });

  // Create options + values one level at a time (nested create cannot also
  // include), remembering each created value's id by its index.
  type CreatedValue = { id: string; idx: number; value: string; valueFa: string; hex: string | null };
  const createdOptions: { optionId: string; nameFa: string; values: CreatedValue[] }[] = [];

  for (const [optIdx, option] of diversity.options.entries()) {
    const createdOption = await tx.productOption.create({
      data: {
        productId,
        name: option.name,
        nameFa: option.nameFa,
        sortOrder: optIdx,
      },
    });
    const createdValues: CreatedValue[] = [];
    for (const [valIdx, v] of option.values.entries()) {
      const createdValue = await tx.productOptionValue.create({
        data: {
          optionId: createdOption.id,
          value: v.value,
          valueFa: v.valueFa,
          hex: v.hex ?? null,
          sortOrder: valIdx,
        },
      });
      createdValues.push({
        id: createdValue.id,
        idx: valIdx,
        value: v.value,
        valueFa: v.valueFa,
        hex: v.hex ?? null,
      });
    }
    createdOptions.push({ optionId: createdOption.id, nameFa: option.nameFa, values: createdValues });
  }

  // Recompute the combo keys from real value ids and build variant rows
  const combos = cartesian(createdOptions.map((o) => o.values));
  if (diversity.variants.length !== combos.length) {
    throw new Error(
      `Expected ${combos.length} variant rows, received ${diversity.variants.length}`
    );
  }

  const seenKeys = new Set<string>();
  const variantRows: { price: string; compareAtPrice: string | null; stock: number }[] = [];
  for (const [comboIdx, combo] of combos.entries()) {
    const key = buildVariantKey(combo.map((v) => v.id));
    if (seenKeys.has(key)) throw new Error('Duplicate variant combination');
    seenKeys.add(key);

    const snapshot = combo.map((v, optIdx) => ({
      optionId: createdOptions[optIdx].optionId,
      optionFa: createdOptions[optIdx].nameFa,
      valueId: v.id,
      valueFa: v.valueFa,
      hex: v.hex,
    }));

    const input = diversity.variants[comboIdx];
    await tx.productVariant.create({
      data: {
        productId,
        key,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        stock: input.stock,
        options: snapshot,
        image: input.image ?? null,
      },
    });
    variantRows.push({
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      stock: input.stock,
    });
  }

  // Derived parent fields keep search/sort/carousels working without joins
  const derived = recomputeParent(variantRows);
  await tx.product.update({
    where: { id: productId },
    data: {
      price: derived.price,
      compareAtPrice: derived.compareAtPrice,
      stock: derived.stock,
    },
  });
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

    const diversity = diversityFromFormData(formData);

    await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          ...product,
          categoryId: chain.categoryId,
          subCategoryId: chain.subCategoryId,
          subSubCategoryId: chain.subSubCategoryId,
        },
      });
      if (diversity) {
        await replaceProductDiversity(tx as unknown as Prisma.TransactionClient, created.id, diversity);
      }
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
    const diversity = diversityFromFormData(formData);

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: product.id },
        data: {
          ...product,
          categoryId: chain.categoryId,
          subCategoryId: chain.subCategoryId,
          subSubCategoryId: chain.subSubCategoryId,
        },
      });
      if (diversity) {
        await replaceProductDiversity(tx as unknown as Prisma.TransactionClient, product.id, diversity);
      }
    });

    revalidatePath(`/admin/products/${product.id}`);
    revalidatePath('/admin/products');

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
