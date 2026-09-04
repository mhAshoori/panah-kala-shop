-- Product physical properties
ALTER TABLE "Product" ADD COLUMN "lengthCm" DECIMAL(8,2);
ALTER TABLE "Product" ADD COLUMN "widthCm" DECIMAL(8,2);
ALTER TABLE "Product" ADD COLUMN "heightCm" DECIMAL(8,2);
ALTER TABLE "Product" ADD COLUMN "weightG" DECIMAL(10,2);

-- Product options (e.g. color) and their selectable values
CREATE TABLE "ProductOption" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "nameFa" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOption_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductOptionValue" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "optionId" UUID NOT NULL,
    "value" TEXT NOT NULL,
    "valueFa" TEXT NOT NULL,
    "hex" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductOptionValue_pkey" PRIMARY KEY ("id")
);

-- A purchasable combination of option values with its own price/stock
CREATE TABLE "ProductVariant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "compareAtPrice" DECIMAL(12,2),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB NOT NULL,
    "image" TEXT,

    CONSTRAINT "ProductVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "productOptions_productId_name_key" ON "ProductOption"("productId", "name");
CREATE INDEX "productOptions_productId_idx" ON "ProductOption"("productId");
CREATE UNIQUE INDEX "productOptionValues_optionId_value_key" ON "ProductOptionValue"("optionId", "value");
CREATE UNIQUE INDEX "productVariant_key_key" ON "ProductVariant"("key");
CREATE INDEX "productVariants_productId_idx" ON "ProductVariant"("productId");

ALTER TABLE "ProductOption" ADD CONSTRAINT "productOptions_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ProductOptionValue" ADD CONSTRAINT "productOptionValues_optionId_productOption_id_fk" FOREIGN KEY ("optionId") REFERENCES "ProductOption"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "ProductVariant" ADD CONSTRAINT "productVariants_productId_product_id_fk" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- OrderItem: surrogate PK (same product with 2 variants in one order must fit)
ALTER TABLE "OrderItem" ADD COLUMN "id" UUID DEFAULT gen_random_uuid();
UPDATE "OrderItem" SET "id" = gen_random_uuid();
ALTER TABLE "OrderItem" DROP CONSTRAINT "orderItems_orderId_productId_pk";
ALTER TABLE "OrderItem" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id");

-- Variant reference on order items (historical rows survive variant deletion)
ALTER TABLE "OrderItem" ADD COLUMN "variantId" UUID;
ALTER TABLE "OrderItem" ADD COLUMN "variantLabel" TEXT;
ALTER TABLE "OrderItem" ADD CONSTRAINT "orderItems_variantId_productVariant_id_fk" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
CREATE INDEX "orderItems_orderId_idx" ON "OrderItem"("orderId");
