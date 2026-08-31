-- Order records the applied coupon for bookkeeping
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0;
