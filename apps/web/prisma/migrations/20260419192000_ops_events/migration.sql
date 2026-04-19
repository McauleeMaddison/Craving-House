CREATE TABLE "OpsEvent" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "action" TEXT,
    "message" TEXT NOT NULL,
    "details" JSONB,
    "requestId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OpsEvent_createdAt_idx" ON "OpsEvent"("createdAt");
CREATE INDEX "OpsEvent_category_createdAt_idx" ON "OpsEvent"("category", "createdAt");
CREATE INDEX "OpsEvent_severity_createdAt_idx" ON "OpsEvent"("severity", "createdAt");
CREATE INDEX "OpsEvent_userId_createdAt_idx" ON "OpsEvent"("userId", "createdAt");

ALTER TABLE "OpsEvent"
ADD CONSTRAINT "OpsEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
