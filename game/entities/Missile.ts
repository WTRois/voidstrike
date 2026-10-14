import { POOLS, SPECIAL } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

function wrapAngle(radians: number): number {
  while (radians > Math.PI) {
    radians -= Math.PI * 2
  }
  while (radians < -Math.PI) {
    radians += Math.PI * 2
  }
  return radians
}

/**
 * Misil special weapon: homing dengan steering dibatasi (PRD §8.4).
 * Target diakuisisi ulang tiap tick oleh engine; tanpa target → lurus.
 */
export class Missile {
  x = 0
  y = 0
  velocityX = 0
  velocityY = 0
  damage: number = SPECIAL.missileDamage
  life = 0
  active = false
  readonly radius = SPECIAL.missileRadius

  launch(x: number, y: number, velocityX: number, velocityY: number): void {
    this.x = x
    this.y = y
    this.velocityX = velocityX
    this.velocityY = velocityY
    this.damage = SPECIAL.missileDamage
    this.life = SPECIAL.missileLifeSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number, target: { x: number; y: number } | null, bounds: WorldBounds): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    if (target !== null) {
      const current = Math.atan2(this.velocityY, this.velocityX)
      const desired = Math.atan2(target.y - this.y, target.x - this.x)
      const diff = wrapAngle(desired - current)
      const maxTurn = SPECIAL.missileTurnRate * dtSeconds
      const heading = current + Math.min(Math.max(diff, -maxTurn), maxTurn)
      this.velocityX = Math.cos(heading) * SPECIAL.missileSpeed
      this.velocityY = Math.sin(heading) * SPECIAL.missileSpeed
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

export class MissilePool {
  readonly items: Missile[] = []

  constructor(size: number = POOLS.maxMissiles) {
    for (let i = 0; i < size; i += 1) {
      this.items.push(new Missile())
    }
  }

  launch(x: number, y: number, velocityX: number, velocityY: number): Missile | null {
    for (const item of this.items) {
      if (!item.active) {
        item.launch(x, y, velocityX, velocityY)
        return item
      }
    }
    return null
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
