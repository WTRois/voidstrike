import { PLAYER } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'
import { HealthSystem } from '../systems/HealthSystem'

/**
 * Entity pesawat pemain: posisi + hitbox pada bidang XY (PRD §11.5)
 * plus hull/shield via HealthSystem (PRD §8.2).
 * Visual mesh mengikuti entity; entity tidak tahu tentang Three.js.
 */
export class PlayerShip {
  x = 0
  y = 0
  /** Bidang kapal chase-cam (tetap; demi interface DamageDealer 3D). */
  z = 0
  readonly radius = PLAYER.radius
  readonly health = new HealthSystem()

  reset(x: number, y: number): void {
    this.x = x
    this.y = y
  }

  clampToZone(zone: WorldBounds): void {
    this.x = Math.min(Math.max(this.x, zone.minX), zone.maxX)
    this.y = Math.min(Math.max(this.y, zone.minY), zone.maxY)
  }

  /** Kontrol langsung yang halus; dijepit ke zona pemain, tanpa inertia. */
  update(dtSeconds: number, axisX: number, axisY: number, zone: WorldBounds): void {
    if (dtSeconds <= 0) {
      return
    }
    let dx = axisX
    let dy = axisY
    if (dx !== 0 && dy !== 0) {
      const inv = 1 / Math.sqrt(2)
      dx *= inv
      dy *= inv
    }
    this.x = Math.min(Math.max(this.x + dx * PLAYER.speed * dtSeconds, zone.minX), zone.maxX)
    this.y = Math.min(Math.max(this.y + dy * PLAYER.speed * dtSeconds, zone.minY), zone.maxY)
  }
}
