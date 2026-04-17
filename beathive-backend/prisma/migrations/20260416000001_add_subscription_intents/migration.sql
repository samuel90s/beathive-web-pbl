-- Migration: add subscription_intents table

CREATE TABLE "subscription_intents" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "planSlug" TEXT NOT NULL,
  "billingCycle" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscription_intents_orderId_key" ON "subscription_intents"("orderId");
