-- CreateTable
CREATE TABLE "ProductLink" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "linkedProductId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,

    CONSTRAINT "ProductLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductLink_productId_idx" ON "ProductLink"("productId");

-- CreateIndex
CREATE INDEX "ProductLink_linkedProductId_idx" ON "ProductLink"("linkedProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductLink_productId_linkedProductId_relationType_key" ON "ProductLink"("productId", "linkedProductId", "relationType");

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductLink" ADD CONSTRAINT "ProductLink_linkedProductId_fkey" FOREIGN KEY ("linkedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddConstraint
ALTER TABLE "ProductLink"
ADD CONSTRAINT "ProductLink_no_self_link"
CHECK ("productId" <> "linkedProductId");
