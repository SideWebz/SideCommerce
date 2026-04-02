ALTER TABLE "User"
ADD COLUMN "name" TEXT NOT NULL,
ADD COLUMN "phone" TEXT NOT NULL;

CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");
