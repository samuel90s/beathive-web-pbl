import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Plans ──────────────────────────────────────────────────
  const plans = [
    { name: 'Free', slug: 'free', priceMonthly: 0,     priceYearly: 0,      downloadLimit: 3,  commercialLicense: false, unlimited: false },
    { name: 'Pro',  slug: 'pro',  priceMonthly: 25000, priceYearly: 220000, downloadLimit: 20, commercialLicense: true,  unlimited: false },
    { name: 'Business', slug: 'business', priceMonthly: 299000, priceYearly: 2500000, downloadLimit: -1, commercialLicense: true, unlimited: true },
  ]

  for (const plan of plans) {
    await prisma.plan.upsert({ where: { slug: plan.slug }, update: plan, create: plan })
  }
  console.log('✓ Plans seeded')

  // ─── Categories ─────────────────────────────────────────────
  const categories = [
    // SFX
    { slug: 'foley',            name: 'Foley',              type: 'sfx'   },
    { slug: 'ambience',         name: 'Ambience',            type: 'sfx'   },
    { slug: 'soundscape',       name: 'Soundscape',          type: 'sfx'   },
    { slug: 'nature',           name: 'Nature & Weather',    type: 'sfx'   },
    { slug: 'explosions',       name: 'Explosions',          type: 'sfx'   },
    { slug: 'weapons',          name: 'Weapons & Combat',    type: 'sfx'   },
    { slug: 'vehicles',         name: 'Vehicles',            type: 'sfx'   },
    { slug: 'ui-game',          name: 'UI & Game',           type: 'sfx'   },
    { slug: 'horror',           name: 'Horror',              type: 'sfx'   },
    { slug: 'human',            name: 'Human & Crowd',       type: 'sfx'   },
    { slug: 'animals',          name: 'Animals',             type: 'sfx'   },
    { slug: 'electronic',       name: 'Electronic & Sci-Fi', type: 'sfx'   },
    { slug: 'comedy',           name: 'Comedy & Cartoon',    type: 'sfx'   },
    { slug: 'magic',            name: 'Magic & Fantasy',     type: 'sfx'   },
    { slug: 'sports',           name: 'Sports & Action',     type: 'sfx'   },
    { slug: 'industrial',       name: 'Industrial',          type: 'sfx'   },
    // Music
    { slug: 'sound-scoring',    name: 'Sound Scoring',       type: 'music' },
    { slug: 'game-music',       name: 'Game Music',          type: 'music' },
    { slug: 'cinematic',        name: 'Cinematic',           type: 'music' },
    { slug: 'ambient-music',    name: 'Ambient Music',       type: 'music' },
    { slug: 'electronic-music', name: 'Electronic Music',    type: 'music' },
    { slug: 'acoustic',         name: 'Acoustic',            type: 'music' },
    { slug: 'corporate',        name: 'Corporate',           type: 'music' },
    { slug: 'lo-fi',            name: 'Lo-fi',               type: 'music' },
    { slug: 'hip-hop',          name: 'Hip-Hop',             type: 'music' },
    { slug: 'rock',             name: 'Rock',                type: 'music' },
    { slug: 'pop',              name: 'Pop',                 type: 'music' },
    { slug: 'jazz',             name: 'Jazz',                type: 'music' },
    { slug: 'classical',        name: 'Classical',           type: 'music' },
    { slug: 'fantasy-music',    name: 'Fantasy Music',       type: 'music' },
    { slug: 'kids-music',       name: 'Kids Music',          type: 'music' },
    { slug: 'podcast-music',    name: 'Podcast Music',       type: 'music' },
    { slug: 'trailer-music',    name: 'Trailer Music',       type: 'music' },
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
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
    'sci-fi',
  ]

  for (const name of tagNames) {
    const tagSlug = name.replace(/\s+/g, '-')
    await prisma.tag.upsert({
      where:  { slug: tagSlug },
      update: { name },
      create: { name, slug: tagSlug },
    })
  }
  console.log('✓ Tags seeded')

  // ─── Music genres ────────────────────────────────────────────
  const musicGenres = [
    'Cinematic', 'Orchestral', 'Trailer', 'Ambient', 'Lo-fi', 'EDM',
    'Hip Hop', 'Trap', 'Acoustic', 'Piano', 'Corporate', 'Rock', 'Jazz',
    'Electronic',
  ]

  for (const name of musicGenres) {
    const genreSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    await prisma.genre.upsert({
      where:  { slug: genreSlug },
      update: { name },
      create: { name, slug: genreSlug },
    })
  }
  console.log('✓ Music genres seeded')

  // ─── Admin account ──────────────────────────────────────────
  const freePlan = await prisma.plan.findUnique({ where: { slug: 'free' } })

  const adminEmail    = 'admin@arsonus.com'
  const adminPassword = 'password123'
  const admin = await prisma.user.upsert({
    where:  { email: adminEmail },
    update: {},
    create: {
      email:        adminEmail,
      name:         'Admin Arsonus',
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role:         'ADMIN',
      provider:     'email',
    },
  })
  if (freePlan) {
    await prisma.subscription.upsert({
      where:  { userId: admin.id },
      update: {},
      create: {
        userId:           admin.id,
        planId:           freePlan.id,
        status:           'ACTIVE',
        billingCycle:     'MONTHLY',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })
  }
  console.log(`✓ Admin  → ${adminEmail} / ${adminPassword}`)

  // ─── Dummy Audio Assets ───────────────────────────────────
  // Generate fake waveform data (array of bar heights)
  if (process.env.SEED_DUMMY_DATA !== 'true') {
    console.log('Dummy audio dilewati. Set SEED_DUMMY_DATA=true untuk data demo.')
    return
  }

  const fakeWaveform = (len = 80) =>
    Array.from({ length: len }, () => Math.round(Math.random() * 100))

  // Fetch category & tag references
  const catMap: Record<string, string> = {}
  const allCats = await prisma.category.findMany()
  for (const c of allCats) catMap[c.slug] = c.id

  const tagMap: Record<string, string> = {}
  const allTags = await prisma.tag.findMany()
  for (const t of allTags) tagMap[t.slug] = t.id

  const genreMap: Record<string, string> = {}
  const allGenres = await prisma.genre.findMany()
  for (const g of allGenres) genreMap[g.slug] = g.id

  // ── SFX Assets ────────────────────────────────────────────
  const sfxAssets = [
    // Foley (3)
    {
      slug: 'footsteps-on-gravel',
      title: 'Footsteps on Gravel',
      description: 'Realistic footstep sounds walking on gravel path. Recorded with high-fidelity stereo microphones for maximum clarity.',
      categorySlug: 'foley',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 8500,
      fileSize: 1420000,
      format: 'wav',
      tags: ['footstep', 'realistic', 'short', 'sfx'],
      subcategory: 'Footsteps',
    },
    {
      slug: 'glass-shatter-impact',
      title: 'Glass Shatter Impact',
      description: 'Dramatic glass breaking sound effect with multiple shards falling. Perfect for cinematic scenes and game impacts.',
      categorySlug: 'foley',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 3200,
      fileSize: 540000,
      format: 'wav',
      tags: ['glass', 'impact', 'loud', 'realistic'],
      subcategory: 'Impacts',
    },
    {
      slug: 'wooden-door-creak',
      title: 'Wooden Door Creak',
      description: 'Old wooden door slowly opening with a creepy creak. Ideal for horror games, film scenes, and haunted house ambiences.',
      categorySlug: 'foley',
      accessLevel: 'PURCHASE' as const,
      price: 15000,
      durationMs: 4800,
      fileSize: 820000,
      format: 'wav',
      tags: ['wood', 'horror', 'realistic', 'dark'],
      subcategory: 'Doors',
    },

    // Ambience (3)
    {
      slug: 'busy-city-street',
      title: 'Busy City Street',
      description: 'Urban ambience with traffic, distant conversations, and city life. Seamless loop-ready recording for background atmosphere.',
      categorySlug: 'ambience',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 62000,
      fileSize: 10500000,
      format: 'wav',
      tags: ['crowd', 'ambient', 'loop', 'long'],
      subcategory: 'Urban',
    },
    {
      slug: 'rainy-night-cafe',
      title: 'Rainy Night Café',
      description: 'Cozy café ambience with gentle rain on windows, distant chatter, and soft clinking of cups. Perfect for lo-fi projects.',
      categorySlug: 'ambience',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 120000,
      fileSize: 20400000,
      format: 'wav',
      tags: ['rain', 'ambient', 'soft', 'loop'],
      subcategory: 'Indoor',
    },
    {
      slug: 'spaceship-interior-hum',
      title: 'Spaceship Interior Hum',
      description: 'Deep low-frequency spaceship engine room ambience with subtle electronic beeps. Great for sci-fi games and films.',
      categorySlug: 'ambience',
      accessLevel: 'PURCHASE' as const,
      price: 25000,
      durationMs: 90000,
      fileSize: 15300000,
      format: 'wav',
      tags: ['sci-fi', 'electronic', 'loop', 'dark'],
      subcategory: 'Sci-Fi',
    },

    // Soundscape (3)
    {
      slug: 'tropical-forest-morning',
      title: 'Tropical Forest Morning',
      description: 'Immersive tropical rainforest soundscape with birds singing, insects, and gentle breeze through the canopy.',
      categorySlug: 'soundscape',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 180000,
      fileSize: 30600000,
      format: 'wav',
      tags: ['nature', 'bird', 'forest', 'ambient'],
      subcategory: 'Nature',
    },
    {
      slug: 'ocean-waves-sunset',
      title: 'Ocean Waves at Sunset',
      description: 'Calming ocean waves crashing on a sandy beach with distant seagulls. Binaural recording for relaxation and meditation.',
      categorySlug: 'soundscape',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 240000,
      fileSize: 40800000,
      format: 'wav',
      tags: ['ocean', 'nature', 'soft', 'loop'],
      subcategory: 'Beach',
    },
    {
      slug: 'thunderstorm-wilderness',
      title: 'Thunderstorm in the Wilderness',
      description: 'Powerful thunderstorm with rolling thunder, heavy rain, and occasional lightning cracks. Dense atmospheric soundscape.',
      categorySlug: 'soundscape',
      accessLevel: 'PURCHASE' as const,
      price: 35000,
      durationMs: 300000,
      fileSize: 51000000,
      format: 'wav',
      tags: ['thunder', 'rain', 'nature', 'loud'],
      subcategory: 'Weather',
    },
  ]

  for (const sfx of sfxAssets) {
    const existing = await prisma.audioAsset.findUnique({ where: { slug: sfx.slug } })
    if (existing) {
      console.log(`  ⏭ SFX "${sfx.title}" already exists, skipping`)
      continue
    }

    const asset = await prisma.audioAsset.create({
      data: {
        assetType: 'SFX',
        categoryId: catMap[sfx.categorySlug],
        authorId: admin.id,
        title: sfx.title,
        slug: sfx.slug,
        description: sfx.description,
        fileUrl: `/uploads/sfx/${sfx.slug}.wav`,
        previewUrl: `/uploads/sfx/preview/${sfx.slug}.mp3`,
        waveformData: fakeWaveform(),
        durationMs: sfx.durationMs,
        fileSize: sfx.fileSize,
        format: sfx.format,
        price: sfx.price,
        accessLevel: sfx.accessLevel,
        licenseType: sfx.accessLevel === 'PRO' ? 'commercial' : 'personal',
        isPublished: true,
        publishedAt: new Date(),
        reviewStatus: 'APPROVED',
        reviewedAt: new Date(),
        playCount: Math.floor(Math.random() * 500),
        downloadCount: Math.floor(Math.random() * 200),
      },
    })

    // Connect tags
    for (const tagName of sfx.tags) {
      if (tagMap[tagName]) {
        await prisma.audioAssetOnTag.create({
          data: { audioAssetId: asset.id, tagId: tagMap[tagName] },
        })
      }
    }

    // Create SFX metadata
    await prisma.sfxMetadata.create({
      data: { assetId: asset.id, subcategory: sfx.subcategory },
    })

    console.log(`  ✓ SFX "${sfx.title}" [${sfx.accessLevel}]`)
  }
  console.log('✓ SFX assets seeded')

  // ── Music Assets ──────────────────────────────────────────
  const musicAssets = [
    // Sound Scoring (3)
    {
      slug: 'epic-hero-theme',
      title: 'Epic Hero Theme',
      description: 'Grand orchestral hero theme with soaring brass, thundering percussion, and uplifting string melodies. Perfect for game trailers.',
      categorySlug: 'sound-scoring',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 145000,
      fileSize: 24650000,
      format: 'wav',
      tags: ['epic', 'cinematic', 'orchestra', 'brass'],
      bpm: 120,
      mood: 'epic',
      musicalKey: 'D',
      genres: ['orchestral', 'cinematic', 'trailer'],
    },
    {
      slug: 'suspense-thriller-score',
      title: 'Suspense Thriller Score',
      description: 'Dark suspenseful orchestral track with tense strings, subtle piano, and building percussion. Great for mystery and thriller content.',
      categorySlug: 'sound-scoring',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 198000,
      fileSize: 33660000,
      format: 'wav',
      tags: ['dark', 'cinematic', 'orchestra', 'reverb'],
      bpm: 85,
      mood: 'tense',
      musicalKey: 'Em',
      genres: ['cinematic', 'orchestral'],
    },
    {
      slug: 'emotional-piano-ballad',
      title: 'Emotional Piano Ballad',
      description: 'Heartfelt solo piano piece with gentle dynamics and emotional chord progressions. Ideal for documentary, drama, and emotional scenes.',
      categorySlug: 'sound-scoring',
      accessLevel: 'PURCHASE' as const,
      price: 45000,
      durationMs: 210000,
      fileSize: 35700000,
      format: 'wav',
      tags: ['cinematic', 'soft', 'reverb'],
      bpm: 72,
      mood: 'sad',
      musicalKey: 'C',
      genres: ['piano', 'cinematic'],
    },

    // Cinematic (3)
    {
      slug: 'cinematic-trailer-rise',
      title: 'Cinematic Trailer Rise',
      description: 'Powerful cinematic riser with massive sub drops, orchestral hits, and hybrid electronic elements. Designed for epic trailer edits.',
      categorySlug: 'cinematic',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 95000,
      fileSize: 16150000,
      format: 'wav',
      tags: ['cinematic', 'epic', 'impact', 'transition'],
      bpm: 140,
      mood: 'epic',
      musicalKey: 'G',
      genres: ['trailer', 'cinematic'],
    },
    {
      slug: 'dark-ambient-drone',
      title: 'Dark Ambient Drone',
      description: 'Eerie dark ambient drone with haunting textures and evolving atmospherics. Perfect for horror films, psychological thrillers, and dark games.',
      categorySlug: 'cinematic',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 320000,
      fileSize: 54400000,
      format: 'wav',
      tags: ['dark', 'ambient', 'horror', 'loop'],
      bpm: 60,
      mood: 'dark',
      musicalKey: 'Dm',
      genres: ['ambient', 'cinematic'],
    },
    {
      slug: 'victorious-fanfare',
      title: 'Victorious Fanfare',
      description: 'Triumphant brass fanfare with massive timpani rolls and full orchestra crescendo. Ideal for victory screens, award ceremonies, and celebrations.',
      categorySlug: 'cinematic',
      accessLevel: 'PURCHASE' as const,
      price: 55000,
      durationMs: 48000,
      fileSize: 8160000,
      format: 'wav',
      tags: ['epic', 'brass', 'orchestra', 'loud'],
      bpm: 130,
      mood: 'happy',
      musicalKey: 'Bb',
      genres: ['orchestral', 'cinematic', 'trailer'],
    },

    // Electronic Music (3)
    {
      slug: 'lofi-chill-beat',
      title: 'Lo-fi Chill Beat',
      description: 'Relaxing lo-fi hip hop beat with warm vinyl crackle, mellow keys, and laid-back drums. Perfect for study streams and chill content.',
      categorySlug: 'electronic-music',
      accessLevel: 'FREE' as const,
      price: 0,
      durationMs: 175000,
      fileSize: 29750000,
      format: 'wav',
      tags: ['electronic', 'soft', 'loop', 'drum'],
      bpm: 82,
      mood: 'calm',
      musicalKey: 'F',
      genres: ['lo-fi', 'hip-hop'],
    },
    {
      slug: 'cyberpunk-synth-wave',
      title: 'Cyberpunk Synthwave',
      description: 'Retro-futuristic synthwave track with pulsating arpeggios, heavy basslines, and neon-soaked atmosphere. Great for gaming and cyberpunk content.',
      categorySlug: 'electronic-music',
      accessLevel: 'PRO' as const,
      price: 0,
      durationMs: 230000,
      fileSize: 39100000,
      format: 'wav',
      tags: ['electronic', 'glitch', 'sci-fi', 'dark'],
      bpm: 118,
      mood: 'dark',
      musicalKey: 'Am',
      genres: ['electronic', 'edm'],
    },
    {
      slug: 'festival-drop-anthem',
      title: 'Festival Drop Anthem',
      description: 'High-energy festival EDM track with massive build-ups, crushing bass drops, and euphoric melodies. Designed for trailers and hype content.',
      categorySlug: 'electronic-music',
      accessLevel: 'PURCHASE' as const,
      price: 65000,
      durationMs: 265000,
      fileSize: 45050000,
      format: 'wav',
      tags: ['electronic', 'loud', 'drum', 'impact'],
      bpm: 150,
      mood: 'upbeat',
      musicalKey: 'E',
      genres: ['edm', 'electronic'],
    },
  ]

  for (const music of musicAssets) {
    const existing = await prisma.audioAsset.findUnique({ where: { slug: music.slug } })
    if (existing) {
      console.log(`  ⏭ Music "${music.title}" already exists, skipping`)
      continue
    }

    const asset = await prisma.audioAsset.create({
      data: {
        assetType: 'MUSIC',
        categoryId: catMap[music.categorySlug],
        authorId: admin.id,
        title: music.title,
        slug: music.slug,
        description: music.description,
        fileUrl: `/uploads/music/${music.slug}.wav`,
        previewUrl: `/uploads/music/preview/${music.slug}.mp3`,
        waveformData: fakeWaveform(),
        durationMs: music.durationMs,
        fileSize: music.fileSize,
        format: music.format,
        price: music.price,
        accessLevel: music.accessLevel,
        licenseType: music.accessLevel === 'PURCHASE' ? 'commercial' : music.accessLevel === 'PRO' ? 'commercial' : 'personal',
        bpm: music.bpm,
        mood: music.mood,
        musicalKey: music.musicalKey,
        isPublished: true,
        publishedAt: new Date(),
        reviewStatus: 'APPROVED',
        reviewedAt: new Date(),
        playCount: Math.floor(Math.random() * 1000),
        downloadCount: Math.floor(Math.random() * 400),
      },
    })

    // Connect tags
    for (const tagName of music.tags) {
      if (tagMap[tagName]) {
        await prisma.audioAssetOnTag.create({
          data: { audioAssetId: asset.id, tagId: tagMap[tagName] },
        })
      }
    }

    // Create Music metadata
    await prisma.musicMetadata.create({
      data: {
        assetId: asset.id,
        bpm: music.bpm,
        mood: music.mood,
        musicalKey: music.musicalKey,
      },
    })

    // Connect genres
    for (const genreName of music.genres) {
      const genreSlug = genreName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      if (genreMap[genreSlug]) {
        await prisma.audioAssetGenre.create({
          data: { assetId: asset.id, genreId: genreMap[genreSlug] },
        })
      }
    }

    console.log(`  ✓ Music "${music.title}" [${music.accessLevel}]`)
  }
  console.log('✓ Music assets seeded')

  // Admin dashboard demo statistics
  const addMonths = (date: Date, months: number) => {
    const next = new Date(date)
    next.setMonth(next.getMonth() + months)
    return next
  }

  const makeDate = (monthsAgo: number, day: number) => {
    const date = new Date()
    date.setDate(1)
    date.setHours(10, 0, 0, 0)
    date.setMonth(date.getMonth() - monthsAgo)
    date.setDate(Math.min(day, 25))
    return date
  }

  const planMap: Record<string, string> = {}
  for (const plan of await prisma.plan.findMany()) planMap[plan.slug] = plan.id

  const demoUsers = [
    { email: 'maya.creator@arsonus.local', name: 'Maya Creator', planSlug: 'pro' },
    { email: 'raka.editor@arsonus.local', name: 'Raka Editor', planSlug: 'business' },
    { email: 'nina.studio@arsonus.local', name: 'Nina Studio', planSlug: 'pro' },
    { email: 'dimas.film@arsonus.local', name: 'Dimas Film', planSlug: 'free' },
    { email: 'sari.games@arsonus.local', name: 'Sari Games', planSlug: 'business' },
  ]

  const demoUserIds: string[] = []
  for (const demoUser of demoUsers) {
    const user = await prisma.user.upsert({
      where: { email: demoUser.email },
      update: { name: demoUser.name, role: 'USER', emailVerified: true },
      create: {
        email: demoUser.email,
        name: demoUser.name,
        passwordHash: await bcrypt.hash('password123', 10),
        role: 'USER',
        provider: 'email',
        emailVerified: true,
      },
    })
    demoUserIds.push(user.id)

    if (planMap[demoUser.planSlug]) {
      await prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          planId: planMap[demoUser.planSlug],
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodEnd: addMonths(new Date(), 1),
          cancelledAt: null,
        },
        create: {
          userId: user.id,
          planId: planMap[demoUser.planSlug],
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          currentPeriodEnd: addMonths(new Date(), 1),
        },
      })
    }
  }

  const statusOverrides = [
    { slug: 'footsteps-on-gravel', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'glass-shatter-impact', reviewStatus: 'PENDING', isPublished: false },
    { slug: 'wooden-door-creak', reviewStatus: 'REJECTED', isPublished: false },
    { slug: 'busy-city-street', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'rainy-night-cafe', reviewStatus: 'NEEDS_RE_REVIEW', isPublished: false },
    { slug: 'spaceship-interior-hum', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'tropical-forest-morning', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'ocean-waves-sunset', reviewStatus: 'PENDING', isPublished: false },
    { slug: 'thunderstorm-wilderness', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'epic-hero-theme', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'suspense-thriller-score', reviewStatus: 'NEEDS_RE_REVIEW', isPublished: false },
    { slug: 'emotional-piano-ballad', reviewStatus: 'REJECTED', isPublished: false },
    { slug: 'cinematic-trailer-rise', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'dark-ambient-drone', reviewStatus: 'PENDING', isPublished: false },
    { slug: 'victorious-fanfare', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'lofi-chill-beat', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'cyberpunk-synth-wave', reviewStatus: 'APPROVED', isPublished: true },
    { slug: 'festival-drop-anthem', reviewStatus: 'APPROVED', isPublished: true },
  ]

  for (const item of statusOverrides) {
    await prisma.audioAsset.updateMany({
      where: { slug: item.slug },
      data: {
        reviewStatus: item.reviewStatus,
        isPublished: item.isPublished,
        publishedAt: item.isPublished ? new Date() : null,
        reviewedAt: item.reviewStatus === 'PENDING' ? null : new Date(),
        reviewNote: item.reviewStatus === 'REJECTED' ? 'Demo rejected item for admin statistics.' : null,
      },
    })
  }

  const demoAssets = await prisma.audioAsset.findMany({
    where: { slug: { in: [...sfxAssets.map((asset) => asset.slug), ...musicAssets.map((asset) => asset.slug)] } },
    select: { id: true, slug: true },
  })
  const demoAssetBySlug = new Map(demoAssets.map((asset) => [asset.slug, asset]))

  const demoOrders = [
    { code: 'DEMO-ORDER-001', monthsAgo: 5, day: 5, status: 'PAID', amount: 45000, assetSlug: 'emotional-piano-ballad', userIndex: 0 },
    { code: 'DEMO-ORDER-002', monthsAgo: 5, day: 18, status: 'PAID', amount: 65000, assetSlug: 'festival-drop-anthem', userIndex: 1 },
    { code: 'DEMO-ORDER-003', monthsAgo: 4, day: 9, status: 'PAID', amount: 25000, assetSlug: 'spaceship-interior-hum', userIndex: 2 },
    { code: 'DEMO-ORDER-004', monthsAgo: 4, day: 21, status: 'FAILED', amount: 55000, assetSlug: 'victorious-fanfare', userIndex: 3 },
    { code: 'DEMO-ORDER-005', monthsAgo: 3, day: 3, status: 'PAID', amount: 35000, assetSlug: 'thunderstorm-wilderness', userIndex: 4 },
    { code: 'DEMO-ORDER-006', monthsAgo: 3, day: 17, status: 'PAID', amount: 55000, assetSlug: 'victorious-fanfare', userIndex: 0 },
    { code: 'DEMO-ORDER-007', monthsAgo: 2, day: 7, status: 'PENDING', amount: 65000, assetSlug: 'festival-drop-anthem', userIndex: 1 },
    { code: 'DEMO-ORDER-008', monthsAgo: 2, day: 14, status: 'PAID', amount: 15000, assetSlug: 'wooden-door-creak', userIndex: 2 },
    { code: 'DEMO-ORDER-009', monthsAgo: 1, day: 4, status: 'PAID', amount: 45000, assetSlug: 'emotional-piano-ballad', userIndex: 3 },
    { code: 'DEMO-ORDER-010', monthsAgo: 1, day: 20, status: 'CANCELLED', amount: 25000, assetSlug: 'spaceship-interior-hum', userIndex: 4 },
    { code: 'DEMO-ORDER-011', monthsAgo: 0, day: 6, status: 'PAID', amount: 65000, assetSlug: 'festival-drop-anthem', userIndex: 0 },
    { code: 'DEMO-ORDER-012', monthsAgo: 0, day: 19, status: 'PAID', amount: 55000, assetSlug: 'victorious-fanfare', userIndex: 1 },
    { code: 'DEMO-ORDER-013', monthsAgo: 0, day: 23, status: 'REFUNDED', amount: 35000, assetSlug: 'thunderstorm-wilderness', userIndex: 2 },
  ]

  for (const demoOrder of demoOrders) {
    const asset = demoAssetBySlug.get(demoOrder.assetSlug)
    const userId = demoUserIds[demoOrder.userIndex % demoUserIds.length]
    if (!asset || !userId) continue

    const createdAt = makeDate(demoOrder.monthsAgo, demoOrder.day)
    const paidAt = demoOrder.status === 'PAID' ? createdAt : null
    const existingOrder = await prisma.order.findFirst({ where: { gatewayOrderId: demoOrder.code } })

    const order = existingOrder
      ? await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            userId,
            totalAmount: demoOrder.amount,
            status: demoOrder.status as any,
            paidAt,
            createdAt,
            updatedAt: createdAt,
          },
        })
      : await prisma.order.create({
          data: {
            userId,
            totalAmount: demoOrder.amount,
            status: demoOrder.status as any,
            gatewayOrderId: demoOrder.code,
            paidAt,
            createdAt,
            updatedAt: createdAt,
          },
        })

    const existingItem = await prisma.orderItem.findFirst({ where: { orderId: order.id, audioAssetId: asset.id } })
    if (!existingItem) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          audioAssetId: asset.id,
          priceSnapshot: demoOrder.amount,
          licenseType: demoOrder.amount >= 45000 ? 'commercial' : 'personal',
        },
      })
    }
  }

  console.log('Admin dashboard demo statistics seeded')

  console.log('Seed complete!')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
