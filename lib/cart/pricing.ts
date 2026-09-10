import {
  getFreeShippingThreshold,
  getShippingFee,
  getTaxRate,
} from '../store-config';
import { round2 } from '../utils';

// Minimal cart-item shape this calculator needs
type PricedItem = {
  price: string | number;
  qty: number;
};

// Calculate cart prices based on items (Toman, two-decimal strings for Prisma).
// `couponDiscount` (Toman) reduces the taxable subtotal when a coupon applies.
// Rates come from admin-managed settings (lib/store-config) with constants as
// fallbacks.
export const calcPrice = async (items: PricedItem[], couponDiscount = 0) => {
  const grossItemsPrice = round2(
    items.reduce((acc, item) => acc + Number(item.price) * item.qty, 0)
  );
  const itemsPrice = round2(
    Math.max(0, grossItemsPrice - Math.min(couponDiscount, grossItemsPrice))
  );
  const [shippingFee, freeThreshold, taxRate] = await Promise.all([
    getShippingFee(),
    getFreeShippingThreshold(),
    getTaxRate(),
  ]);
  const shippingPrice = round2(itemsPrice >= freeThreshold ? 0 : shippingFee);
  const taxPrice = round2(taxRate * itemsPrice);
  const totalPrice = round2(itemsPrice + shippingPrice + taxPrice);

  return {
    itemsPrice: itemsPrice.toFixed(2),
    shippingPrice: shippingPrice.toFixed(2),
    taxPrice: taxPrice.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
  };
};
