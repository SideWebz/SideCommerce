-- Add Mollie payment fields to Order
ALTER TABLE "Order" ADD COLUMN     "molliePaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'pending';

-- Index for fast webhook lookups by Mollie payment ID
CREATE INDEX "Order_molliePaymentId_idx" ON "Order"("molliePaymentId");

-- Grandfather existing orders that were placed before Mollie integration:
-- 'created'        → status='confirmed', paymentStatus='paid'  (already accepted, treat as paid)
-- other statuses   → paymentStatus='paid'  (packaging / ready_to_ship / shipped are past payment)
UPDATE "Order" SET "status" = 'confirmed', "paymentStatus" = 'paid' WHERE "status" = 'created';
UPDATE "Order" SET "paymentStatus" = 'paid' WHERE "status" IN ('packaging', 'ready_to_ship', 'shipped');
