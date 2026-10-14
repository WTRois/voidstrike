import { PICKUP, POOLS } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

export type PickupKind = 'hull' | 'shield' | 'weapon'

/** Pickup melayang kiri dengan lifetime; diambil sekali (PRD §8.8). */
export class Pickup {
  x = 0
  y = 0
  kind: PickupKind = 'hull'
  life = 0
  active = false
  readonly radius = PICKUP.radius

  spawn(x: number, y: number, kind: PickupKind): void {
    this.x = x
    this.y = y
    this.kind = kind
    this.life = PICKUP.lifeSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number, bounds: WorldBounds): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    this.x -= PICKUP.driftSpeed * dtSeconds
    this.life -= dtSeconds
    if (this.life <= 0 || this.x < bounds.minX - 2) {
      this.active = false
    }
  }
}

export class PickupPool {
  readonly items: Pickup[] = []

  constructor(size: number = POOLS.maxPickups) {
    for (let i = 0; i < size; i += 1) {
      this.items.push(new Pickup())
    }
  }

  spawn(x: number, y: number, kind: PickupKind): Pickup | null {
    for (const item of this.items) {
      if (!item.active) {
        item.spawn(x, y, kind)
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
