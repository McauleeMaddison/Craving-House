-- Add per-customer loyalty card token and redemption log
ALTER TABLE "LoyaltyAccount" ADD COLUMN "cardToken" TEXT;
CREATE UNIQUE INDEX "LoyaltyAccount_cardToken_key" ON "LoyaltyAccount"("cardToken");

CREATE TABLE "LoyaltyRedemption" (
  "id" TEXT NOT NULL,
  "loyaltyAccountId" TEXT NOT NULL,
  "orderId" TEXT,
  "idempotencyKey" TEXT,
  "createdByStaffId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoyaltyRedemption_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LoyaltyRedemption_idempotencyKey_key" ON "LoyaltyRedemption"("idempotencyKey");
CREATE INDEX "LoyaltyRedemption_loyaltyAccountId_createdAt_idx" ON "LoyaltyRedemption"("loyaltyAccountId", "createdAt");

ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_loyaltyAccountId_fkey" FOREIGN KEY ("loyaltyAccountId") REFERENCES "LoyaltyAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LoyaltyRedemption" ADD CONSTRAINT "LoyaltyRedemption_createdByStaffId_fkey" FOREIGN KEY ("createdByStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

