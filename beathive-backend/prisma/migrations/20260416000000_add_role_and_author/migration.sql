-- Migration: add role to users, authorId to sound_effects

-- Tambah kolom role ke tabel users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "bio" TEXT;

-- Tambah kolom authorId ke tabel sound_effects
ALTER TABLE "sound_effects" ADD COLUMN IF NOT EXISTS "authorId" TEXT;

-- Tambah foreign key constraint (opsional, tidak wajib untuk dev)
-- ALTER TABLE "sound_effects" ADD CONSTRAINT "sound_effects_authorId_fkey"
--   FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
