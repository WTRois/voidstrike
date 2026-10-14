import { CHASE, POOLS, PRIMARY } from '../config/gameBalance'

export interface ProjectileSpec {
  x: number
  y: number
  z: number
  velocityZ: number
  damage: number
}

/** Proyektil pooled: tanpa alokasi saat update (PRD §15.1). Terbang −Z. */
export class Projectile {
  x = 0
  y = 0
  z = 0
  velocityZ = 0
  damage: number = PRIMARY.damage
  life = 0
  active = false
  readonly radius = PRIMARY.projectileRadius

  spawn(spec: ProjectileSpec): void {
    this.x = spec.x
    this.y = spec.y
    this.z = spec.z
    this.velocityZ = spec.velocityZ
    this.damage = spec.damage
    this.life = PRIMARY.lifetimeSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    this.z += this.velocityZ * dtSeconds
    this.life -= dtSeconds
    if (this.life <= 0 || this.z < CHASE.killZ) {
      this.active = false
    }
  }
}

export class ProjectilePool {
  readonly items: Projectile[] = []

  constructor(size: number = POOLS.maxPlayerProjectiles) {
    for (let i = 0; i < size; i += 1) {
      this.items.push(new Projectile())
    }
  }

  /** Tembak dari pool; null bila penuh (cap eksplisit, PRD §15.1). */
  fire(spec: ProjectileSpec): Projectile | null {
    for (const item of this.items) {
      if (!item.active) {
        item.spawn(spec)
        return item
      }
    }
    return null
  }

  update(dtSeconds: number): void {
    for (const item of this.items) {
      item.update(dtSeconds)
    }
  }

  clear(): void {
    for (const item of this.items) {
      item.deactivate()
    }
  }

  get activeCount(): number {
    let count = 0
    for (const item of this.items) {
      if (item.active) {
        count += 1
      }
    }
    return count
  }
}
