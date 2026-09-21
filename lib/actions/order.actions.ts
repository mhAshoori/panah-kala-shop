'use server';

import { formatError } from '../utils';
import { revalidatePath } from 'next/cache';
import { getLocale } from 'next-intl/server';
import { auth } from '@/auth';
import { getMyCart, addItemToCart } from './cart.actions';
import { getUserById } from './user.actions';
import { insertOrderSchema } from '../validator';
import { LOW_STOCK_THRESHOLD, PAGE_SIZE } from '../constants';
import { prisma } from '@/db/prisma';
import { CartItem, Order } from '@/types';
import { sendOrderReceipt } from '../email/order-receipt';
import { notifyAdminNewOrder } from '../notifications';
import { recordStockEventIfLow } from '../stock-events';
import { getValidUserId } from '../auth-helpers';
import { canPayCashOnDelivery } from './product.actions';
import { withActionMessage } from '../action-messages';
import { checkCouponUsable, couponDiscount, type CouponInput } from '../coupon';
import { calcPrice } from '../cart/pricing';

// Create an order from the current cart (transactional, decrements stock)
export async function createOrder() {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error('Your session has expired — please sign in again');

    const cart = await getMyCart();

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return {
        success: false,
        message: await withActionMessage('cartEmpty'),
        redirectTo: '/cart',
      };
    }
    if (!user.paymentMethod) {
      return {
        success: false,
        message: await withActionMessage('selectPaymentMethod'),
        redirectTo: '/payment-method',
      };
    }

    // COD requires every product in the cart to opt in
    if (user.paymentMethod === 'cod') {
      const codAllowed = await canPayCashOnDelivery([
        ...new Set((cart.items as CartItem[]).map((i) => i.productId)),
      ]);
      if (!codAllowed) {
        return {
          success: false,
          message: await withActionMessage('codNotAvailable'),
          redirectTo: '/payment-method',
        };
      }
    }

    // Worst-case: the user's default shipping address
    const defaultAddress = await prisma.address.findFirst({
      where: { userId, isDefault: true },
    });
    if (!defaultAddress) {
      return {
        success: false,
        message: await withActionMessage('addShippingAddress'),
        redirectTo: '/shipping-address',
      };
    }

    let itemsPrice = cart.itemsPrice;
    let taxPrice = cart.taxPrice;
    let totalPrice = cart.totalPrice;
    let shippingPrice = cart.shippingPrice;

    // Server is the price authority: re-derive every item's price from the
    // DB. Cart rows are written by addItemToCart (which already overwrites
    // client prices), but stale or tampered cart rows must not survive here.
    const pricedItems: CartItem[] = [];
    for (const item of cart.items as CartItem[]) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId },
        select: { price: true },
      });
      if (!product) continue;
      let price = product.price.toString();
      if (item.variantId) {
        const variant = await prisma.productVariant.findFirst({
          where: { id: item.variantId, productId: item.productId },
          select: { price: true },
        });
        if (variant) price = variant.price.toString();
      }
      pricedItems.push({ ...item, price });
    }
    if (pricedItems.length === 0) {
      throw new Error(await withActionMessage('cartEmpty'));
    }

    const gross = pricedItems.reduce(
      (acc, i) => acc + Number(i.price) * i.qty,
      0
    );
    let couponCode: string | null = null;
    let couponDiscountAmount = 0;

    if (cart.couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: cart.couponCode },
      });
      if (
        coupon &&
        checkCouponUsable(coupon as unknown as CouponInput, gross).ok
      ) {
        couponCode = coupon.code;
        couponDiscountAmount = couponDiscount(
          coupon.type,
          coupon.value.toString(),
          gross
        );
      }
    }

    // Totals always computed server-side from DB prices (+ validated coupon)
    const totals = await calcPrice(pricedItems, couponDiscountAmount);
    itemsPrice = totals.itemsPrice;
    taxPrice = totals.taxPrice;
    shippingPrice = totals.shippingPrice;
    totalPrice = totals.totalPrice;

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: {
        fullName: defaultAddress.fullName,
        streetAddress: defaultAddress.streetAddress,
        city: defaultAddress.city,
        province: defaultAddress.province,
        postalCode: defaultAddress.postalCode,
        phone: defaultAddress.phone,
      },
      paymentMethod: user.paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });

    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Worst-case guard: stock may have changed since the item was added.
      // Re-check every product inside the transaction to prevent overselling
      // and to skip items whose product was deleted. Variant lines check the
      // variant's own stock (and that it still belongs to the product).
      const items = pricedItems;
      for (const item of items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId },
          select: { stock: true },
        });
        if (!product) {
          throw new Error(
            await withActionMessage('productNoLongerAvailable', {
              name: item.name,
            })
          );
        }
        if (item.variantId) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true, productId: true },
          });
          if (!variant || variant.productId !== item.productId) {
            throw new Error(
              await withActionMessage('productNoLongerAvailable', {
                name: item.name,
              })
            );
          }
          if (variant.stock < item.qty) {
            throw new Error(await withActionMessage('notEnoughStock'));
          }
        } else if (product.stock < item.qty) {
          throw new Error(await withActionMessage('notEnoughStock'));
        }
      }

      // Create order (with coupon bookkeeping when one applied)
      const insertedOrder = await tx.order.create({
        data: {
          ...order,
          couponCode,
          couponDiscount: couponDiscountAmount.toFixed(2),
        },
      });

      // Count the coupon usage atomically with the order
      if (couponCode) {
        await tx.coupon.update({
          where: { code: couponCode },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Create order items + decrement stock (variant first, then parent)
      const locale = await getLocale();
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            productId: item.productId,
            variantId: item.variantId ?? null,
            variantLabel: item.variantLabel ?? null,
            qty: item.qty,
            price: item.price,
            name:
              locale === 'fa' && item.nameFa ? item.nameFa : item.name,
            slug: item.slug,
            image: item.image,
            orderId: insertedOrder.id,
          },
        });
        if (item.variantId) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.qty } },
          });
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      // Clear the cart (coupon removed with it)
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          totalPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
          itemsPrice: 0,
          couponCode: null,
          couponDiscount: 0,
        },
      });

      return insertedOrder.id;
    });

    if (!insertedOrderId) throw new Error(await withActionMessage('orderNotFound'));

    // The cart is now empty — refresh the header badge on every page
    revalidatePath('/', 'layout');

    // Fire-and-forget order receipt email (never breaks checkout)
    const insertedOrder = await prisma.order.findFirst({
      where: { id: insertedOrderId },
      include: {
        orderItems: true,
        user: { select: { name: true, email: true } },
      },
    });
    if (insertedOrder) {
      await sendOrderReceipt(
        JSON.parse(JSON.stringify(insertedOrder)) as Order
      );
      await notifyAdminNewOrder(
        JSON.parse(JSON.stringify(insertedOrder)) as Order
      );

      // Stock fell low on any of these items? One bounded read + ≤1 insert.
      const dropped = await prisma.product.findMany({
        where: { id: { in: pricedItems.map((i) => i.productId) }, stock: { lte: LOW_STOCK_THRESHOLD } },
        select: { id: true, name: true, stock: true },
      });
      for (const p of dropped) recordStockEventIfLow(p);
    }

    return {
      success: true,
      message: await withActionMessage('orderCreated'),
      redirectTo: `/order/${insertedOrderId}`,
    };
  } catch (error) {
    return { success: false, message: formatError(error) };
  }
}

// Get a single order by ID (with items + user). Server actions are public
// RPC — only the owner or an admin may read an order. (The ZarinPal
// callback flow calls this internally with the server-resolved order id;
// the caller there only receives redirect/success, never order data.)
export async function getOrderById(orderId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const isAdmin = session?.user?.role === 'admin';

  const data = await prisma.order.findFirst({
    where: isAdmin || !userId ? { id: orderId } : { id: orderId, userId },
    include: {
      orderItems: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
}

// Re-add every item of a past order to the user's cart (Digikala-style
// reorder). Skips out-of-stock lines; reports what happened.
export async function reorderOrder(
  orderId: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userId = await getValidUserId();
    if (!userId) throw new Error('Your session has expired — please sign in again');

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { orderItems: true },
    });
    if (!order) throw new Error(await withActionMessage('orderNotFound'));
    if (order.orderItems.length === 0)
      throw new Error(await withActionMessage('cartEmpty'));

    let added = 0;
    for (const item of order.orderItems) {
      const product = await prisma.product.findFirst({
        where: { id: item.productId },
      });
      if (!product) continue;

      // Current price wins; stock checked on the variant or the product
      let price = product.price.toString();
      let stock = product.stock;
      if (item.variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: item.variantId },
        });
        if (!variant || variant.productId !== product.id) continue;
        price = variant.price.toString();
        stock = variant.stock;
      }
      if (stock < 1) continue;

      const res = await addItemToCart({
        productId: product.id,
        variantId: item.variantId ?? undefined,
        variantLabel: item.variantLabel ?? undefined,
        name: product.name,
        nameFa: product.nameFa,
        slug: product.slug,
        image: item.image,
        price,
        qty: 1,
      });
      if (res.success) added++;
    }

    if (added === 0) {
      return {
        success: false,
        message: await withActionMessage('nothingToReorder'),
      };
    }
    return { success: true, message: await withActionMessage('reordered') };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Error',
    };
  }
}

// Get the signed-in user's orders with pagination
export async function getMyOrders({
  limit = PAGE_SIZE,
  page,
}: {
  limit?: number;
  page: number;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error('User is not authenticated');

  const data = await prisma.order.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: (page - 1) * limit,
  });

  const dataCount = await prisma.order.count({
    where: { userId: session.user.id },
  });

  return {
    data: JSON.parse(JSON.stringify(data)) as Order[],
    totalPages: Math.ceil(dataCount / limit),
  };
}