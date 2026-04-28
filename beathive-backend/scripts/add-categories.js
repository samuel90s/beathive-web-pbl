// scripts/add-categories.js
// Add / update 20 standard categories (16 SFX + 4 Music)
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const categories = [
  // ─── SFX ─────────────────────────────────────────────────
  { name: 'Foley',             slug: 'foley',            icon: '👣', type: 'sfx'   },
  { name: 'Ambience',          slug: 'ambience',         icon: '🌊', type: 'sfx'   },
  { name: 'Soundscape',        slug: 'soundscape',       icon: '🏙️', type: 'sfx'   },
  { name: 'Nature & Weather',  slug: 'nature',           icon: '🌿', type: 'sfx'   },
  { name: 'Explosions',        slug: 'explosions',       icon: '💥', type: 'sfx'   },
  { name: 'Weapons & Combat',  slug: 'weapons',          icon: '⚔️', type: 'sfx'   },
  { name: 'Vehicles',          slug: 'vehicles',         icon: '🚗', type: 'sfx'   },
  { name: 'UI & Game',         slug: 'ui-game',          icon: '🎮', type: 'sfx'   },
  { name: 'Horror',            slug: 'horror',           icon: '👻', type: 'sfx'   },
  { name: 'Human & Crowd',     slug: 'human',            icon: '👥', type: 'sfx'   },
  { name: 'Animals',           slug: 'animals',          icon: '🐾', type: 'sfx'   },
  { name: 'Electronic & Sci-Fi', slug: 'electronic',    icon: '⚡', type: 'sfx'   },
  { name: 'Comedy & Cartoon',  slug: 'comedy',           icon: '😂', type: 'sfx'   },
  { name: 'Magic & Fantasy',   slug: 'magic',            icon: '✨', type: 'sfx'   },
  { name: 'Sports & Action',   slug: 'sports',           icon: '⚡', type: 'sfx'   },
  { name: 'Industrial',        slug: 'industrial',       icon: '⚙️', type: 'sfx'   },
  // ─── Music ───────────────────────────────────────────────
  { name: 'Sound Scoring',     slug: 'sound-scoring',    icon: '🎬', type: 'music' },
  { name: 'Cinematic',         slug: 'cinematic',        icon: '🎥', type: 'music' },
  { name: 'Electronic Music',  slug: 'electronic-music', icon: '🎛️', type: 'music' },
  { name: 'Acoustic',          slug: 'acoustic',         icon: '🎸', type: 'music' },
];

async function main() {
  console.log('Adding 20 categories...\n');
  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon, type: cat.type },
      create: cat,
    });
    console.log(`  ✓ [${cat.type.toUpperCase()}] ${cat.name}`);
  }
  console.log('\n✅ Done! 20 categories ready.');
}

main()
  .catch(e => { console.error('Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
