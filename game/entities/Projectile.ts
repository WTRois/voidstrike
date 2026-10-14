import { POOLS, PRIMARY } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

export interface ProjectileSpec {
  x: number
  y: number
  velocityX: number
  damage: number
}

/** Proyektil pooled: tanpa alokasi saat update (PRD §15.1). */
export class Projectile {
  x = 0
  y = 0
  velocityX = 0
  damage: number = PRIMARY.damage
  life = 0
  active = false
  readonly radius = PRIMARY.projectileRadius

  spawn(spec: ProjectileSpec): void {
    this.x = spec.x
    this.y = spec.y
    this.velocityX = spec.velocityX
    this.damage = spec.damage
    this.life = PRIMARY.lifetimeSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number, bounds: WorldBounds): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    this.x += this.velocityX * dtSeconds
    this.life -= dtSeconds
    if (this.life <= 0 || this.x > bounds.maxX + 2 || this.x < bounds.minX - 2) {
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

  update(dtSeconds: number, bounds: WorldBounds): void {
    for (const item of this.items) {
      item.update(dtSeconds, bounds)
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
