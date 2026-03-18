-- Add billing and role fields to User
ALTER TABLE "User" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "User" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionStatus" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN "stripeSubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "User" ADD COLUMN "creditsPerMonth" INTEGER NOT NULL DEFAULT 3;
ALTER TABLE "User" ADD COLUMN "lastCreditReset" TIMESTAMP(3) NOT NULL DEFAULT NOW();

-- Set default credits for existing users (3 free credits)
-- (existing users will keep their audits, just get 3 free credits)

-- Add missing indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_subscriptionStatus_idx" ON "User"("subscriptionStatus");
