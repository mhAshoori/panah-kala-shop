-- Postal tracking code ("کد رهگیری"), 20-24 digits, set by admin on shipping
ALTER TABLE "Order" ADD COLUMN "trackCode" TEXT;
