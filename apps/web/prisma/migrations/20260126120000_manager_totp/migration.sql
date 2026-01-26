-- Add optional manager TOTP MFA fields
ALTER TABLE "User" ADD COLUMN "mfaTotpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "mfaTotpEnabledAt" TIMESTAMP(3);

