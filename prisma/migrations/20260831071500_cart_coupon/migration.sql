-- Cart keeps the applied coupon code and its computed discount
ALTER TABLE "Cart" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Cart" ADD COLUMN "couponDiscount" DECIMAL(12,2) NOT NULL DEFAULT 0;
