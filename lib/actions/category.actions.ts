'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { prisma } from '@/db/prisma';
import { requireAdmin } from '../auth-guard';
import { withActionMessage } from '../action-messages';
import { formatError, slugifyCategory } from '../utils';
import type { ActionState } from '@/types';

const categoryFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  nameFa: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  icon: z.string().min(2),
  sortOrder: z.coerce.number().int().min(0),
  // Auto-hide on the storefront while the category has no products
  // (the action converts the checkbox value before parsing)
  hideEmpty: z.boolean().default(true),
  parentId: z.string().uuid().nullable().optional(),
});

// Cycle guard: a parent must be a top-level category and not the node itself
async function validateParent(parentId: string | null | undefined, selfId?: string) {
  if (!parentId) return null;
  const parent = await prisma.category.findUnique({ where: { id: parentId } });
  if (!parent) throw new Error(await withActionMessage('invalidValue'));
  if (parent.parentId) throw new Error(await withActionMessage('invalidValue'));
  if (selfId && parent.id === selfId)
    throw new Error(await withActionMessage('invalidValue'));
  return parentId;
}

// Get all categories for the admin table (hierarchy + product counts)
export async function getAllCategoriesAdmin() {
  await requireAdmin();

  const data = await prisma.category.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      parent: { select: { name: true, nameFa: true } },
      _count: {
        select: {
          mainProducts: true,
          subProducts: true,
          subSubProducts: true,
        },
      },
    },
  });

  const rows = JSON.parse(JSON.stringify(data)) as Array<{
    id: string;
    name: string;
    nameFa: string;
    slug: string;
    icon: string;
    sortOrder: number;
    parentId: string | null;
    hideEmpty: boolean;
    parent?: { name: string; nameFa: string } | null;
    _count: {
      mainProducts: number;
      subProducts: number;
      subSubProducts: number;
    };
  }>;

  return rows.map((c) => ({
    id: c.id,
    name: c.name,
    nameFa: c.nameFa,
    slug: c.slug,
    icon: c.icon,
    sortOrder: c.sortOrder,
    parentId: c.parentId as string | null,
    hideEmpty: c.hideEmpty as boolean,
    parentName: c.parent?.nameFa ?? null,
    count:
      c._count.mainProducts + c._count.subProducts + c._count.subSubProducts,
  }));
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
      hideEmpty: formData.get('hideEmpty') === 'on',
    });

    const exists = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    if (exists) throw new Error(await withActionMessage('slugExists'));

    const parentId = await validateParent(formData.get('parentId') as string);

    await prisma.category.create({ data: { ...category, parentId } });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('categoryCreated') };
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
      hideEmpty: formData.get('hideEmpty') === 'on',
    });
    const id = formData.get('id') as string;

    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });
    if (existing && existing.id !== id) {
      throw new Error(await withActionMessage('slugExists'));
    }

    const parentId = await validateParent(
      formData.get('parentId') as string,
      id
    );

    await prisma.category.update({
      where: { id },
      data: { ...category, parentId },
    });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('categoryUpdated') };
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
        await withActionMessage('categoryInUse', { count })
      );
    }

    await prisma.category.delete({ where: { id } });

    revalidatePath('/admin/categories');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('categoryDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
