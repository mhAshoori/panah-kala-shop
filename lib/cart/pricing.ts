import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
} from '../constants';
import { round2 } from '../utils';

// Minimal cart-item shape this calculator needs
type PricedItem = {
  price: string | number;
  qty: number;
};

// Calculate cart prices based on items (Toman, two-decimal strings for Prisma)
export const calcPrice = (items: PricedItem[]) => {
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
