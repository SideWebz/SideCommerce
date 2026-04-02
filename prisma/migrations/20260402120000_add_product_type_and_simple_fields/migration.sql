-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('SIMPLE', 'VARIABLE');

-- AlterTable
ALTER TABLE "Product"
ADD COLUMN "productType" "ProductType" NOT NULL DEFAULT 'SIMPLE',
ADD COLUMN "price" DECIMAL(10,2),
ADD COLUMN "stock" INTEGER;

-- Backfill type from existing data: products with at least one variant are variable.
UPDATE "Product"
SET "productType" = 'VARIABLE'
WHERE EXISTS (
  SELECT 1
  FROM "Variant"
  WHERE "Variant"."productId" = "Product"."id"
);
