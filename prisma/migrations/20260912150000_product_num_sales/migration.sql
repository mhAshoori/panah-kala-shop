-- Real bestseller tracking: paid order line-items bump Product.numSales
ALTER TABLE "Product" ADD COLUMN "numSales" INTEGER NOT NULL DEFAULT 0;

-- Backfill from historical PAID orders
UPDATE "Product" p SET "numSales" = s.cnt
FROM (
  SELECT oi."productId", SUM(oi.qty)::int AS cnt
  FROM "OrderItem" oi
  JOIN "Order" o ON o.id = oi."orderId"
  WHERE o."isPaid" = true
  GROUP BY oi."productId"
) AS s
WHERE p.id = s."productId";

CREATE INDEX "product_numSales_idx" ON "Product"("numSales");
