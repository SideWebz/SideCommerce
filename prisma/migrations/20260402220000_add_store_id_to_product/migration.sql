-- AlterTable: add optional storeId to Product
ALTER TABLE "Product" ADD COLUMN "storeId" TEXT;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");
