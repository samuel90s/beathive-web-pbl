const fs = require('fs/promises');
const path = require('path');
const { performance } = require('perf_hooks');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const PREFIX = 'SIM-EVAL-2026';
const SLUG_PREFIX = 'sim-eval-2026';
const K = 10;

function getTags(asset) {
  return asset.tags.map((item) => item.tag.slug);
}

function makeVector(asset) {
  return [
    `category:${asset.category.slug}`,
    `subcategory:${asset.sfxMetadata?.subcategory ?? 'unknown'}`,
    ...getTags(asset).map((tag) => `tag:${tag}`),
  ];
}

function addWeight(map, key, value) {
  map.set(key, (map.get(key) ?? 0) + value);
}

function profileFromInteractions(interactions) {
  const profile = new Map();
  for (const interaction of interactions) {
    const vector = makeVector(interaction.asset);
    for (const feature of vector) {
      addWeight(profile, feature, interaction.weight);
    }
    if (interaction.type === 'order') addWeight(profile, 'signal:purchase', interaction.weight);
    if (interaction.type === 'download') addWeight(profile, 'signal:download', interaction.weight);
    if (interaction.type === 'wishlist') addWeight(profile, 'signal:wishlist', interaction.weight);
  }
  return profile;
}

function contentScore(asset, profile) {
  const features = makeVector(asset);
  return features.reduce((score, feature) => score + (profile.get(feature) ?? 0), 0);
}

function popularityScore(asset) {
  return Math.log1p(asset.downloadCount * 2 + asset.playCount);
}

function deterministicRandomScore(asset, userId) {
  const seed = `${asset.id}:${userId}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash / 0xffffffff;
}

function rankAssets(method, userId, candidateAssets, profile) {
  return candidateAssets
    .map((asset) => {
      const cbf = contentScore(asset, profile);
      const trend = popularityScore(asset);
      let score;
      if (method === 'hybrid') {
        const purchaseAffinity = profile.get('signal:purchase') ?? 0;
        const accessBoost = asset.accessLevel === 'PURCHASE' ? purchaseAffinity * 0.2 : 0;
        score = cbf * 0.9 + (trend / 10) * 0.1 + accessBoost;
      }
      if (method === 'contentBased') score = cbf;
      if (method === 'trending') score = trend;
      if (method === 'random') score = deterministicRandomScore(asset, userId);
      return { asset, score };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, K)
    .map((item) => item.asset.id);
}

function precisionAtK(recommendations, relevantSet) {
  const hits = recommendations.filter((id) => relevantSet.has(id)).length;
  return hits / K;
}

function recallAtK(recommendations, relevantSet) {
  if (!relevantSet.size) return 0;
  const hits = recommendations.filter((id) => relevantSet.has(id)).length;
  return hits / relevantSet.size;
}

function dcg(recommendations, relevantSet) {
  return recommendations.reduce((total, id, index) => {
    if (!relevantSet.has(id)) return total;
    return total + 1 / Math.log2(index + 2);
  }, 0);
}

function ndcgAtK(recommendations, relevantSet) {
  const idealLength = Math.min(K, relevantSet.size);
  if (!idealLength) return 0;
  const ideal = Array.from({ length: idealLength }, (_, index) => 1 / Math.log2(index + 2))
    .reduce((sum, value) => sum + value, 0);
  return dcg(recommendations, relevantSet) / ideal;
}

function averagePrecisionAtK(recommendations, relevantSet) {
  let hits = 0;
  let totalPrecision = 0;
  recommendations.forEach((id, index) => {
    if (relevantSet.has(id)) {
      hits += 1;
      totalPrecision += hits / (index + 1);
    }
  });
  return relevantSet.size ? totalPrecision / Math.min(relevantSet.size, K) : 0;
}

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round(value, digits = 4) {
  return Number(value.toFixed(digits));
}

async function loadDataset() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `${PREFIX.toLowerCase()}-user-` } },
    orderBy: { email: 'asc' },
  });

  const assets = await prisma.audioAsset.findMany({
    where: { slug: { startsWith: SLUG_PREFIX }, isPublished: true },
    include: {
      category: true,
      tags: { include: { tag: true } },
      sfxMetadata: true,
    },
    orderBy: { slug: 'asc' },
  });

  const [downloads, wishlists, ratings, orderItems] = await Promise.all([
    prisma.download.findMany({
      where: { userId: { in: users.map((user) => user.id) }, audioAsset: { slug: { startsWith: SLUG_PREFIX } } },
      include: { audioAsset: { include: { category: true, tags: { include: { tag: true } }, sfxMetadata: true } } },
      orderBy: { downloadedAt: 'asc' },
    }),
    prisma.wishlist.findMany({
      where: { userId: { in: users.map((user) => user.id) }, audioAsset: { slug: { startsWith: SLUG_PREFIX } } },
      include: { audioAsset: { include: { category: true, tags: { include: { tag: true } }, sfxMetadata: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.rating.findMany({
      where: { userId: { in: users.map((user) => user.id) }, audioAsset: { slug: { startsWith: SLUG_PREFIX } } },
      include: { audioAsset: { include: { category: true, tags: { include: { tag: true } }, sfxMetadata: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.orderItem.findMany({
      where: {
        order: { userId: { in: users.map((user) => user.id) }, status: 'PAID' },
        audioAsset: { slug: { startsWith: SLUG_PREFIX } },
      },
      include: {
        order: true,
        audioAsset: { include: { category: true, tags: { include: { tag: true } }, sfxMetadata: true } },
      },
      orderBy: { order: { paidAt: 'asc' } },
    }),
  ]);

  return { users, assets, downloads, wishlists, ratings, orderItems };
}

function buildPerUser(dataset) {
  const grouped = new Map();
  for (const user of dataset.users) grouped.set(user.id, { user, interactions: [], relevant: [] });

  for (const download of dataset.downloads) {
    grouped.get(download.userId)?.interactions.push({ asset: download.audioAsset, weight: 3, type: 'download' });
  }
  for (const wishlist of dataset.wishlists) {
    grouped.get(wishlist.userId)?.interactions.push({ asset: wishlist.audioAsset, weight: 2, type: 'wishlist' });
  }
  for (const rating of dataset.ratings) {
    grouped.get(rating.userId)?.interactions.push({ asset: rating.audioAsset, weight: rating.score, type: 'rating' });
  }
  for (const item of dataset.orderItems) {
    grouped.get(item.order.userId)?.interactions.push({ asset: item.audioAsset, weight: 5, type: 'order' });
  }

  for (const record of grouped.values()) {
    const byAsset = new Map();
    for (const interaction of record.interactions) {
      const current = byAsset.get(interaction.asset.id);
      if (!current || interaction.weight > current.weight) byAsset.set(interaction.asset.id, interaction);
    }
    const ordered = [...byAsset.values()].sort((left, right) => right.weight - left.weight);
    record.relevant = ordered.slice(0, 10).map((item) => item.asset.id);
    record.train = ordered.slice(10);
    if (record.train.length < 8) record.train = ordered.slice(0, Math.max(ordered.length - 5, 1));
  }

  return [...grouped.values()].filter((record) => record.relevant.length && record.train.length);
}

function evaluateMethod(method, records, assets) {
  const timings = [];
  const metrics = [];

  for (const record of records) {
    const profile = profileFromInteractions(record.train);
    const seen = new Set(record.train.map((item) => item.asset.id));
    const candidates = assets.filter((asset) => !seen.has(asset.id));
    const startedAt = performance.now();
    const recommendations = rankAssets(method, record.user.id, candidates, profile);
    timings.push(performance.now() - startedAt);

    const relevantSet = new Set(record.relevant);
    metrics.push({
      precisionAt10: precisionAtK(recommendations, relevantSet),
      recallAt10: recallAtK(recommendations, relevantSet),
      ndcgAt10: ndcgAtK(recommendations, relevantSet),
      mapAt10: averagePrecisionAtK(recommendations, relevantSet),
    });
  }

  return {
    precisionAt10: round(mean(metrics.map((item) => item.precisionAt10))),
    recallAt10: round(mean(metrics.map((item) => item.recallAt10))),
    ndcgAt10: round(mean(metrics.map((item) => item.ndcgAt10))),
    mapAt10: round(mean(metrics.map((item) => item.mapAt10))),
    avgLatencyMsPerUser: round(mean(timings), 3),
  };
}

async function main() {
  const dataset = await loadDataset();
  const records = buildPerUser(dataset);
  if (!records.length) {
    throw new Error(`No ${PREFIX} evaluation records found. Run npm run seed:evaluation first.`);
  }

  const methods = {
    hybrid: 'Hybrid multi-signal',
    contentBased: 'Content-based only',
    trending: 'Trending-only',
    random: 'Random baseline',
  };

  const results = {};
  for (const method of Object.keys(methods)) {
    results[method] = {
      label: methods[method],
      ...evaluateMethod(method, records, dataset.assets),
    };
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    datasetLabel: 'Controlled simulated Arsonus recommendation evaluation dataset',
    prefix: PREFIX,
    k: K,
    usersEvaluated: records.length,
    assetCount: dataset.assets.length,
    interactionCounts: {
      downloads: dataset.downloads.length,
      wishlists: dataset.wishlists.length,
      ratings: dataset.ratings.length,
      paidOrderItems: dataset.orderItems.length,
    },
    results,
    note: 'Offline evaluation over seeded simulated behavior. Results are suitable as a controlled prototype study, not as evidence of organic production behavior.',
  };

  const file = path.join(process.cwd(), 'evaluation-benchmark-summary.json');
  await fs.writeFile(file, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
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
