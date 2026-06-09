-- Backfill tables/columns that existed in the Prisma schema but were missing
-- from the historical migration chain. IF NOT EXISTS keeps this safe for
-- local databases where these objects were created manually.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankAccount" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isTwoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emailVerifyToken" TEXT;

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'sfx';

ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "bpm" INTEGER;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "musicalKey" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "hasStems" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "sound_effects_isPublished_categoryId_idx" ON "sound_effects"("isPublished", "categoryId");
CREATE INDEX IF NOT EXISTS "sound_effects_authorId_idx" ON "sound_effects"("authorId");
CREATE INDEX IF NOT EXISTS "sound_effects_accessLevel_idx" ON "sound_effects"("accessLevel");
CREATE INDEX IF NOT EXISTS "sound_effects_isPublished_accessLevel_idx" ON "sound_effects"("isPublished", "accessLevel");
CREATE INDEX IF NOT EXISTS "downloads_userId_idx" ON "downloads"("userId");
CREATE INDEX IF NOT EXISTS "downloads_soundEffectId_idx" ON "downloads"("soundEffectId");
CREATE INDEX IF NOT EXISTS "orders_userId_idx" ON "orders"("userId");
CREATE INDEX IF NOT EXISTS "orders_status_idx" ON "orders"("status");

CREATE TABLE IF NOT EXISTS "creator_wallets" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "balance" INTEGER NOT NULL DEFAULT 0,
  "totalEarned" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "creator_wallets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "creator_wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "creator_wallets_userId_key" ON "creator_wallets"("userId");

CREATE TABLE IF NOT EXISTS "creator_earnings" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "soundId" TEXT NOT NULL,
  "downloadId" TEXT,
  "amountRp" INTEGER NOT NULL,
  "poolPercent" INTEGER NOT NULL DEFAULT 25,
  "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "creator_earnings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "creator_earnings_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creator_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "creator_earnings_walletId_idx" ON "creator_earnings"("walletId");

CREATE TABLE IF NOT EXISTS "withdrawal_requests" (
  "id" TEXT NOT NULL,
  "walletId" TEXT NOT NULL,
  "amountRp" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "bankName" TEXT,
  "accountNo" TEXT,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "withdrawal_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "withdrawal_requests_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "creator_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ratings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "soundId" TEXT NOT NULL,
  "score" INTEGER NOT NULL,
  "reviewText" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ratings_soundId_fkey" FOREIGN KEY ("soundId") REFERENCES "sound_effects"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "ratings_userId_soundId_key" ON "ratings"("userId", "soundId");
