-- AddUniqueConstraint: prevent duplicate earnings from race conditions
-- The (walletId, downloadId) pair uniquely identifies one earning per dedup key

CREATE UNIQUE INDEX "creator_earnings_walletId_downloadId_key"
ON "creator_earnings"("walletId", "downloadId")
WHERE "downloadId" IS NOT NULL;
