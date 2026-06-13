UPDATE "order_items"
SET "licenseType" = 'commercial'
WHERE "licenseType" IN ('sync', 'broadcast');

UPDATE "audio_assets"
SET "licenseType" = 'commercial'
WHERE "licenseType" IN ('sync', 'broadcast', 'both');
