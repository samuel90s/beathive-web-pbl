const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_author_id ON sound_effects("authorId")',
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_access_level ON sound_effects("accessLevel")',
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_published_access ON sound_effects("isPublished", "accessLevel")',
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_download_count ON sound_effects("downloadCount")',
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_play_count ON sound_effects("playCount")',
    'CREATE INDEX IF NOT EXISTS idx_sound_effects_created_at ON sound_effects("createdAt")',
    'CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders("userId")',
    'CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)',
    'CREATE INDEX IF NOT EXISTS idx_orders_gateway_order_id ON orders("gatewayOrderId")',
    'CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads("userId")',
    'CREATE INDEX IF NOT EXISTS idx_downloads_sound_effect_id ON downloads("soundEffectId")',
    'CREATE INDEX IF NOT EXISTS idx_downloads_user_downloaded ON downloads("userId", "downloadedAt")',
    'CREATE INDEX IF NOT EXISTS idx_creator_earnings_wallet_earned ON creator_earnings("walletId", "earnedAt")',
    'CREATE INDEX IF NOT EXISTS idx_creator_earnings_download_id ON creator_earnings("downloadId")',
  ];

  for (const sql of indexes) {
    const name = sql.match(/idx_\w+/)?.[0] ?? 'unknown';
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✓', name);
    } catch (e) {
      console.log('skip', name, '-', e.message.split('\n')[0]);
    }
  }

  await prisma.$disconnect();
  console.log('\nDone.');
}

run().catch(e => { console.error(e); process.exit(1); });
