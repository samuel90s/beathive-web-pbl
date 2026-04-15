import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://postgres:admin@localhost:5432/beathive_db",
    },
  },
})

async function main() {
  console.log('Seeding database...')

  const plans = [
    { name: 'Free', slug: 'free', priceMonthly: 0, priceYearly: 0, downloadLimit: 5, commercialLicense: false, unlimited: false },
    { name: 'Pro', slug: 'pro', priceMonthly: 99000, priceYearly: 890000, downloadLimit: 100, commercialLicense: true, unlimited: false },
    { name: 'Business', slug: 'business', priceMonthly: 299000, priceYearly: 2500000, downloadLimit: -1, commercialLicense: true, unlimited: true },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan })
  }
  console.log('✓ Plans seeded')

  const categories = [
    { name: 'Alam', slug: 'alam', icon: '🌿' },
    { name: 'Aksi', slug: 'aksi', icon: '💥' },
    { name: 'UI / Game', slug: 'ui-game', icon: '🎮' },
    { name: 'Suasana', slug: 'suasana', icon: '🌆' },
    { name: 'Manusia', slug: 'manusia', icon: '🚶' },
    { name: 'Kendaraan', slug: 'kendaraan', icon: '🚗' },
    { name: 'Hewan', slug: 'hewan', icon: '🐾' },
    { name: 'Elektronik', slug: 'elektronik', icon: '⚡' },
    { name: 'Horror', slug: 'horror', icon: '👻' },
    { name: 'Komedi', slug: 'komedi', icon: '😄' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({ where: { slug: cat.slug }, update: cat, create: cat })
  }
  console.log('✓ Categories seeded')

  const tags = [
    'explosion', 'gunshot', 'footstep', 'rain', 'thunder',
    'wind', 'fire', 'water', 'crowd', 'applause',
    'click', 'notification', 'whoosh', 'impact', 'loop',
    'short', 'long', 'loud', 'soft', 'realistic',
  ]

  for (const name of tags) {
    await prisma.tag.upsert({ where: { slug: name }, update: { name }, create: { name, slug: name } })
  }
  console.log('✓ Tags seeded')

  console.log('Seeding selesai!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })