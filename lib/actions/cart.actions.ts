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
import {
  checkCouponUsable,
  couponDiscount,
  normalizeCouponCode,
  type CouponInput,
} from '../coupon';
import { withActionMessage } from '../action-messages';
import type { CartItem } from '@/types';
import type { ActionState } from '@/types';

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
    couponCode: cart.couponCode ?? null,
    // Defensive: rows in environments where the coupon migration has not
    // run yet will not carry the field at all.
    couponDiscount: cart.couponDiscount?.toString() ?? '0',
  });
}

// Insert or update the cart with the given items.
// When updating a cart that has an applied coupon, the coupon discount is
// recomputed against the new subtotal (min-total no longer re-checked here —
// checkout re-validates the coupon before creating the order).
async function saveCart(params: {
  sessionCartId: string;
  userId?: string;
  existingCartId?: string;
  items: CartItem[];
}) {
  const { sessionCartId, userId, existingCartId, items } = params;

  // Preserve + recompute an applied coupon on the updated subtotal
  let couponCode: string | null = null;
  let couponDiscountValue = 0;
  if (existingCartId) {
    const existing = await prisma.cart.findUnique({
      where: { id: existingCartId },
      select: { couponCode: true },
    });
    if (existing?.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: existing.couponCode },
      });
      if (coupon && coupon.isActive) {
        const gross = items.reduce(
          (acc, i) => acc + Number(i.price) * i.qty,
          0
        );
        couponCode = coupon.code;
        couponDiscountValue = couponDiscount(
          coupon.type,
          coupon.value.toString(),
          gross
        );
      }
    }
  }

  if (existingCartId) {
    await prisma.cart.update({
      where: { id: existingCartId },
      data: {
        items: items as unknown as Prisma.InputJsonValue[],
        ...calcPrice(items, couponDiscountValue),
        couponCode,
        couponDiscount: couponDiscountValue.toFixed(2),
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
    // Refresh the header cart badge everywhere
    revalidatePath('/', 'layout');

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

    // Get product (may be deleted — removal must always be possible)
    const product = await prisma.product.findFirst({
      where: { id: productId },
    });

    // Get user cart
    const cart = await getMyCart();
    if (!cart) throw new Error(await msg('cartNotFound'));

    // Check if cart has the item
    const exist = (cart.items as CartItem[]).find(
      (x) => x.productId === productId
    );
    if (!exist) throw new Error(await msg('itemNotFound'));

    const locale = await getLocale();
    const displayName = product
      ? locale === 'fa'
        ? product.nameFa
        : product.name
      : exist.name;

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

    // Revalidate localized product page (if the product still exists)
    if (product) {
      revalidatePath(`/product/${product.slug}`);
    }
    // Refresh the header cart badge everywhere
    revalidatePath('/', 'layout');

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
// ---------------------------------------------------------------------------
// Coupons
// ---------------------------------------------------------------------------

/**
 * Apply a coupon code to the current cart. Validates the coupon (active,
 * not expired, usage limit, min cart total), computes the discount, and
 * re-saves the cart totals with the discount subtracted from the subtotal.
 */
export async function applyCouponToCart(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const code = normalizeCouponCode((formData.get('code') as string) ?? '');
    if (!code) throw new Error(await withActionMessage('couponNotFound'));

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon) throw new Error(await withActionMessage('couponNotFound'));

    const cart = await getMyCart();
    if (!cart || (cart.items as CartItem[]).length === 0) {
      throw new Error(await withActionMessage('cartEmpty'));
    }

    const itemsPrice = Number(cart.itemsPrice);
    const usable = checkCouponUsable(coupon as unknown as CouponInput, itemsPrice);
    if (!usable.ok) {
      throw new Error(await withActionMessage(usable.error));
    }

    const discount = couponDiscount(coupon.type, coupon.value.toString(), itemsPrice);
    const totals = calcPrice(cart.items as CartItem[], discount);

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: code,
        couponDiscount: discount.toFixed(2),
        ...totals,
      },
    });

    revalidatePath('/cart');
    revalidatePath('/', 'layout');

    return {
      success: true,
      message: await withActionMessage('couponApplied', {
        name: code,
        amount: discount,
      }),
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

/** Remove the applied coupon from the cart and recalculate totals. */
export async function removeCouponFromCart(): Promise<ActionState> {
  try {
    const cart = await getMyCart();
    if (!cart) throw new Error(await msg('cartNotFound'));

    const totals = calcPrice(cart.items as CartItem[], 0);

    await prisma.cart.update({
      where: { id: cart.id },
      data: {
        couponCode: null,
        couponDiscount: 0,
        ...totals,
      },
    });

    revalidatePath('/cart');
    revalidatePath('/', 'layout');

    return { success: true, message: await withActionMessage('couponRemoved') };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}
