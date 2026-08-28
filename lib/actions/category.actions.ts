'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { formatError, slugifyCategory } from '../utils';
import type { ActionState } from '@/types';

const categoryFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameFa: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  icon: z.string().min(2),
  sortOrder: z.coerce.number().int().min(0),
});

// Get all categories for the admin table (includes product counts)
export async function getAllCategoriesAdmin() {
  await requireAdmin();

  const data = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { products: true } } },
  });

  return JSON.parse(JSON.stringify(data)) as {
    id: string;
    name: string;
    nameFa: string;
    slug: string;
    icon: string;
    sortOrder: number;
    _count: { products: number };
  }[];
}

// Create a category (admin)
export async function createCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const category = categoryFormSchema.parse({
      name: formData.get('name'),
      nameFa: formData.get('nameFa'),
      slug:
        (formData.get('slug') as string)?.trim() ||
        slugifyCategory(formData.get('name') as string),
      icon: (formData.get('icon') as string) || 'package',
      sortOrder: formData.get('sortOrder') ?? 0,
    });

    const exists = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    if (exists) throw new Error('Slug already exists');

    await prisma.category.create({ data: category });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: 'Category created successfully' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update a category (admin)
export async function updateCategory(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await requireAdmin();

    const category = categoryFormSchema.parse({
      name: formData.get('name'),
      nameFa: formData.get('nameFa'),
      slug:
        (formData.get('slug') as string)?.trim() ||
        slugifyCategory(formData.get('name') as string),
      icon: (formData.get('icon') as string) || 'package',
      sortOrder: formData.get('sortOrder') ?? 0,
    });
    const id = formData.get('id') as string;

    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    if (existing && existing.id !== id) {
      throw new Error('Slug already exists');
    }

    await prisma.category.update({ where: { id }, data: category });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: 'Category updated successfully' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete a category (admin). Refuses when products are attached.
export async function deleteCategory(id: string) {
  try {
    await requireAdmin();

    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0) {
      throw new Error(
        `Cannot delete: ${count} product(s) still use this category`
      );
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: 'Category deleted successfully' };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
