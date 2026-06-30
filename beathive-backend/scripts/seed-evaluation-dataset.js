const fs = require('fs/promises');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PREFIX = 'SIM-EVAL-2026';
const USER_COUNT = 20;
const ASSET_COUNT = 600;

const clusters = [
  {
    key: 'cinematic',
    category: ['cinematic', 'Cinematic'],
    subcategories: ['impact', 'riser', 'whoosh', 'hit'],
    tags: ['cinematic', 'trailer', 'impact', 'riser', 'whoosh', 'tension'],
  },
  {
    key: 'game',
    category: ['game-ui', 'Game UI'],
    subcategories: ['click', 'coin', 'notification', 'success'],
    tags: ['game', 'ui', 'click', 'coin', 'arcade', 'feedback'],
  },
  {
    key: 'ambient',
    category: ['ambient', 'Ambient'],
    subcategories: ['forest', 'rain', 'room-tone', 'wind'],
    tags: ['ambient', 'nature', 'rain', 'forest', 'calm', 'background'],
  },
  {
    key: 'foley',
    category: ['foley', 'Foley'],
    subcategories: ['footstep', 'door', 'cloth', 'object'],
    tags: ['foley', 'footstep', 'door', 'realistic', 'movement', 'object'],
  },
  {
    key: 'electronic',
    category: ['electronic', 'Electronic'],
    subcategories: ['glitch', 'laser', 'synth', 'transition'],
    tags: ['electronic', 'glitch', 'laser', 'sci-fi', 'synth', 'transition'],
  },
];

function pick(list, index) {
  return list[index % list.length];
}

function unique(items) {
  return [...new Set(items)];
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function stableScore(seed) {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
}

async function cleanup() {
  const simUsers = await prisma.user.findMany({
    where: { email: { startsWith: `${PREFIX.toLowerCase()}-user-` } },
    select: { id: true },
  });
  const simAssets = await prisma.audioAsset.findMany({
    where: { slug: { startsWith: slugify(PREFIX) } },
    select: { id: true },
  });

  const userIds = simUsers.map((user) => user.id);
  const assetIds = simAssets.map((asset) => asset.id);

  await prisma.$transaction(async (tx) => {
    if (assetIds.length) {
      await tx.audioAssetOnTag.deleteMany({ where: { audioAssetId: { in: assetIds } } });
      await tx.audioAssetGenre.deleteMany({ where: { assetId: { in: assetIds } } });
      await tx.sfxMetadata.deleteMany({ where: { assetId: { in: assetIds } } });
      await tx.musicMetadata.deleteMany({ where: { assetId: { in: assetIds } } });
      await tx.rating.deleteMany({ where: { audioAssetId: { in: assetIds } } });
      await tx.wishlist.deleteMany({ where: { audioAssetId: { in: assetIds } } });
      await tx.download.deleteMany({ where: { audioAssetId: { in: assetIds } } });
      await tx.orderItem.deleteMany({ where: { audioAssetId: { in: assetIds } } });
    }

    if (userIds.length) {
      await tx.rating.deleteMany({ where: { userId: { in: userIds } } });
      await tx.wishlist.deleteMany({ where: { userId: { in: userIds } } });
      await tx.download.deleteMany({ where: { userId: { in: userIds } } });
      await tx.subscription.deleteMany({ where: { userId: { in: userIds } } });
      await tx.orderItem.deleteMany({ where: { order: { userId: { in: userIds } } } });
      await tx.invoice.deleteMany({ where: { order: { userId: { in: userIds } } } });
      await tx.order.deleteMany({ where: { userId: { in: userIds } } });
      await tx.notification.deleteMany({ where: { userId: { in: userIds } } });
      await tx.user.deleteMany({ where: { id: { in: userIds } } });
    }

    if (assetIds.length) {
      await tx.audioAsset.deleteMany({ where: { id: { in: assetIds } } });
    }
  }, { timeout: 60000 });
}

async function ensureReferenceData() {
  const categories = new Map();
  const tags = new Map();

  for (const cluster of clusters) {
    const [slug, name] = cluster.category;
    const category = await prisma.category.upsert({
      where: { slug },
      update: { name, type: 'sfx' },
      create: { slug, name, type: 'sfx' },
    });
    categories.set(cluster.key, category);

    for (const tagName of unique([...cluster.tags, ...cluster.subcategories, cluster.key])) {
      const slugValue = slugify(tagName);
      const tag = await prisma.tag.upsert({
        where: { slug: slugValue },
        update: { name: tagName },
        create: { slug: slugValue, name: tagName },
      });
      tags.set(slugValue, tag);
    }
  }

  const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } });
  return { categories, tags, freePlan };
}

async function createUsers(freePlan) {
  const users = [];
  for (let index = 0; index < USER_COUNT; index += 1) {
    const cluster = clusters[index % clusters.length];
    const user = await prisma.user.create({
      data: {
        name: `${PREFIX} User ${String(index + 1).padStart(2, '0')} (${cluster.key})`,
        email: `${PREFIX.toLowerCase()}-user-${String(index + 1).padStart(2, '0')}@arsonus.local`,
        passwordHash: 'simulated-evaluation-password',
        role: 'USER',
        provider: 'email',
        emailVerified: true,
        subscription: freePlan
          ? {
              create: {
                planId: freePlan.id,
                status: 'ACTIVE',
                billingCycle: 'MONTHLY',
                currentPeriodEnd: new Date('2099-12-31T23:59:59.000Z'),
              },
            }
          : undefined,
      },
    });
    users.push({ ...user, clusterKey: cluster.key, clusterIndex: index % clusters.length });
  }
  return users;
}

async function createAssets(referenceData) {
  const assets = [];
  const createdAtBase = new Date('2026-01-01T00:00:00.000Z').getTime();

  for (let index = 0; index < ASSET_COUNT; index += 1) {
    const cluster = clusters[index % clusters.length];
    const category = referenceData.categories.get(cluster.key);
    const subcategory = pick(cluster.subcategories, index);
    const tagNames = unique([
      cluster.key,
      subcategory,
      pick(cluster.tags, index + 1),
      pick(cluster.tags, index + 3),
    ]);
    const slug = `${slugify(PREFIX)}-${cluster.key}-${String(index + 1).padStart(4, '0')}`;
    const hotness = Math.round(stableScore(index + 11) * 240);

    const asset = await prisma.audioAsset.create({
      data: {
        assetType: 'SFX',
        categoryId: category.id,
        title: `${PREFIX} ${cluster.key} ${subcategory} ${String(index + 1).padStart(4, '0')}`,
        slug,
        description: `Controlled simulated ${cluster.key} ${subcategory} sound effect for Arsonus recommendation evaluation.`,
        fileUrl: `simulated/${slug}.wav`,
        previewUrl: `simulated/${slug}-preview.mp3`,
        waveformData: Array.from({ length: 32 }, (_, bar) => Math.round(20 + stableScore(index * 37 + bar) * 80)),
        durationMs: 900 + Math.round(stableScore(index + 29) * 8400),
        fileSize: 90000 + Math.round(stableScore(index + 43) * 3200000),
        format: pick(['wav', 'mp3', 'ogg'], index),
        price: index % 5 === 0 ? 49000 : 0,
        accessLevel: index % 5 === 0 ? 'PURCHASE' : index % 3 === 0 ? 'PRO' : 'FREE',
        licenseType: index % 4 === 0 ? 'commercial' : index % 2 === 0 ? 'both' : 'personal',
        isPublished: true,
        publishedAt: new Date(createdAtBase + index * 3600 * 1000),
        reviewStatus: 'APPROVED',
        playCount: 40 + hotness + (index % 17),
        downloadCount: 10 + Math.floor(hotness / 3),
        tags: {
          create: tagNames.map((tagName) => ({
            tag: { connect: { slug: slugify(tagName) } },
          })),
        },
        sfxMetadata: {
          create: { subcategory },
        },
      },
      include: {
        category: true,
        tags: { include: { tag: true } },
        sfxMetadata: true,
      },
    });
    assets.push({ ...asset, clusterKey: cluster.key, subcategory });
  }

  return assets;
}

async function createInteractions(users, assets) {
  const assetsByCluster = new Map();
  for (const cluster of clusters) {
    assetsByCluster.set(cluster.key, assets.filter((asset) => asset.clusterKey === cluster.key));
  }

  let downloadCount = 0;
  let wishlistCount = 0;
  let ratingCount = 0;
  let orderCount = 0;

  for (const userIndex in users) {
    const user = users[userIndex];
    const primary = assetsByCluster.get(user.clusterKey);
    const secondary = assetsByCluster.get(clusters[(user.clusterIndex + 1) % clusters.length].key);
    const exploration = assetsByCluster.get(clusters[(user.clusterIndex + 2) % clusters.length].key);
    const downloadPool = [...primary.slice(0, 46), ...secondary.slice(10, 22), ...exploration.slice(20, 26)];
    const wishlistPool = [...primary.slice(46, 76), ...secondary.slice(22, 32)];
    const ratingPool = [...primary.slice(76, 108), ...secondary.slice(32, 40)];
    const orderPool = primary.filter((asset) => asset.accessLevel === 'PURCHASE').slice(0, 20);

    for (const [index, asset] of downloadPool.entries()) {
      await prisma.download.create({
        data: {
          userId: user.id,
          audioAssetId: asset.id,
          source: asset.accessLevel === 'PURCHASE' ? 'purchase' : 'subscription',
          downloadedAt: new Date(Date.UTC(2026, 0, 1 + Number(userIndex), index % 24, index % 60)),
        },
      });
      downloadCount += 1;
    }

    for (const [index, asset] of wishlistPool.entries()) {
      await prisma.wishlist.upsert({
        where: { userId_audioAssetId: { userId: user.id, audioAssetId: asset.id } },
        update: {},
        create: {
          userId: user.id,
          audioAssetId: asset.id,
          createdAt: new Date(Date.UTC(2026, 1, 1 + Number(userIndex), index % 24, index % 60)),
        },
      });
      wishlistCount += 1;
    }

    for (const [index, asset] of ratingPool.entries()) {
      await prisma.rating.upsert({
        where: { userId_audioAssetId: { userId: user.id, audioAssetId: asset.id } },
        update: { score: index < 32 ? 5 : 4 },
        create: {
          userId: user.id,
          audioAssetId: asset.id,
          score: index < 32 ? 5 : 4,
          reviewText: `${PREFIX} simulated preference signal`,
          createdAt: new Date(Date.UTC(2026, 2, 1 + Number(userIndex), index % 24, index % 60)),
        },
      });
      ratingCount += 1;
    }

    for (const [index, asset] of orderPool.entries()) {
      await prisma.order.create({
        data: {
          userId: user.id,
          totalAmount: asset.price || 49000,
          status: 'PAID',
          gatewayOrderId: `${PREFIX}-ORDER-${userIndex}-${index}`,
          paidAt: new Date(Date.UTC(2026, 3, 1 + Number(userIndex), index % 24, index % 60)),
          items: {
            create: {
              audioAssetId: asset.id,
              priceSnapshot: asset.price || 49000,
              licenseType: index % 2 === 0 ? 'commercial' : 'personal',
            },
          },
        },
      });
      orderCount += 1;
    }
  }

  return { downloadCount, wishlistCount, ratingCount, orderCount };
}

async function writeSummary(summary) {
  const file = path.join(process.cwd(), 'evaluation-dataset-summary.json');
  await fs.writeFile(file, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  return file;
}

async function main() {
  await cleanup();
  const referenceData = await ensureReferenceData();
  const users = await createUsers(referenceData.freePlan);
  const assets = await createAssets(referenceData);
  const interactions = await createInteractions(users, assets);

  const summary = {
    generatedAt: new Date().toISOString(),
    datasetLabel: 'Controlled simulated Arsonus recommendation evaluation dataset',
    prefix: PREFIX,
    users: users.length,
    assets: assets.length,
    downloads: interactions.downloadCount,
    wishlists: interactions.wishlistCount,
    ratings: interactions.ratingCount,
    paidOrders: interactions.orderCount,
    note: 'This dataset is synthetic and must be reported as simulated evaluation data, not organic production traffic.',
  };

  const file = await writeSummary(summary);
  console.table(summary);
  console.log(`Saved ${file}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
