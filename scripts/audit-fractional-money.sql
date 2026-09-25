-- Pre-flight audit for 005-money-int-migration.
-- Every count MUST be 0 and the balance query MUST return no rows before the
-- numeric -> integer conversion. A non-zero result means a stored value would
-- be silently rounded, so the migration must not be applied until reconciled.
--
-- Run: npx prisma db execute --stdin --schema prisma/schema.prisma < scripts/audit-fractional-money.sql

SELECT 'Product.price' AS col, count(*) AS fractional FROM "Product" WHERE "price" <> trunc("price")
UNION ALL SELECT 'Product.compareAtPrice', count(*) FROM "Product" WHERE "compareAtPrice" <> trunc("compareAtPrice")
UNION ALL SELECT 'ProductVariant.price', count(*) FROM "ProductVariant" WHERE "price" <> trunc("price")
UNION ALL SELECT 'ProductVariant.compareAtPrice', count(*) FROM "ProductVariant" WHERE "compareAtPrice" <> trunc("compareAtPrice")
UNION ALL SELECT 'Cart.itemsPrice', count(*) FROM "Cart" WHERE "itemsPrice" <> trunc("itemsPrice")
UNION ALL SELECT 'Cart.shippingPrice', count(*) FROM "Cart" WHERE "shippingPrice" <> trunc("shippingPrice")
UNION ALL SELECT 'Cart.taxPrice', count(*) FROM "Cart" WHERE "taxPrice" <> trunc("taxPrice")
UNION ALL SELECT 'Cart.totalPrice', count(*) FROM "Cart" WHERE "totalPrice" <> trunc("totalPrice")
UNION ALL SELECT 'Cart.couponDiscount', count(*) FROM "Cart" WHERE "couponDiscount" <> trunc("couponDiscount")
UNION ALL SELECT 'Order.itemsPrice', count(*) FROM "Order" WHERE "itemsPrice" <> trunc("itemsPrice")
UNION ALL SELECT 'Order.shippingPrice', count(*) FROM "Order" WHERE "shippingPrice" <> trunc("shippingPrice")
UNION ALL SELECT 'Order.taxPrice', count(*) FROM "Order" WHERE "taxPrice" <> trunc("taxPrice")
UNION ALL SELECT 'Order.totalPrice', count(*) FROM "Order" WHERE "totalPrice" <> trunc("totalPrice")
UNION ALL SELECT 'Order.couponDiscount', count(*) FROM "Order" WHERE "couponDiscount" <> trunc("couponDiscount")
UNION ALL SELECT 'OrderItem.price', count(*) FROM "OrderItem" WHERE "price" <> trunc("price")
UNION ALL SELECT 'Coupon.value', count(*) FROM "Coupon" WHERE "value" <> trunc("value")
UNION ALL SELECT 'Coupon.minCartTotal', count(*) FROM "Coupon" WHERE "minCartTotal" <> trunc("minCartTotal");

-- Order totals must balance: OrderItem.price and Order.totalPrice are rounded by
-- separate ALTERs, so a mismatch here means the conversion would break SC-004.
SELECT o.id
FROM "Order" o
WHERE o."totalPrice" <> (
  COALESCE(SUM(i."price" * i.qty), 0) + o."shippingPrice" + o."taxPrice" - o."couponDiscount"
)
GROUP BY o.id, o."totalPrice", o."shippingPrice", o."taxPrice", o."couponDiscount";
