'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';

import { prisma } from '@/db/prisma';
import { Prisma } from '@/lib/generated/prisma/client';
import { cartItemSchema, insertCartSchema } from '../validator';
import { convertToPlainObject, formatError } from '../utils';
import { calcPrice } from '../cart/pricing';
import { getValidUserId } from '../auth-helpers';
import type { CartItem } from '@/types';

// Localized cart messages (fa default)
const cartMessages = {
  en: {
    noSession: 'Cart session not found',
    productNotFound: 'Product not found',
    cartNotFound: 'Cart not found',
    itemNotFound: 'Item not found in cart',
    notEnoughStock: 'Not enough stock available',
    added: '{name} added to cart successfully',
    updated: '{name} quantity updated in cart',
    removed: '{name} removed from cart',
  },
  fa: {
    noSession: 'شناسه سبد خرید یافت نشد',
    productNotFound: 'محصول یافت نشد',
    cartNotFound: 'سبد خرید یافت نشد',
    itemNotFound: 'کالا در سبد خرید یافت نشد',
    notEnoughStock: 'موجودی کافی نیست',
    added: '{name} با موفقیت به سبد خرید اضافه شد',
    updated: 'تعداد {name} در سبد خرید به‌روزرسانی شد',
    removed: '{name} از سبد خرید حذف شد',
  },
} as const;

type MessageKey = keyof typeof cartMessages.en;

async function msg(key: MessageKey, name?: string): Promise<string> {
  const locale = ((await getLocale()) as 'fa' | 'en') ?? 'fa';
  const template = cartMessages[locale]?.[key] ?? cartMessages.en[key];
  return name ? template.replace('{name}', name) : template;
}

// Calculate cart prices (see lib/cart/pricing.ts — pure & unit-tested)

// Get user cart from database (by user id when signed in, else session cookie)
export async function getMyCart() {
  // Check for session cart cookie
  const sessionCartId = (await cookies()).get('sessionCartId')?.value;
  if (!sessionCartId) return undefined;

  // Get session user id (validated against the DB — stale sessions = guest)
  const userId = await getValidUserId();

  // Find the cart
  const cart = await prisma.cart.findFirst({
    where: userId ? { userId: userId } : { sessionCartId: sessionCartId },
  });

  if (!cart) return undefined;

  // Convert Decimal values to strings for client components
  return convertToPlainObject({
    ...cart,
    items: cart.items as CartItem[],
    itemsPrice: cart.itemsPrice.toString(),
    totalPrice: cart.totalPrice.toString(),
    shippingPrice: cart.shippingPrice.toString(),
    taxPrice: cart.taxPrice.toString(),
  });
}

// Insert or update the cart with the given items
async function saveCart(params: {
  sessionCartId: string;
  userId?: string;
  existingCartId?: string;
  items: CartItem[];
}) {
  const { sessionCartId, userId, existingCartId, items } = params;
  if (existingCartId) {
    await prisma.cart.update({
      where: { id: existingCartId },
      data: {
        items: items as unknown as Prisma.InputJsonValue[],
        ...calcPrice(items),
      },
    });
  } else {
    const newCart = insertCartSchema.parse({
      userId,
      items,
      sessionCartId,
      ...calcPrice(items),
    }) as Prisma.CartUncheckedCreateInput;
    await prisma.cart.create({ data: newCart });
  }
}

// Add item to cart in database
export async function addItemToCart(data: CartItem) {
  try {
    // Check for session cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error(await msg('noSession'));

    // Get session user id (validated against the DB — stale sessions = guest)
    const userId = await getValidUserId();

    // Parse and validate submitted item data
    const item = cartItemSchema.parse(data);

    // Find product in database
    const product = await prisma.product.findFirst({
      where: { id: item.productId },
    });
    if (!product) throw new Error(await msg('productNotFound'));

    // Localized product display name
    const locale = await getLocale();
    const displayName = locale === 'fa' ? product.nameFa : product.name;

    // Get current cart
    const cart = await getMyCart();

    let messageKey: Extract<MessageKey, 'added' | 'updated'> = 'added';

    if (!cart) {
      if (product.stock < 1) throw new Error(await msg('notEnoughStock'));
      await saveCart({
        sessionCartId,
        userId,
        items: [{ ...item, name: displayName }],
      });
    } else {
      // Check for existing item in cart
      const existItem = (cart.items as CartItem[]).find(
        (x) => x.productId === item.productId
      );

      if (existItem) {
        // If not enough stock, throw error
        if (product.stock < existItem.qty + 1) {
          throw new Error(await msg('notEnoughStock'));
        }
        messageKey = 'updated';
        existItem.qty = existItem.qty + 1;
        await saveCart({
          sessionCartId,
          userId,
          existingCartId: cart.id,
          items: cart.items as CartItem[],
        });
      } else {
        // If in stock, add the new item
        if (product.stock < 1) throw new Error(await msg('notEnoughStock'));
        await saveCart({
          sessionCartId,
          userId,
          existingCartId: cart.id,
          items: [...(cart.items as CartItem[]), { ...item, name: displayName }],
        });
      }
    }

    // Revalidate localized product page (header badge refreshes too)
    revalidatePath(`/product/${product.slug}`);

    return { success: true, message: await msg(messageKey, displayName) };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Remove one unit of an item from the cart in database
export async function removeItemFromCart(productId: string) {
  try {
    // Check for session cart cookie
    const sessionCartId = (await cookies()).get('sessionCartId')?.value;
    if (!sessionCartId) throw new Error(await msg('noSession'));

    // Get product
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });
    if (!product) throw new Error(await msg('productNotFound'));

    // Get user cart
    const cart = await getMyCart();
    if (!cart) throw new Error(await msg('cartNotFound'));

    // Check if cart has the item
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error(await msg('itemNotFound'));

    const locale = await getLocale();
    const displayName = locale === 'fa' ? product.nameFa : product.name;

    // If only one left, remove it entirely; otherwise decrease quantity
    let items: CartItem[];
    if (exist.qty === 1) {
      items = (cart.items as CartItem[]).filter(
        (x) => x.productId !== productId
      );
    } else {
      items = (cart.items as CartItem[]).map((x) =>
        x.productId === productId ? { ...x, qty: x.qty - 1 } : x
      );
    }

    await saveCart({ sessionCartId, existingCartId: cart.id, items });

    // Revalidate localized product page
    revalidatePath(`/product/${product.slug}`);

    return {
      success: true,
      message:
        items.find((x) => x.productId === productId)
          ? await msg('updated', displayName)
          : await msg('removed', displayName),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}