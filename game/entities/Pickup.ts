import { CHASE, PICKUP, POOLS } from '../config/gameBalance'

export type PickupKind = 'hull' | 'shield' | 'weapon'

/** Pickup melayang ke kamera dengan lifetime; diambil sekali (PRD §8.8). */
export class Pickup {
  x = 0
  y = 0
  z = 0
  kind: PickupKind = 'hull'
  life = 0
  active = false
  readonly radius = PICKUP.radius

  spawn(x: number, y: number, z: number, kind: PickupKind): void {
    this.x = x
    this.y = y
    this.z = z
    this.kind = kind
    this.life = PICKUP.lifeSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(dtSeconds: number): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    this.z += PICKUP.driftSpeed * dtSeconds
    this.life -= dtSeconds
    if (this.life <= 0 || this.z > CHASE.cullZ) {
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

  spawn(x: number, y: number, z: number, kind: PickupKind): Pickup | null {
    for (const item of this.items) {
      if (!item.active) {
        item.spawn(x, y, z, kind)
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
