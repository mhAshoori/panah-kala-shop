'use server';

import { formatError } from '../utils';
import { auth } from '@/auth';
import { getMyCart } from './cart.actions';
import { getUserById } from './user.actions';
import { insertOrderSchema } from '../validator';
import { PAGE_SIZE } from '../constants';
import { prisma } from '@/db/prisma';
import { CartItem, Order } from '@/types';
import { sendOrderReceipt } from '../email/order-receipt';

// Create an order from the current cart (transactional, decrements stock)
export async function createOrder() {
  try {
    const session = await auth();
    if (!session) throw new Error('User is not authenticated');

    const cart = await getMyCart();
    const userId = session?.user?.id;
    if (!userId) throw new Error('User not found');

    const user = await getUserById(userId);

    if (!cart || cart.items.length === 0) {
      return { success: false, message: 'Your cart is empty', redirectTo: '/cart' };
    }
    if (!user.address) {
      return {
        success: false,
        message: 'Please add a shipping address',
        redirectTo: '/shipping-address',
      };
    }
    if (!user.paymentMethod) {
      return {
        success: false,
        message: 'Please select a payment method',
        redirectTo: '/payment-method',
      };
    }

    const order = insertOrderSchema.parse({
      userId: user.id,
      shippingAddress: user.address,
      paymentMethod: user.paymentMethod,
      itemsPrice: cart.itemsPrice,
      shippingPrice: cart.shippingPrice,
      taxPrice: cart.taxPrice,
      totalPrice: cart.totalPrice,
    });

    const insertedOrderId = await prisma.$transaction(async (tx) => {
      // Create order
      const insertedOrder = await tx.order.create({ data: order });

      // Create order items + decrement stock
      for (const item of cart.items as CartItem[]) {
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

    if (!insertedOrderId) throw new Error('Order not created');

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
      message: 'Order successfully created',
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