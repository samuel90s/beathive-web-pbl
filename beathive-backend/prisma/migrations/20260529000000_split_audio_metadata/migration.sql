-- Split product-specific audio metadata from the shared sound_effects asset table.

ALTER TABLE "categories" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'sfx';
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "bpm" INTEGER;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "mood" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "musicalKey" TEXT;
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "hasStems" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "sfx_metadata" (
  "soundId" TEXT NOT NULL,
  "subcategory" TEXT,

  CONSTRAINT "sfx_metadata_pkey" PRIMARY KEY ("soundId"),
  CONSTRAINT "sfx_metadata_soundId_fkey" FOREIGN KEY ("soundId") REFERENCES "sound_effects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "music_metadata" (
  "soundId" TEXT NOT NULL,
  "bpm" INTEGER,
  "mood" TEXT,
  "musicalKey" TEXT,
  "hasStems" BOOLEAN NOT NULL DEFAULT false,

  CONSTRAINT "music_metadata_pkey" PRIMARY KEY ("soundId"),
  CONSTRAINT "music_metadata_soundId_fkey" FOREIGN KEY ("soundId") REFERENCES "sound_effects"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "genres" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,

  CONSTRAINT "genres_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sound_genres" (
  "soundId" TEXT NOT NULL,
  "genreId" TEXT NOT NULL,

  CONSTRAINT "sound_genres_pkey" PRIMARY KEY ("soundId", "genreId"),
  CONSTRAINT "sound_genres_soundId_fkey" FOREIGN KEY ("soundId") REFERENCES "sound_effects"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "sound_genres_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "genres"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "genres_slug_key" ON "genres"("slug");
CREATE INDEX "music_metadata_mood_idx" ON "music_metadata"("mood");
CREATE INDEX "music_metadata_bpm_idx" ON "music_metadata"("bpm");
CREATE INDEX "sound_genres_genreId_idx" ON "sound_genres"("genreId");

INSERT INTO "music_metadata" ("soundId", "bpm", "mood", "musicalKey", "hasStems")
SELECT s."id", s."bpm", s."mood", s."musicalKey", s."hasStems"
FROM "sound_effects" s
JOIN "categories" c ON c."id" = s."categoryId"
WHERE c."type" = 'music'
ON CONFLICT ("soundId") DO NOTHING;

INSERT INTO "sfx_metadata" ("soundId")
SELECT s."id"
FROM "sound_effects" s
JOIN "categories" c ON c."id" = s."categoryId"
WHERE c."type" = 'sfx'
ON CONFLICT ("soundId") DO NOTHING;
