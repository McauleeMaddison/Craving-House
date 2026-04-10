-- Persist Stripe customer IDs for returning signed-in customers
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
ALTER TABLE "Order" ADD COLUMN "stripeCustomerId" TEXT;
CREATE INDEX "Order_stripeCustomerId_idx" ON "Order"("stripeCustomerId");
