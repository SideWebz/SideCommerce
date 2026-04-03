-- Add optional favicon path to stores
ALTER TABLE "Store"
ADD COLUMN "faviconPath" TEXT;
