import { ENEMY_PROJECTILE, POOLS } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

export interface EnemyShotSpec {
  x: number
  y: number
  velocityX: number
  velocityY: number
  damage: number
}

/** Proyektil musuh: aimed shot yang dihitung saat ditembak (PRD §8.7). */
export class EnemyProjectile {
  x = 0
  y = 0
  velocityX = 0
  velocityY = 0
  damage = 0
  life = 0
  active = false
  readonly radius = ENEMY_PROJECTILE.radius

  spawn(spec: EnemyShotSpec): void {
    this.x = spec.x
    this.y = spec.y
    this.velocityX = spec.velocityX
    this.velocityY = spec.velocityY
    this.damage = spec.damage
    this.life = ENEMY_PROJECTILE.lifeSeconds
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
    this.y += this.velocityY * dtSeconds
    this.life -= dtSeconds
    if (
      this.life <= 0 ||
      this.x < bounds.minX - 2 ||
      this.x > bounds.maxX + 2 ||
      this.y < bounds.minY - 2 ||
      this.y > bounds.maxY + 2
    ) {
      this.active = false
    }
  }
}

export class EnemyProjectilePool {
  readonly items: EnemyProjectile[] = []

  constructor(size: number = POOLS.maxEnemyProjectiles) {
    for (let i = 0; i < size; i += 1) {
      this.items.push(new EnemyProjectile())
    }
  }

  fire(spec: EnemyShotSpec): EnemyProjectile | null {
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
