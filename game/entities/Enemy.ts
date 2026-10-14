import { ENEMY, HAZARD } from '../config/gameBalance'

/** Musuh + hazard Tahap 3 (PRD §8.5–8.6). Wave/boss masuk Tahap 4. */
export type EnemyKind = 'scout' | 'interceptor' | 'heavy' | 'asteroid' | 'mine'

interface KindStats {
  hp: number
  speed: number
  radius: number
  contactDamage: number
  fireIntervalSeconds: number
  projectileSpeed: number
  projectileDamage: number
  weaveAmplitude: number
  weaveFrequency: number
  canShoot: boolean
}

const STATS: Record<EnemyKind, KindStats> = {
  scout: {
    ...ENEMY.scout,
    fireIntervalSeconds: 0,
    projectileSpeed: 0,
    projectileDamage: 0,
    weaveAmplitude: 0,
    weaveFrequency: 0,
    canShoot: false,
  },
  interceptor: { ...ENEMY.interceptor, canShoot: true },
  heavy: { ...ENEMY.heavy, weaveAmplitude: 0, weaveFrequency: 0, canShoot: true },
  asteroid: {
    ...HAZARD.asteroid,
    fireIntervalSeconds: 0,
    projectileSpeed: 0,
    projectileDamage: 0,
    weaveAmplitude: 0,
    weaveFrequency: 0,
    canShoot: false,
  },
  mine: {
    ...HAZARD.mine,
    fireIntervalSeconds: 0,
    projectileSpeed: 0,
    projectileDamage: 0,
    weaveAmplitude: 0,
    weaveFrequency: 0,
    canShoot: false,
  },
}

export class Enemy {
  x = 0
  y = 0
  hp = 0
  active = false
  kind: EnemyKind = 'scout'
  baseY = 0
  phase = 0
  spin = 0
  spinAngle = 0
  fireTimer = 0
  /** Difficulty scaling Tahap 4 (diatur engine saat spawn, default netral). */
  speedScale = 1
  intervalScale = 1

  get radius(): number {
    return STATS[this.kind].radius
  }

  get speed(): number {
    return STATS[this.kind].speed
  }

  get contactDamage(): number {
    return STATS[this.kind].contactDamage
  }

  get canShoot(): boolean {
    return STATS[this.kind].canShoot
  }

  get projectileSpeed(): number {
    return STATS[this.kind].projectileSpeed
  }

  get projectileDamage(): number {
    return STATS[this.kind].projectileDamage
  }

  spawn(x: number, y: number, kind: EnemyKind): void {
    this.x = x
    this.y = y
    this.kind = kind
    this.hp = STATS[kind].hp
    this.baseY = y
    this.phase = Math.random() * Math.PI * 2
    this.spin = (Math.random() - 0.5) * 2
    this.spinAngle = 0
    this.speedScale = 1
    this.intervalScale = 1
    this.fireTimer = STATS[kind].fireIntervalSeconds * (0.5 + Math.random() * 0.5)
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number, elapsedSeconds: number): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    this.x -= this.speed * this.speedScale * dtSeconds
    const stats = STATS[this.kind]
    if (stats.weaveAmplitude > 0) {
      this.y =
        this.baseY +
        Math.sin(elapsedSeconds * stats.weaveFrequency + this.phase) * stats.weaveAmplitude
    }
  }

  /** Hitung mundur tembakan; true saat siap menembak (engine me-reset timer). */
  updateFire(dtSeconds: number): boolean {
    if (!this.active || !this.canShoot || dtSeconds <= 0) {
      return false
    }
    this.fireTimer -= dtSeconds
    if (this.fireTimer <= 0) {
      this.fireTimer =
        STATS[this.kind].fireIntervalSeconds * this.intervalScale * (0.8 + Math.random() * 0.4)
      return true
    }
    return false
  }

  /** Terima damage; true bila hancur. Entity nonaktif diabaikan. */
  damage(amount: number): boolean {
    if (!this.active) {
      return false
    }
    this.hp -= amount
    if (this.hp <= 0) {
      this.active = false
      return true
    }
    return false
  }
}
