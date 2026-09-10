-- Shipped order state (paid → shipped → delivered)
ALTER TABLE "Order" ADD COLUMN "shippedAt" TIMESTAMP(6);
