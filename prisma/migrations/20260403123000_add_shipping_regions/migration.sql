-- Add shipping regions per store
CREATE TABLE "ShippingRegion" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "shippingCost" DECIMAL(10,2) NOT NULL,
    "freeShippingFrom" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRegion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ShippingRegion_storeId_idx" ON "ShippingRegion"("storeId");
CREATE UNIQUE INDEX "ShippingRegion_storeId_country_key" ON "ShippingRegion"("storeId", "country");

ALTER TABLE "ShippingRegion"
ADD CONSTRAINT "ShippingRegion_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
