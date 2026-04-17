-- Harden order traffic for concurrent public and staff use.
ALTER TABLE "Order" ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Order_clientRequestId_key" ON "Order"("clientRequestId");
CREATE INDEX "Product_available_createdAt_idx" ON "Product"("available", "createdAt");
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");
CREATE INDEX "Order_status_paymentStatus_createdAt_idx" ON "Order"("status", "paymentStatus", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
