import {
  getFreeShippingThreshold,
  getShippingFee,
  getTaxRate,
} from '../store-config';

// Minimal cart-item shape this calculator needs
type PricedItem = {
  price: string | number;
  qty: number;
};

// Calculate cart prices based on items (Toman, whole numbers for Int columns).
// `couponDiscount` (Toman) reduces the taxable subtotal when a coupon applies.
// Rates come from admin-managed settings (lib/store-config) with constants as
// fallbacks. The tax RATE is fractional (0.09), so taxPrice is rounded; every
// other value is already whole Toman and needs no rounding.
export const calcPrice = async (items: PricedItem[], couponDiscount = 0) => {
  const grossItemsPrice = items.reduce(
    (acc, item) => acc + Number(item.price) * item.qty,
    0
  );
  const itemsPrice = Math.max(
    0,
    grossItemsPrice - Math.min(couponDiscount, grossItemsPrice)
  );
  const [shippingFee, freeThreshold, taxRate] = await Promise.all([
    getShippingFee(),
    getFreeShippingThreshold(),
    getTaxRate(),
  ]);
  const shippingPrice = itemsPrice >= freeThreshold ? 0 : Math.round(shippingFee);
  const taxPrice = Math.round(taxRate * itemsPrice);
  const totalPrice = itemsPrice + shippingPrice + taxPrice;

  return {
    itemsPrice,
    shippingPrice,
    taxPrice,
    totalPrice,
  };
};
