-- Homepage block ordering: storefront renders blocks by position (lower first)
ALTER TABLE "HomeBlock" ADD COLUMN "position" INTEGER;

-- Review moderation + verified-purchase trust signal
ALTER TABLE "Review" ADD COLUMN "isApproved" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Review" ADD COLUMN "verified" BOOLEAN NOT NULL DEFAULT false;

-- "My reviews" page + per-user moderation lookups
CREATE INDEX "reviews_userId_idx" ON "Review"("userId");

-- Listing-page scalability: storefront/admin lists sort + filter on these
CREATE INDEX "product_createdAt_idx" ON "Product"("createdAt");
CREATE INDEX "product_price_idx" ON "Product"("price");
CREATE INDEX "product_isFeatured_idx" ON "Product"("isFeatured");

-- Admin dashboard + order tables + per-user order history
CREATE INDEX "order_createdAt_idx" ON "Order"("createdAt");
CREATE INDEX "order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
