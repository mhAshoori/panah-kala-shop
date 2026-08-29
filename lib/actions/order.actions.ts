'use server';

import { formatError } from '../utils';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';
import { insertOrderSchema } from '../validator';
import { PAGE_SIZE } from '../constants';
import { prisma } from '@/db/prisma';
import { CartItem, Order } from '@/types';
import { sendOrderReceipt } from '../email/order-receipt';
import { getValidUserId } from '../auth-helpers';
import { canPayCashOnDelivery } from './product.actions';
import { withActionMessage } from '../action-messages';

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
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Worst-case guard: stock may have changed since the item was added.
      // Re-check every product inside the transaction to prevent overselling
      // and to skip items whose product was deleted.
      const items = cart.items as CartItem[];
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
        if (product.stock < item.qty) {
          throw new Error(await withActionMessage('notEnoughStock'));
        }
      }

      // Create order
      const insertedOrder = await tx.order.create({ data: order });

      // Create order items + decrement stock
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            name: item.name,
            slug: item.slug,
            image: item.image,
            orderId: insertedOrder.id,
          },
        });
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      // Clear the cart
      await tx.cart.update({
        where: { id: cart.id },
        data: {
          items: [],
          totalPrice: 0,
          shippingPrice: 0,
          taxPrice: 0,
          itemsPrice: 0,
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

// Get a single order by ID (with items + user)
export async function getOrderById(orderId: string) {
  const data = await prisma.order.findFirst({
    where: { id: orderId },
    include: {
      orderItems: true,
      user: { select: { name: true, email: true } },
    },
  });
  if (!data) return null;
  return JSON.parse(JSON.stringify(data));
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