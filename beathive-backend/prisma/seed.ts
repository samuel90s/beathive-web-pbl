import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

function waveform(n = 50): number[] {
  return Array.from({ length: n }, (_, i) =>
    Math.abs(Math.sin(i * 0.6 + Math.random()) * 70) + 10 + Math.random() * 20
  );
}

function slug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Plans ──────────────────────────────────────────────────
  const plans = [
    { name: 'Free', slug: 'free', priceMonthly: 0,     priceYearly: 0,      downloadLimit: 3,  commercialLicense: false, unlimited: false },
    { name: 'Pro',  slug: 'pro',  priceMonthly: 25000, priceYearly: 220000, downloadLimit: 20, commercialLicense: true,  unlimited: false },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan })
  }
  console.log('✓ Plans seeded')

  // ─── Categories ─────────────────────────────────────────────
  const categories = [
    // SFX
    { slug: 'foley',           name: 'Foley',              type: 'sfx'   },
    { slug: 'ambience',        name: 'Ambience',            type: 'sfx'   },
    { slug: 'soundscape',      name: 'Soundscape',          type: 'sfx'   },
    { slug: 'nature',          name: 'Nature & Weather',    type: 'sfx'   },
    { slug: 'explosions',      name: 'Explosions',          type: 'sfx'   },
    { slug: 'weapons',         name: 'Weapons & Combat',    type: 'sfx'   },
    { slug: 'vehicles',        name: 'Vehicles',            type: 'sfx'   },
    { slug: 'ui-game',         name: 'UI & Game',           type: 'sfx'   },
    { slug: 'horror',          name: 'Horror',              type: 'sfx'   },
    { slug: 'human',           name: 'Human & Crowd',       type: 'sfx'   },
    { slug: 'animals',         name: 'Animals',             type: 'sfx'   },
    { slug: 'electronic',      name: 'Electronic & Sci-Fi', type: 'sfx'   },
    { slug: 'comedy',          name: 'Comedy & Cartoon',    type: 'sfx'   },
    { slug: 'magic',           name: 'Magic & Fantasy',     type: 'sfx'   },
    { slug: 'sports',          name: 'Sports & Action',     type: 'sfx'   },
    { slug: 'industrial',      name: 'Industrial',          type: 'sfx'   },
    // Music
    { slug: 'sound-scoring',   name: 'Sound Scoring',       type: 'music' },
    { slug: 'cinematic',       name: 'Cinematic',           type: 'music' },
    { slug: 'electronic-music',name: 'Electronic Music',    type: 'music' },
    { slug: 'acoustic',        name: 'Acoustic',            type: 'music' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name, type: cat.type },
      create: cat,
    })
  }
  console.log('✓ Categories seeded')

  // ─── Tags ───────────────────────────────────────────────────
  const tagNames = [
    'explosion', 'gunshot', 'footstep', 'rain', 'thunder', 'wind',
    'fire', 'water', 'crowd', 'applause', 'click', 'notification',
    'whoosh', 'impact', 'loop', 'short', 'long', 'loud', 'soft',
    'realistic', 'sfx', 'music', 'ambient', 'cinematic', 'epic',
    'transition', 'sweep', 'rocket', 'swoosh', 'drum', 'brass',
    'orchestra', 'reverb', 'dark', 'horror', 'glitch', 'electronic',
    'nature', 'bird', 'forest', 'ocean', 'car', 'engine', 'weapon',
    'sword', 'magic', 'spell', 'ui', 'game', 'comedy', 'cartoon',
    'punch', 'hit', 'bounce', 'glass', 'metal', 'wood', 'paper',
    'sci-fi',   // ← tambah tag yang dibutuhkan weapons
  ]
  for (const name of tagNames) {
    const tagSlug = name.replace(/\s+/g, '-')
    await prisma.tag.upsert({ where: { slug: tagSlug }, update: { name }, create: { name, slug: tagSlug } })
  }
  console.log('✓ Tags seeded')

  const musicGenres = [
    'Cinematic', 'Orchestral', 'Trailer', 'Ambient', 'Lo-fi', 'EDM',
    'Hip Hop', 'Trap', 'Acoustic', 'Piano', 'Corporate', 'Rock', 'Jazz',
    'Electronic',  // ← dibutuhkan untuk kategori electronic-music
  ]
  for (const name of musicGenres) {
    const genreSlug = slug(name)
    await prisma.genre.upsert({ where: { slug: genreSlug }, update: { name }, create: { name, slug: genreSlug } })
  }
  console.log('✓ Music genres seeded')

  // ─── Admin account ──────────────────────────────────────────
  const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } })
  const proPlan  = await prisma.plan.findUnique({ where: { slug: 'pro'  } })

  const adminEmail    = 'admin@beathive.com'
  const adminPassword = 'password123'
  const admin = await prisma.user.upsert({
    where:  { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Admin BeatHive',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'ADMIN',
      provider: 'email',
    },
  })
  if (freePlan) {
    await prisma.subscription.upsert({
      where:  { userId: admin.id },
      update: {},
      create: { userId: admin.id, planId: freePlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    })
  }
  console.log(`✓ Admin  → ${adminEmail} / ${adminPassword}`)

  // ─── Your account (samuel) ──────────────────────────────────
  const userEmail    = 'samx@gmail.com'
  const userPassword = 'password123'
  const regularUser = await prisma.user.upsert({
    where:  { email: userEmail },
    update: {},
    create: {
      email: userEmail,
      name: 'samuel s',
      passwordHash: await bcrypt.hash(userPassword, 10),
      role: 'USER',
      provider: 'email',
    },
  })
  if (proPlan) {
    await prisma.subscription.upsert({
      where:  { userId: regularUser.id },
      update: {},
      create: { userId: regularUser.id, planId: proPlan.id, status: 'ACTIVE', billingCycle: 'MONTHLY', currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
    })
  }
  console.log(`✓ User   → ${userEmail} / ${userPassword}`)

  // ─── Dummy Sounds ───────────────────────────────────────────
  const catMap: Record<string, string> = {}
  const catTypeMap: Record<string, string> = {}
  const cats = await prisma.category.findMany()
  cats.forEach(c => { catMap[c.slug] = c.id; catTypeMap[c.slug] = c.type })

  const tagMap: Record<string, string> = {}
  const allTags = await prisma.tag.findMany()
  allTags.forEach(t => { tagMap[t.slug] = t.id })

  // ── distribusi akses (mirip Canva):
  //    FREE     = bisa didownload siapa saja (konten "teaser")
  //    PRO      = butuh langganan Pro aktif untuk download
  //    PURCHASE = beli satuan, tidak perlu Pro
  const dummySounds = [
    // FOLEY ─────────────────────────────────────────────────────────
    { title: 'Heavy Metal Impact',        category: 'foley',      tags: ['impact', 'metal', 'loud'],          dur: 1200,  price: 0,     access: 'FREE'     },
    { title: 'Leather Jacket Rustle',     category: 'foley',      tags: ['sfx', 'soft', 'short'],             dur: 800,   price: 0,     access: 'FREE'     },
    { title: 'Wood Creak Floor',          category: 'foley',      tags: ['wood', 'footstep', 'realistic'],    dur: 1500,  price: 0,     access: 'PRO'      },
    { title: 'Glass Shatter Big',         category: 'foley',      tags: ['glass', 'loud', 'impact'],          dur: 2100,  price: 15000, access: 'PURCHASE' },
    { title: 'Paper Crumple Slow',        category: 'foley',      tags: ['paper', 'soft', 'short'],           dur: 900,   price: 0,     access: 'PRO'      },
    { title: 'Liquid Pour Steady',        category: 'foley',      tags: ['water', 'loop', 'realistic'],       dur: 4000,  price: 0,     access: 'PRO'      },
    { title: 'Metal Chain Drop',          category: 'foley',      tags: ['metal', 'impact', 'loud'],          dur: 1800,  price: 18000, access: 'PURCHASE' },
    { title: 'Door Slam Hard',            category: 'foley',      tags: ['wood', 'impact', 'short'],          dur: 600,   price: 0,     access: 'FREE'     },
    { title: 'Ceramic Mug Break',         category: 'foley',      tags: ['glass', 'impact', 'short'],         dur: 700,   price: 0,     access: 'PRO'      },
    { title: 'Zipper Pull Close',         category: 'foley',      tags: ['sfx', 'short', 'realistic'],        dur: 500,   price: 0,     access: 'PRO'      },
    // AMBIENCE ──────────────────────────────────────────────────────
    { title: 'City Traffic Loop',         category: 'ambience',   tags: ['crowd', 'loop', 'realistic'],       dur: 30000, price: 0,     access: 'FREE'     },
    { title: 'Office Hum Background',     category: 'ambience',   tags: ['ambient', 'loop', 'soft'],          dur: 60000, price: 0,     access: 'PRO'      },
    { title: 'Subway Station Crowd',      category: 'ambience',   tags: ['crowd', 'loop', 'realistic'],       dur: 45000, price: 20000, access: 'PURCHASE' },
    { title: 'Rain on Window Light',      category: 'ambience',   tags: ['rain', 'ambient', 'loop'],          dur: 60000, price: 0,     access: 'FREE'     },
    { title: 'Coffee Shop Murmur',        category: 'ambience',   tags: ['crowd', 'ambient', 'loop'],         dur: 30000, price: 0,     access: 'PRO'      },
    { title: 'Hospital Corridor',         category: 'ambience',   tags: ['ambient', 'loop', 'soft'],          dur: 30000, price: 0,     access: 'PRO'      },
    { title: 'Airport Terminal Busy',     category: 'ambience',   tags: ['crowd', 'loop', 'realistic'],       dur: 60000, price: 25000, access: 'PURCHASE' },
    { title: 'Library Silence Hum',       category: 'ambience',   tags: ['ambient', 'loop', 'soft'],          dur: 90000, price: 0,     access: 'PRO'      },
    // SOUNDSCAPE ────────────────────────────────────────────────────
    { title: 'Underwater Depth',          category: 'soundscape', tags: ['ambient', 'loop', 'soft'],          dur: 60000, price: 0,     access: 'FREE'     },
    { title: 'Ancient Cave Drip',         category: 'soundscape', tags: ['water', 'ambient', 'loop'],         dur: 45000, price: 0,     access: 'PRO'      },
    { title: 'Abandoned City Ruin',       category: 'soundscape', tags: ['ambient', 'loop', 'dark'],          dur: 90000, price: 20000, access: 'PURCHASE' },
    { title: 'Mystical Forest Night',     category: 'soundscape', tags: ['ambient', 'loop', 'dark'],          dur: 120000,price: 0,     access: 'PRO'      },
    { title: 'Dystopian City Rain',       category: 'soundscape', tags: ['rain', 'ambient', 'loop'],          dur: 90000, price: 30000, access: 'PURCHASE' },
    // EXPLOSIONS ────────────────────────────────────────────────────
    { title: 'Grenade Explosion Close',   category: 'explosions', tags: ['explosion', 'loud', 'short'],       dur: 2500,  price: 0,     access: 'FREE'     },
    { title: 'Nuclear Blast Distant',     category: 'explosions', tags: ['explosion', 'loud', 'epic'],        dur: 8000,  price: 25000, access: 'PURCHASE' },
    { title: 'Car Bomb Large',            category: 'explosions', tags: ['explosion', 'impact', 'loud'],      dur: 4000,  price: 0,     access: 'PRO'      },
    { title: 'Small Firecracker Pop',     category: 'explosions', tags: ['explosion', 'short', 'soft'],       dur: 400,   price: 0,     access: 'FREE'     },
    { title: 'Building Implosion',        category: 'explosions', tags: ['explosion', 'epic', 'long'],        dur: 12000, price: 35000, access: 'PURCHASE' },
    { title: 'Rocket Launch Rumble',      category: 'explosions', tags: ['explosion', 'rocket', 'epic'],      dur: 6000,  price: 0,     access: 'PRO'      },
    { title: 'Dynamite Blast Cave',       category: 'explosions', tags: ['explosion', 'loud', 'impact'],      dur: 3500,  price: 0,     access: 'PRO'      },
    { title: 'Gas Tank Explosion',        category: 'explosions', tags: ['explosion', 'impact', 'loud'],      dur: 5000,  price: 20000, access: 'PURCHASE' },
    // WEAPONS ───────────────────────────────────────────────────────
    { title: 'Pistol Single Shot',        category: 'weapons',    tags: ['gunshot', 'short', 'loud'],         dur: 800,   price: 0,     access: 'FREE'     },
    { title: 'Assault Rifle Burst',       category: 'weapons',    tags: ['gunshot', 'loud', 'short'],         dur: 1200,  price: 0,     access: 'PRO'      },
    { title: 'Sword Clash Metal',         category: 'weapons',    tags: ['sword', 'metal', 'impact'],         dur: 900,   price: 0,     access: 'PRO'      },
    { title: 'Sniper Rifle Shot',         category: 'weapons',    tags: ['gunshot', 'loud', 'epic'],          dur: 2000,  price: 10000, access: 'PURCHASE' },
    { title: 'Arrow Release Bow',         category: 'weapons',    tags: ['whoosh', 'short', 'soft'],          dur: 700,   price: 0,     access: 'FREE'     },
    { title: 'Laser Beam Sci-Fi',         category: 'weapons',    tags: ['electronic', 'short', 'sci-fi'],    dur: 500,   price: 0,     access: 'PRO'      },
    { title: 'Shotgun Pump Reload',       category: 'weapons',    tags: ['gunshot', 'short', 'realistic'],    dur: 1000,  price: 0,     access: 'PRO'      },
    { title: 'Sword Slash Whoosh',        category: 'weapons',    tags: ['sword', 'whoosh', 'short'],         dur: 600,   price: 12000, access: 'PURCHASE' },
    // VEHICLES ──────────────────────────────────────────────────────
    { title: 'Sports Car Revving',        category: 'vehicles',   tags: ['car', 'engine', 'loop'],            dur: 5000,  price: 0,     access: 'FREE'     },
    { title: 'Helicopter Flyby',          category: 'vehicles',   tags: ['engine', 'loop', 'loud'],           dur: 8000,  price: 15000, access: 'PURCHASE' },
    { title: 'Train Passing Fast',        category: 'vehicles',   tags: ['engine', 'whoosh', 'loud'],         dur: 6000,  price: 0,     access: 'PRO'      },
    { title: 'Motorbike Acceleration',    category: 'vehicles',   tags: ['engine', 'car', 'loud'],            dur: 4000,  price: 0,     access: 'PRO'      },
    { title: 'Truck Air Brake',           category: 'vehicles',   tags: ['engine', 'short', 'loud'],          dur: 1500,  price: 0,     access: 'PRO'      },
    { title: 'Sci-Fi Spaceship Hum',      category: 'vehicles',   tags: ['electronic', 'loop', 'ambient'],    dur: 10000, price: 20000, access: 'PURCHASE' },
    { title: 'Ambulance Siren Pass',      category: 'vehicles',   tags: ['engine', 'loud', 'short'],          dur: 6000,  price: 0,     access: 'FREE'     },
    { title: 'Submarine Sonar Ping',      category: 'vehicles',   tags: ['electronic', 'ambient', 'loop'],    dur: 8000,  price: 0,     access: 'PRO'      },
    // UI & GAME ─────────────────────────────────────────────────────
    { title: 'UI Button Click Clean',     category: 'ui-game',    tags: ['click', 'ui', 'short'],             dur: 200,   price: 0,     access: 'FREE'     },
    { title: 'Notification Chime Soft',   category: 'ui-game',    tags: ['notification', 'ui', 'short'],      dur: 800,   price: 0,     access: 'FREE'     },
    { title: 'Level Up Fanfare',          category: 'ui-game',    tags: ['game', 'short', 'epic'],            dur: 2000,  price: 0,     access: 'PRO'      },
    { title: 'Game Over Sad',             category: 'ui-game',    tags: ['game', 'music', 'short'],           dur: 3000,  price: 0,     access: 'PRO'      },
    { title: 'Power Up Collect',          category: 'ui-game',    tags: ['game', 'short', 'sfx'],             dur: 500,   price: 0,     access: 'FREE'     },
    { title: 'Error Alert Buzz',          category: 'ui-game',    tags: ['notification', 'short', 'ui'],      dur: 400,   price: 0,     access: 'PRO'      },
    { title: 'Typing Keyboard Rapid',     category: 'ui-game',    tags: ['click', 'loop', 'soft'],            dur: 3000,  price: 10000, access: 'PURCHASE' },
    { title: 'Achievement Unlock Chime',  category: 'ui-game',    tags: ['game', 'ui', 'short'],              dur: 1200,  price: 0,     access: 'PRO'      },
    { title: 'Countdown Beep Sequence',   category: 'ui-game',    tags: ['game', 'ui', 'short'],              dur: 3000,  price: 12000, access: 'PURCHASE' },
    // NATURE ────────────────────────────────────────────────────────
    { title: 'Heavy Rain Forest',         category: 'nature',     tags: ['rain', 'loop', 'ambient'],          dur: 60000, price: 0,     access: 'FREE'     },
    { title: 'Thunder Crack Close',       category: 'nature',     tags: ['thunder', 'loud', 'short'],         dur: 4000,  price: 0,     access: 'PRO'      },
    { title: 'Ocean Waves Calm',          category: 'nature',     tags: ['water', 'ocean', 'loop'],           dur: 30000, price: 0,     access: 'FREE'     },
    { title: 'Forest Birds Morning',      category: 'nature',     tags: ['bird', 'forest', 'loop'],           dur: 45000, price: 0,     access: 'PRO'      },
    { title: 'Wind Storm Howling',        category: 'nature',     tags: ['wind', 'loop', 'loud'],             dur: 20000, price: 0,     access: 'PRO'      },
    { title: 'Campfire Crackling',        category: 'nature',     tags: ['fire', 'loop', 'ambient'],          dur: 60000, price: 15000, access: 'PURCHASE' },
    { title: 'Tropical Rain Loop',        category: 'nature',     tags: ['rain', 'loop', 'ambient'],          dur: 90000, price: 0,     access: 'PRO'      },
    { title: 'Desert Wind Sand',          category: 'nature',     tags: ['wind', 'loop', 'ambient'],          dur: 60000, price: 18000, access: 'PURCHASE' },
    // HORROR ────────────────────────────────────────────────────────
    { title: 'Jump Scare Sting',          category: 'horror',     tags: ['horror', 'impact', 'loud'],         dur: 1500,  price: 0,     access: 'FREE'     },
    { title: 'Heartbeat Slow Tense',      category: 'horror',     tags: ['horror', 'loop', 'dark'],           dur: 8000,  price: 0,     access: 'PRO'      },
    { title: 'Creaking Door Haunted',     category: 'horror',     tags: ['horror', 'wood', 'short'],          dur: 2000,  price: 0,     access: 'PRO'      },
    { title: 'Monster Growl Deep',        category: 'horror',     tags: ['horror', 'loud', 'short'],          dur: 2500,  price: 20000, access: 'PURCHASE' },
    { title: 'Breathing Heavy Scared',    category: 'horror',     tags: ['horror', 'soft', 'loop'],           dur: 5000,  price: 0,     access: 'PRO'      },
    { title: 'Ghost Wail Distant',        category: 'horror',     tags: ['horror', 'ambient', 'dark'],        dur: 6000,  price: 0,     access: 'FREE'     },
    { title: 'Demonic Whisper Layer',     category: 'horror',     tags: ['horror', 'dark', 'ambient'],        dur: 4000,  price: 25000, access: 'PURCHASE' },
    { title: 'Chains Dragging Slow',      category: 'horror',     tags: ['horror', 'metal', 'loop'],          dur: 8000,  price: 0,     access: 'PRO'      },
    // HUMAN ─────────────────────────────────────────────────────────
    { title: 'Crowd Cheering Stadium',    category: 'human',      tags: ['crowd', 'applause', 'loud'],        dur: 8000,  price: 0,     access: 'FREE'     },
    { title: 'Baby Laughing Cute',        category: 'human',      tags: ['crowd', 'short', 'soft'],           dur: 2000,  price: 0,     access: 'PRO'      },
    { title: 'Angry Crowd Protest',       category: 'human',      tags: ['crowd', 'loud', 'loop'],            dur: 15000, price: 0,     access: 'PRO'      },
    { title: 'Footsteps Running Fast',    category: 'human',      tags: ['footstep', 'loop', 'realistic'],    dur: 5000,  price: 0,     access: 'FREE'     },
    { title: 'Solo Clap Applause',        category: 'human',      tags: ['applause', 'short', 'soft'],        dur: 2000,  price: 0,     access: 'PRO'      },
    { title: 'Man Scream In Pain',        category: 'human',      tags: ['loud', 'short', 'realistic'],       dur: 1500,  price: 15000, access: 'PURCHASE' },
    { title: 'Kids Playing Outdoor',      category: 'human',      tags: ['crowd', 'ambient', 'loop'],         dur: 30000, price: 0,     access: 'PRO'      },
    // ANIMALS ───────────────────────────────────────────────────────
    { title: 'Dog Barking Aggressive',    category: 'animals',    tags: ['realistic', 'loud', 'short'],       dur: 2000,  price: 0,     access: 'FREE'     },
    { title: 'Cat Meow Soft',             category: 'animals',    tags: ['soft', 'short', 'realistic'],       dur: 800,   price: 0,     access: 'PRO'      },
    { title: 'Wolf Howl Night',           category: 'animals',    tags: ['loud', 'short', 'dark'],            dur: 4000,  price: 0,     access: 'PRO'      },
    { title: 'Eagle Screech',             category: 'animals',    tags: ['bird', 'short', 'loud'],            dur: 1500,  price: 0,     access: 'FREE'     },
    { title: 'Horse Gallop Fast',         category: 'animals',    tags: ['loop', 'realistic', 'loud'],        dur: 6000,  price: 0,     access: 'PRO'      },
    { title: 'Lion Roar Close',           category: 'animals',    tags: ['loud', 'short', 'realistic'],       dur: 3000,  price: 18000, access: 'PURCHASE' },
    { title: 'Crow Cawing Loop',          category: 'animals',    tags: ['bird', 'loop', 'dark'],             dur: 10000, price: 0,     access: 'PRO'      },
    // ELECTRONIC (SFX) ──────────────────────────────────────────────
    { title: 'Robot Voice Glitch',        category: 'electronic', tags: ['glitch', 'electronic', 'short'],    dur: 1200,  price: 0,     access: 'FREE'     },
    { title: 'Computer Startup Old',      category: 'electronic', tags: ['electronic', 'short', 'ui'],        dur: 3000,  price: 0,     access: 'PRO'      },
    { title: 'Sci-Fi Teleport Effect',    category: 'electronic', tags: ['electronic', 'whoosh', 'short'],    dur: 1800,  price: 15000, access: 'PURCHASE' },
    { title: 'Glitch Corrupted Signal',   category: 'electronic', tags: ['glitch', 'electronic', 'short'],    dur: 900,   price: 0,     access: 'PRO'      },
    { title: 'Digital Error Beep',        category: 'electronic', tags: ['electronic', 'short', 'ui'],        dur: 400,   price: 0,     access: 'FREE'     },
    { title: 'Hologram Interface Ping',   category: 'electronic', tags: ['electronic', 'sci-fi', 'short'],    dur: 800,   price: 0,     access: 'PRO'      },
    { title: 'Electric Surge Zap',        category: 'electronic', tags: ['electronic', 'loud', 'short'],      dur: 600,   price: 12000, access: 'PURCHASE' },
    // MAGIC ─────────────────────────────────────────────────────────
    { title: 'Magic Spell Cast',          category: 'magic',      tags: ['magic', 'spell', 'short'],          dur: 1500,  price: 0,     access: 'FREE'     },
    { title: 'Fairy Dust Sparkle',        category: 'magic',      tags: ['magic', 'soft', 'short'],           dur: 1000,  price: 0,     access: 'PRO'      },
    { title: 'Dark Magic Ritual',         category: 'magic',      tags: ['magic', 'dark', 'epic'],            dur: 5000,  price: 20000, access: 'PURCHASE' },
    { title: 'Healing Spell Chime',       category: 'magic',      tags: ['magic', 'soft', 'ambient'],         dur: 2500,  price: 0,     access: 'PRO'      },
    { title: 'Portal Open Whoosh',        category: 'magic',      tags: ['magic', 'whoosh', 'epic'],          dur: 3000,  price: 0,     access: 'PRO'      },
    // COMEDY ────────────────────────────────────────────────────────
    { title: 'Cartoon Boing Spring',      category: 'comedy',     tags: ['cartoon', 'bounce', 'short'],       dur: 600,   price: 0,     access: 'FREE'     },
    { title: 'Slide Whistle Down',        category: 'comedy',     tags: ['cartoon', 'short', 'soft'],         dur: 800,   price: 0,     access: 'PRO'      },
    { title: 'Funny Pop Bubble',          category: 'comedy',     tags: ['cartoon', 'short', 'soft'],         dur: 300,   price: 0,     access: 'FREE'     },
    { title: 'Clown Horn Honk',           category: 'comedy',     tags: ['cartoon', 'short', 'loud'],         dur: 500,   price: 0,     access: 'PRO'      },
    { title: 'Wacky Teeth Chatter',       category: 'comedy',     tags: ['cartoon', 'short', 'sfx'],          dur: 1200,  price: 10000, access: 'PURCHASE' },
    // SPORTS ────────────────────────────────────────────────────────
    { title: 'Boxing Punch Impact',       category: 'sports',     tags: ['punch', 'hit', 'short'],            dur: 400,   price: 0,     access: 'FREE'     },
    { title: 'Crowd Stadium Goal',        category: 'sports',     tags: ['crowd', 'applause', 'loud'],        dur: 6000,  price: 0,     access: 'PRO'      },
    { title: 'Whistle Referee Short',     category: 'sports',     tags: ['short', 'loud', 'sfx'],             dur: 500,   price: 0,     access: 'FREE'     },
    { title: 'Ball Kick Impact',          category: 'sports',     tags: ['hit', 'impact', 'short'],           dur: 400,   price: 0,     access: 'PRO'      },
    { title: 'Swimming Splash Dive',      category: 'sports',     tags: ['water', 'short', 'impact'],         dur: 1200,  price: 0,     access: 'PRO'      },
    { title: 'Race Car Start Signal',     category: 'sports',     tags: ['engine', 'loud', 'short'],          dur: 2000,  price: 15000, access: 'PURCHASE' },
    // INDUSTRIAL ────────────────────────────────────────────────────
    { title: 'Factory Machine Loop',      category: 'industrial', tags: ['loop', 'loud', 'realistic'],        dur: 30000, price: 0,     access: 'PRO'      },
    { title: 'Metal Hammer Strike',       category: 'industrial', tags: ['metal', 'impact', 'loud'],          dur: 800,   price: 0,     access: 'FREE'     },
    { title: 'Power Drill Running',       category: 'industrial', tags: ['loop', 'loud', 'realistic'],        dur: 5000,  price: 0,     access: 'PRO'      },
    { title: 'Chainsaw Motor Start',      category: 'industrial', tags: ['engine', 'loud', 'realistic'],      dur: 3000,  price: 0,     access: 'PRO'      },
    { title: 'Welding Spark Burst',       category: 'industrial', tags: ['metal', 'short', 'realistic'],      dur: 1500,  price: 18000, access: 'PURCHASE' },
    // MUSIC ─────────────────────────────────────────────────────────
    { title: 'Epic Orchestral Rise',      category: 'cinematic',       tags: ['cinematic', 'epic', 'orchestra'],  dur: 15000, price: 50000, access: 'PURCHASE' },
    { title: 'Dramatic Tension Build',    category: 'cinematic',       tags: ['cinematic', 'dark', 'loop'],       dur: 20000, price: 0,     access: 'PRO'      },
    { title: 'Trailer Boom Hit',          category: 'cinematic',       tags: ['cinematic', 'impact', 'loud'],     dur: 3000,  price: 0,     access: 'FREE'     },
    { title: 'Emotional Piano Strings',   category: 'cinematic',       tags: ['cinematic', 'soft', 'music'],      dur: 45000, price: 0,     access: 'PRO'      },
    { title: 'Action Chase Percussion',   category: 'cinematic',       tags: ['cinematic', 'epic', 'drum'],       dur: 30000, price: 35000, access: 'PURCHASE' },
    { title: 'Lo-fi Chill Beat',          category: 'electronic-music',tags: ['music', 'loop', 'ambient'],        dur: 60000, price: 30000, access: 'PURCHASE' },
    { title: 'EDM Drop Heavy',            category: 'electronic-music',tags: ['music', 'loop', 'loud'],           dur: 30000, price: 0,     access: 'PRO'      },
    { title: 'Synthwave Retro Loop',      category: 'electronic-music',tags: ['music', 'loop', 'ambient'],        dur: 60000, price: 0,     access: 'PRO'      },
    { title: 'Acoustic Guitar Calm',      category: 'acoustic',        tags: ['music', 'soft', 'loop'],           dur: 45000, price: 0,     access: 'FREE'     },
    { title: 'Piano Emotional',           category: 'acoustic',        tags: ['music', 'soft', 'cinematic'],      dur: 60000, price: 40000, access: 'PURCHASE' },
    { title: 'Fingerpick Guitar Loop',    category: 'acoustic',        tags: ['music', 'soft', 'loop'],           dur: 30000, price: 0,     access: 'PRO'      },
    { title: 'Film Score Tension',        category: 'sound-scoring',   tags: ['cinematic', 'music', 'dark'],      dur: 90000, price: 60000, access: 'PURCHASE' },
    { title: 'Documentary Underscore',    category: 'sound-scoring',   tags: ['cinematic', 'ambient', 'loop'],    dur: 120000,price: 0,     access: 'PRO'      },
    { title: 'Corporate Upbeat Track',    category: 'sound-scoring',   tags: ['music', 'loop', 'ambient'],        dur: 60000, price: 0,     access: 'PRO'      },
  ]

  let soundCount = 0
  let skippedCount = 0
  for (const s of dummySounds) {
    const catId = catMap[s.category]
    if (!catId) {
      console.warn(`  ⚠ Category "${s.category}" not found for "${s.title}", skipping`)
      continue
    }
    const baseSlug = slug(s.title)

    // ── upsert sound (tidak skip kalau sudah ada) ────────────────
    const sound = await prisma.soundEffect.upsert({
      where: { slug: baseSlug },
      update: {
        title: s.title,
        categoryId: catId,
        description: `${s.title} — high quality ${s.category} sound effect for professional use.`,
        durationMs: s.durationMs ?? s.dur,
        fileSize: Math.floor(s.dur * 0.176 * 1000),
        price: s.price,
        accessLevel: s.access as any,
        licenseType: s.access === 'PURCHASE' ? 'commercial' : 'personal',
        isPublished: true,
        reviewStatus: 'APPROVED',
      },
      create: {
        title: s.title,
        slug: baseSlug,
        categoryId: catId,
        authorId: admin.id,
        description: `${s.title} — high quality ${s.category} sound effect for professional use.`,
        fileUrl: '/uploads/sounds/7d2b69d0-c984-4d8e-95af-4adc7dce8469.wav',
        previewUrl: '/uploads/previews/2032b9f6-74e3-47df-bde8-f1d31dfaa80b-preview.mp3',
        waveformData: waveform(48),
        durationMs: s.dur,
        fileSize: Math.floor(s.dur * 0.176 * 1000),
        format: 'wav',
        price: s.price,
        accessLevel: s.access as any,
        licenseType: s.access === 'PURCHASE' ? 'commercial' : 'personal',
        isPublished: true,
        reviewStatus: 'APPROVED',
        publishedAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        playCount: Math.floor(Math.random() * 5000),
        downloadCount: Math.floor(Math.random() * 2000),
      },
    })

    // ── Attach tags ──────────────────────────────────────────────
    for (const tagSlug of s.tags) {
      const tagId = tagMap[tagSlug]
      if (!tagId) {
        console.warn(`  ⚠ Tag "${tagSlug}" not found, skipping for "${s.title}"`)
        continue
      }
      await prisma.soundEffectOnTag.upsert({
        where: { soundEffectId_tagId: { soundEffectId: sound.id, tagId } },
        update: {},
        create: { soundEffectId: sound.id, tagId },
      })
    }

    // ── Music vs SFX metadata ────────────────────────────────────
    if (catTypeMap[s.category] === 'music') {
      await prisma.musicMetadata.upsert({
        where: { soundId: sound.id },
        update: {},
        create: {
          soundId: sound.id,
          bpm: s.title.toLowerCase().includes('lo-fi') ? 82
             : s.title.toLowerCase().includes('edm')   ? 128
             : null,
          mood: s.tags.includes('dark') ? 'dark'
              : s.tags.includes('epic') ? 'epic'
              : s.tags.includes('soft') ? 'calm'
              : null,
          musicalKey: null,
          hasStems: false,
        },
      })

      // Map tag → genre slug (safely)
      const GENRE_TAG_MAP: Record<string, string> = {
        cinematic:  'cinematic',
        orchestra:  'orchestral',
        orchestral: 'orchestral',
        ambient:    'ambient',
        epic:       'epic',
        // 'music' tag maps to the category-derived genre
      }
      const genreSlugsRaw: string[] = s.tags.flatMap(t => {
        if (t === 'music') {
          // derive genre slug from category name (e.g. 'electronic-music' → 'electronic', 'acoustic' → 'acoustic')
          return [s.category.replace(/-music$/, '')]
        }
        return GENRE_TAG_MAP[t] ? [GENRE_TAG_MAP[t]] : []
      })

      for (const genreSlug of [...new Set(genreSlugsRaw)]) {
        const genre = await prisma.genre.upsert({
          where: { slug: genreSlug },
          update: {},
          create: {
            slug: genreSlug,
            name: genreSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          },
        })
        await prisma.soundGenre.upsert({
          where: { soundId_genreId: { soundId: sound.id, genreId: genre.id } },
          update: {},
          create: { soundId: sound.id, genreId: genre.id },
        })
      }
    } else {
      await prisma.sfxMetadata.upsert({
        where: { soundId: sound.id },
        update: {},
        create: { soundId: sound.id },
      })
    }
    soundCount++
  }
  console.log(`✓ ${soundCount} sounds seeded (${skippedCount} skipped)`)

  console.log('\n✅ Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
