-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "sortOrder" INTEGER,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductImage_productId_sortOrder_key" ON "ProductImage"("productId", "sortOrder");

-- AddForeignKey
ALTER TABLE "ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_sortOrder_range"
CHECK ("sortOrder" IS NULL OR ("sortOrder" >= 1 AND "sortOrder" <= 4));

-- Enforce max 4 images per product
CREATE OR REPLACE FUNCTION enforce_max_product_images() RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM "ProductImage" WHERE "productId" = NEW."productId") >= 4 THEN
    RAISE EXCEPTION 'A product cannot have more than 4 images';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_image_max_4_trigger
BEFORE INSERT ON "ProductImage"
FOR EACH ROW
EXECUTE FUNCTION enforce_max_product_images();
