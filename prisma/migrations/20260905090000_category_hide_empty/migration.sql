-- Auto-hide empty categories on the storefront (admin can disable per category)
ALTER TABLE "Category" ADD COLUMN "hideEmpty" BOOLEAN NOT NULL DEFAULT true;
