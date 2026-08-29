'use server';

import { revalidatePath } from 'next/cache';

import { prisma } from '@/db/prisma';
import { getValidUserId } from '../auth-helpers';
import { withActionMessage } from '../action-messages';
import { formatError } from '../utils';
import { shippingAddressSchema } from '../validator';
import type { ActionState } from '@/types';

// Get the signed-in user's saved addresses (default first)
export async function getUserAddresses() {
  const userId = await getValidUserId();
  if (!userId) return [];

  const data = await prisma.address.findMany({
    where: { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
  });

  return JSON.parse(JSON.stringify(data)) as {
    id: string;
    isDefault: boolean;
    fullName: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    phone: string;
  }[];
}

// Add a new address (first address automatically becomes the default)
export async function addUserAddress(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId)
      throw new Error(await withActionMessage('sessionExpired'));

    const address = shippingAddressSchema.parse({
      fullName: formData.get('fullName'),
      streetAddress: formData.get('streetAddress'),
      city: formData.get('city'),
      province: formData.get('province'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
    });

    const count = await prisma.address.count({ where: { userId } });

    await prisma.address.create({
      data: {
        ...address,
        userId,
        isDefault: count === 0,
      },
    });

    revalidatePath('/user/addresses');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('addressSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Update an existing address
export async function updateUserAddress(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId)
      throw new Error(await withActionMessage('sessionExpired'));

    const id = formData.get('id') as string;
    const address = shippingAddressSchema.parse({
      fullName: formData.get('fullName'),
      streetAddress: formData.get('streetAddress'),
      city: formData.get('city'),
      province: formData.get('province'),
      postalCode: formData.get('postalCode'),
      phone: formData.get('phone'),
    });

    // Ownership guard
    const owned = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!owned) throw new Error(await withActionMessage('addressNotFound'));

    await prisma.address.update({ where: { id }, data: address });

    revalidatePath('/user/addresses');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('addressSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Delete an address
export async function deleteUserAddress(id: string): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId)
      throw new Error(await withActionMessage('sessionExpired'));

    const owned = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!owned) throw new Error(await withActionMessage('addressNotFound'));

    await prisma.address.delete({ where: { id } });

    // If the default was deleted, promote the most recent remaining address
    if (owned.isDefault) {
      const next = await prisma.address.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    revalidatePath('/user/addresses');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('addressDeleted') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Choose an address as the default (used at checkout too)
export async function setDefaultAddress(id: string): Promise<ActionState> {
  try {
    const userId = await getValidUserId();
    if (!userId)
      throw new Error(await withActionMessage('sessionExpired'));

    const owned = await prisma.address.findFirst({
      where: { id, userId },
    });
    if (!owned) throw new Error(await withActionMessage('addressNotFound'));

    await prisma.$transaction([
      prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      prisma.address.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath('/user/addresses');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('addressSaved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
