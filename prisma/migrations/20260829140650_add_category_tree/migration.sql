-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "parentId" UUID;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "subCategoryId" UUID,
ADD COLUMN     "subSubCategoryId" UUID;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "category_parentId_category_id_fk" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "product_subCategoryId_category_id_fk" FOREIGN KEY ("subCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "product_subSubCategoryId_category_id_fk" FOREIGN KEY ("subSubCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
