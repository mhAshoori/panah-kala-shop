import { z } from 'zod';

import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
} from '../constants';
import { round2 } from '../utils';

// Calculate cart prices based on items (Toman, two-decimal strings for Prisma)
export const calcPrice = (items: z.infer<typeof cartItemPricesSchema>[]) => {
  const itemsPrice = round2(
    items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
  );
  const shippingPrice = round2(
    itemsPrice >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FLAT_RATE
  );
  const taxPrice = round2(TAX_RATE * itemsPrice);
  const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};

// Local schema to keep this module dependency-free (shape of a cart item)
const cartItemPricesSchema = z.object({
  price: z.union([z.string(), z.number()]),
  qty: z.number(),
});
