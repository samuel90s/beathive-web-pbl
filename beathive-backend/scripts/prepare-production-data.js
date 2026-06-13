const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIRMATION = 'RESET_FOR_DEPLOY';

const activityCounts = async (client) => ({
  users: await client.user.count(),
  plans: await client.plan.count(),
  subscriptions: await client.subscription.count(),
  subscriptionIntents: await client.subscriptionIntent.count(),
  categories: await client.category.count(),
  tags: await client.tag.count(),
  genres: await client.genre.count(),
  audioAssets: await client.audioAsset.count(),
  orders: await client.order.count(),
  orderItems: await client.orderItem.count(),
  invoices: await client.invoice.count(),
  downloads: await client.download.count(),
  wishlists: await client.wishlist.count(),
  ratings: await client.rating.count(),
  wallets: await client.creatorWallet.count(),
  earnings: await client.creatorEarning.count(),
  withdrawals: await client.withdrawalRequest.count(),
});

async function clearDirectoryContents(directory, allowedRoot) {
  const resolvedRoot = path.resolve(allowedRoot);
  const resolvedDirectory = path.resolve(directory);
  const relative = path.relative(resolvedRoot, resolvedDirectory);

  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Path cleanup tidak aman: ${resolvedDirectory}`);
  }

  let entries;
  try {
    entries = await fs.readdir(resolvedDirectory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return 0;
    throw error;
  }

  let removed = 0;
  for (const entry of entries) {
    if (entry.name === '.gitkeep') continue;
    await fs.rm(path.join(resolvedDirectory, entry.name), {
      recursive: true,
      force: true,
    });
    removed += 1;
  }
  return removed;
}

async function clearLocalAudioFiles() {
  const uploadsRoot = path.resolve(process.cwd(), 'uploads');
  const audioDirectories = ['sounds', 'previews', 'sfx', 'music', 'licenses'];
  let removed = 0;

  for (const directory of audioDirectories) {
    removed += await clearDirectoryContents(
      path.join(uploadsRoot, directory),
      uploadsRoot,
    );
  }

  return removed;
}

async function main() {
  const before = await activityCounts(prisma);
  console.table(before);

  if (process.argv.includes('--dry-run')) {
    console.log('Dry run selesai. Tidak ada data yang diubah.');
    return;
  }

  if (process.env.CONFIRM_CLEANUP !== CONFIRMATION) {
    throw new Error(
      `Cleanup dibatalkan. Set CONFIRM_CLEANUP=${CONFIRMATION} untuk melanjutkan.`,
    );
  }

  await prisma.$transaction(
    async (tx) => {
      const freePlan = await tx.plan.findUnique({ where: { slug: 'free' } });
      if (!freePlan) {
        throw new Error('Plan "free" tidak ditemukan. Jalankan seed baseline dulu.');
      }

      const users = await tx.user.findMany({ select: { id: true } });

      await tx.rating.deleteMany({});
      await tx.wishlist.deleteMany({});
      await tx.download.deleteMany({});
      await tx.creatorEarning.deleteMany({});
      await tx.withdrawalRequest.deleteMany({});
      await tx.creatorWallet.deleteMany({});
      await tx.subscriptionIntent.deleteMany({});
      await tx.invoice.deleteMany({});
      await tx.orderItem.deleteMany({});
      await tx.order.deleteMany({});
      await tx.audioAssetOnTag.deleteMany({});
      await tx.audioAssetGenre.deleteMany({});
      await tx.sfxMetadata.deleteMany({});
      await tx.musicMetadata.deleteMany({});
      await tx.audioAsset.deleteMany({});
      await tx.subscription.deleteMany({});

      await tx.subscription.createMany({
        data: users.map((user) => ({
          userId: user.id,
          planId: freePlan.id,
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodEnd: new Date('2099-12-31T23:59:59.000Z'),
        })),
      });

      await tx.user.updateMany({
        data: {
          refreshTokenHash: null,
          refreshTokenUpdatedAt: null,
        },
      });
    },
    { timeout: 60000 },
  );

  const removedFiles = await clearLocalAudioFiles();
  const after = await activityCounts(prisma);

  console.table(after);
  console.log(`File audio lokal dihapus: ${removedFiles}`);
  console.log(
    'Cleanup selesai. Users, profil, plans, categories, tags, genres, dan avatar dipertahankan.',
  );
}

main()
  .catch((error) => {
    console.error(`Cleanup gagal: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
