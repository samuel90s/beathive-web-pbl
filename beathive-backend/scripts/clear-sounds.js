// scripts/clear-sounds.js
// Hapus semua dummy sound effects + data terkait (orders, downloads, ratings, dll)
// Tetap mempertahankan: users, plans, categories, tags, subscriptions

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Menghapus semua sound effects dan data terkait...\n');

  // 1. Ratings
  const ratings = await prisma.rating.deleteMany({});
  console.log(`✓ Ratings        : ${ratings.count} dihapus`);

  // 2. Wishlists
  const wishlists = await prisma.wishlist.deleteMany({});
  console.log(`✓ Wishlists      : ${wishlists.count} dihapus`);

  // 3. Downloads
  const downloads = await prisma.download.deleteMany({});
  console.log(`✓ Downloads      : ${downloads.count} dihapus`);

  // 4. Creator earnings (terkait download dummy)
  const earnings = await prisma.creatorEarning.deleteMany({});
  console.log(`✓ Creator Earnings: ${earnings.count} dihapus`);

  // 5. Reset saldo wallet creator ke 0
  const wallets = await prisma.creatorWallet.updateMany({
    data: { balance: 0, totalEarned: 0 },
  });
  console.log(`✓ Creator Wallets : ${wallets.count} direset ke 0`);

  // 6. Sound effect tags (junction table)
  const sfxTags = await prisma.soundEffectOnTag.deleteMany({});
  console.log(`✓ Sound Tags     : ${sfxTags.count} dihapus`);

  // 7. Order items
  const orderItems = await prisma.orderItem.deleteMany({});
  console.log(`✓ Order Items    : ${orderItems.count} dihapus`);

  // 8. Invoices
  const invoices = await prisma.invoice.deleteMany({});
  console.log(`✓ Invoices       : ${invoices.count} dihapus`);

  // 9. Orders
  const orders = await prisma.order.deleteMany({});
  console.log(`✓ Orders         : ${orders.count} dihapus`);

  // 10. Sound effects
  const sounds = await prisma.soundEffect.deleteMany({});
  console.log(`✓ Sound Effects  : ${sounds.count} dihapus`);

  console.log('\n✅ Selesai! Database bersih, siap untuk testing dengan real audio.');
  console.log('   (Users, plans, categories, tags, subscriptions tetap ada)');
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
