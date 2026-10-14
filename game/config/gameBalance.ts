/**
 * Baseline balancing & konstanta dunia (PRD §8).
 * Satu-satunya sumber kebenaran angka gameplay/rendering — kode entity
 * dan system wajib mengimpor dari sini, tidak menduplikasi konstanta.
 *
 * Tahap 1 mencakup WORLD / RENDER / STARFIELD / SHIP.
 * Angka combat (damage, cooldown, wave) ditambahkan di Tahap 2–4
 * pada file yang sama.
 */

export const WORLD = {
  /** Setengah tinggi frustum orthographic dalam world unit. */
  halfHeight: 5,
  /** Lebar zona gerak pemain, diukur dari batas kiri dunia. */
  playerZoneWidth: 6,
  /** Margin dalam dari tepi arena untuk zona pemain. */
  playerMargin: 0.6,
  /** Offset spawn di luar batas kanan agar entity tidak pop-in. */
  spawnMarginX: 2,
} as const

export const RENDER = {
  maxDprDesktop: 2,
  maxDprMobile: 1.5,
  /** Batas delta time per tick agar tab-lag tidak menimbulkan lompatan (PRD §11.4). */
  maxDeltaSeconds: 0.05,
  cameraZ: 10,
  backgroundColor: 0x05070d,
} as const

export const STARFIELD = {
  layers: [
    { count: 380, size: 1.6, speed: 0.7, color: 0x9fb6d8, depth: -6, opacity: 0.85 },
    { count: 220, size: 2.6, speed: 1.6, color: 0x46e6ff, depth: -3, opacity: 0.7 },
    { count: 120, size: 3.4, speed: 3.2, color: 0xffffff, depth: -1.5, opacity: 0.9 },
  ],
} as const

/** Nebula prosedural (sprite gradient canvas, tanpa asset eksternal). */
export const NEBULA = {
  sprites: [
    { inner: '#16455e', scale: 15, depth: -9, drift: 0.12, parallaxY: 0.05, x: -5, y: 2.5 },
    { inner: '#3a1e5c', scale: 19, depth: -12, drift: 0.08, parallaxY: 0.09, x: 5, y: -2 },
    { inner: '#0d3a3e', scale: 11, depth: -7, drift: 0.18, parallaxY: 0.03, x: 1, y: 0.5 },
  ],
  opacity: 0.55,
} as const

/** Model GLB pemain: dinormalisasi ke panjang target, menghadap +X. */
export const SHIP_MODEL = {
  /** Panjang siluet setelah normalisasi (world unit, ≈ placeholder). */
  targetLength: 3.2,
  /** Yaw asumsi model menghadap +Z → +X. Diverifikasi via screenshot Tahap 7. */
  yawRadians: Math.PI / 2,
} as const

/**
 * Model GLB musuh/hazard/boss. Panjang ≈ 2× radius hitbox agar siluet
 * sedikit melebihi hitbox yang adil (PRD §11.5). Model musuh berhidung
 * +Y → roll +90° merebahkannya menghadap −X (ke arah pemain).
 */
export const ENTITY_MODEL = {
  scout: { targetLength: 1.4, yawRadians: 0, rollRadians: Math.PI / 2 },
  interceptor: { targetLength: 1.5, yawRadians: 0, rollRadians: Math.PI / 2 },
  heavy: { targetLength: 2.0, yawRadians: 0, rollRadians: Math.PI / 2 },
  asteroid: { targetLength: 1.7, yawRadians: 0, rollRadians: 0 },
  boss: { targetLength: 3.0, yawRadians: 0, rollRadians: Math.PI / 2 },
} as const

/** Sampel SFX (HTMLAudio pool); synth tetap fallback bila file gagal. */
export const AUDIO = {
  shootPoolSize: 4,
  explosionPoolSize: 3,
  shootGain: 0.5,
  explosionGain: 0.8,
  introGain: 0.7,
} as const

export const SHIP = {
  hullColor: 0x2b313d,
  darkPanelColor: 0x12151c,
  accentColor: 0x46e6ff,
  engineEmissiveIntensity: 2.2,
} as const

/** Gerakan pemain (PRD §8.1). */
export const PLAYER = {
  /** Kecepatan gerak world unit/detik. */
  speed: 7,
  /** Hitbox sedikit lebih kecil dari siluet visual agar terasa adil (PRD §11.5). */
  radius: 0.55,
  /** Offset muzzle dari pusat kapal (ujung hidung placeholder). */
  muzzleOffsetX: 2.2,
  hullMax: 100,
  shieldMax: 100,
  /** Invulnerability window setelah terkena hit (PRD §8.1). */
  invulnSeconds: 0.75,
  /** Shield regen dimulai setelah jeda tanpa damage (PRD §8.2). */
  shieldRegenDelaySeconds: 5,
  shieldRegenPerSecond: 12,
} as const

/** Primary weapon auto-fire (PRD §8.3). */
export const PRIMARY = {
  cooldownSeconds: 0.22,
  projectileSpeed: 18,
  damage: 1,
  projectileRadius: 0.18,
  lifetimeSeconds: 2,
} as const

/** Special weapon manual: salvo 3 misil homing terbatas (PRD §8.4). */
export const SPECIAL = {
  cooldownSeconds: 8,
  missileCount: 3,
  missileSpeed: 14,
  missileDamage: 6,
  missileLifeSeconds: 3,
  /** Batas steering homing radian/detik. */
  missileTurnRate: 3,
  missileRadius: 0.25,
  /** Sebaran vertikal awal salvo. */
  spreadVelocityY: [-1.6, 0, 1.6],
} as const

/** Musuh (PRD §8.5): scout + interceptor + heavy. */
export const ENEMY = {
  scout: {
    hp: 2,
    speed: 2.2,
    radius: 0.6,
    contactDamage: 10,
  },
  interceptor: {
    hp: 4,
    speed: 3,
    radius: 0.6,
    contactDamage: 15,
    fireIntervalSeconds: 2.5,
    projectileSpeed: 7,
    projectileDamage: 8,
    weaveAmplitude: 1.2,
    weaveFrequency: 2,
  },
  heavy: {
    hp: 10,
    speed: 1.4,
    radius: 0.9,
    contactDamage: 25,
    fireIntervalSeconds: 3.5,
    projectileSpeed: 6,
    projectileDamage: 15,
  },
} as const

/** Hazard (PRD §8.6): asteroid dapat dihancurkan, mine lambat. */
export const HAZARD = {
  asteroid: {
    hp: 3,
    speed: 1.8,
    radius: 0.8,
    contactDamage: 20,
  },
  mine: {
    hp: 2,
    speed: 0.9,
    radius: 0.55,
    contactDamage: 15,
  },
} as const

/** Proyektil musuh: aimed shot saat ditembak, dibatasi jumlahnya (PRD §8.7). */
export const ENEMY_PROJECTILE = {
  radius: 0.22,
  lifeSeconds: 4,
} as const

/** Pickup (PRD §8.8). Weapon charge = kurangi sisa cooldown 3 dtk (final). */
export const PICKUP = {
  radius: 0.5,
  driftSpeed: 1.2,
  lifeSeconds: 15,
  hullAmount: 25,
  shieldAmount: 35,
  specialReductionSeconds: 3,
  dropChance: {
    scout: 0.08,
    interceptor: 0.12,
    heavy: 0.25,
    asteroid: 0.05,
    mine: 0.08,
  },
} as const

export const POOLS = {
  maxPlayerProjectiles: 64,
  maxEnemies: 14,
  maxEnemyProjectiles: 48,
  maxPickups: 16,
  maxMissiles: 12,
  maxHitRings: 6,
} as const

/** Skor (PRD §8.10): survival + kill reward + boss bonus, integer saat tampil. */
export const SCORE = {
  survivalPerSecond: 10,
  kill: {
    scout: 100,
    interceptor: 200,
    heavy: 400,
    asteroid: 50,
    mine: 50,
  },
  bossBase: 1500,
  bossPerWave: 100,
} as const

/** Wave + difficulty scaling dengan cap (PRD §8.9–8.10). */
export const WAVE = {
  quotaBase: 6,
  quotaPerWave: 2,
  quotaMax: 20,
  intervalDecay: 0.94,
  minIntervalSeconds: 0.45,
  speedPerWave: 0.04,
  speedMax: 1.4,
  fireIntervalPerWave: 0.03,
  fireIntervalMinScale: 0.5,
  unlockInterceptor: 2,
  unlockHeavy: 4,
  unlockMine: 2,
  bossEveryWaves: 3,
} as const

/** Boss: satu archetype, dua pola serangan (PRD §8.5, §8.9). */
export const BOSS = {
  name: 'VOIDWARDEN',
  hpBase: 120,
  hpPerBoss: 30,
  radius: 1.4,
  contactDamage: 30,
  anchorMargin: 3,
  enterSpeed: 6,
  hoverSpeed: 1.2,
  telegraphSeconds: 1.5,
  salvoIntervalSeconds: 2.2,
  salvoCount: 3,
  salvoSpread: 0.08,
  salvoSpeed: 7,
  salvoDamage: 10,
  fanIntervalSeconds: 3.5,
  fanCount: 5,
  fanSpread: 0.6,
  fanSpeed: 6,
  fanDamage: 8,
  dropPickups: 1,
  dropSecondChance: 0.5,
} as const

/** Efek visual + audio synth (PRD §9.1, Tahap 5). */
export const FX = {
  muzzleLifeSeconds: 0.06,
  muzzleWidth: 0.7,
  muzzleHeight: 0.3,
  shakeDurationSeconds: 0.25,
  shakeMagnitude: 0.3,
  killRingScale: 1,
  bossRingScale: 2.2,
} as const
