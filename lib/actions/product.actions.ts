'use server';

import { prisma } from '@/db/prisma';
import { convertToPlainObject, formatError } from '../utils';
import { LATEST_PRODUCTS_LIMIT, PAGE_SIZE } from '../constants';
import { requireAdmin } from '../auth-guard';
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

// Get single product by slug
export async function getProductBySlug(slug: string) {
  return await prisma.product.findFirst({
    where: { slug: slug },
  });
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
  };
}

// Create a product (admin)
export async function createProduct(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const product = insertProductSchema.parse(productDataFromFormData(formData));
    await prisma.product.create({ data: product });

    return { success: true, message: 'Product created successfully' };
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
    if (!productExists) throw new Error('Product not found');

    await prisma.product.update({
      where: { id: product.id },
      data: product,
    });

    return { success: true, message: 'Product updated successfully' };
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
    if (!productExists) throw new Error('Product not found');

    await prisma.product.delete({ where: { id } });

    return { success: true, message: 'Product deleted successfully' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
