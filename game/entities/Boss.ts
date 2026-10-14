import { BOSS } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

/**
 * Boss archetype tunggal chase-cam (Tahap 8): masuk dari jauh (−Z) dengan
 * telegraph, hover di depan kapal, dua pola serangan 3D (aimed salvo +
 * fan). Wave system mengatur kemunculan tiap wave 3/6/9; skor dan wave
 * transition milik engine.
 */
export class Boss {
  x = 0
  y = 0
  z = 0
  hp = 0
  maxHp = 1
  active = false
  telegraphRemaining = 0
  anchorX = 0
  anchorY = 0
  anchorZ = 0
  fireSalvoTimer = 0
  fireFanTimer = 0
  readonly radius = BOSS.radius

  get isTelegraphing(): boolean {
    return this.active && this.telegraphRemaining > 0
  }

  spawn(x: number, y: number, enterZ: number, anchorZ: number, hp: number): void {
    this.x = x
    this.y = y
    this.z = enterZ
    this.anchorX = x
    this.anchorY = y
    this.anchorZ = anchorZ
    this.hp = hp
    this.maxHp = hp
    this.telegraphRemaining = BOSS.telegraphSeconds
    this.fireSalvoTimer = BOSS.salvoIntervalSeconds
    this.fireFanTimer = BOSS.fanIntervalSeconds
    this.active = true
  }

  deactivate(): void {
    this.active = false
  }

  update(
    dtSeconds: number,
    elapsedSeconds: number,
    playerX: number,
    playerY: number,
    zone: WorldBounds,
  ): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    if (this.telegraphRemaining > 0) {
      this.telegraphRemaining -= dtSeconds
      const step = BOSS.enterSpeed * dtSeconds
      this.z = Math.min(this.anchorZ, this.z + step)
      return
    }
    this.z = this.anchorZ
    const driftX = Math.min(Math.max(playerX, zone.minX + 1), zone.maxX - 1)
    const driftY = Math.min(Math.max(playerY, zone.minY + 1), zone.maxY - 1)
    const maxStep = BOSS.hoverSpeed * dtSeconds
    this.x += Math.min(Math.max(driftX - this.x, -maxStep), maxStep)
    this.y +=
      Math.min(Math.max(driftY - this.y, -maxStep), maxStep) +
      Math.sin(elapsedSeconds * 1.5) * 0.15 * dtSeconds
    this.x = Math.min(Math.max(this.x, zone.minX + 1), zone.maxX - 1)
    this.y = Math.min(Math.max(this.y, zone.minY + 1), zone.maxY - 1)
  }

  /** Pola 1: aimed salvo. False selama telegraph. */
  updateFireSalvo(dtSeconds: number): boolean {
    return this.updateFire(dtSeconds, 'salvo')
  }

  /** Pola 2: fan menyebar. False selama telegraph. */
  updateFireFan(dtSeconds: number): boolean {
    return this.updateFire(dtSeconds, 'fan')
  }

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

  private updateFire(dtSeconds: number, which: 'salvo' | 'fan'): boolean {
    if (!this.active || this.telegraphRemaining > 0 || dtSeconds <= 0) {
      return false
    }
    if (which === 'salvo') {
      this.fireSalvoTimer -= dtSeconds
      if (this.fireSalvoTimer <= 0) {
        this.fireSalvoTimer = BOSS.salvoIntervalSeconds
        return true
      }
      return false
    }
    this.fireFanTimer -= dtSeconds
    if (this.fireFanTimer <= 0) {
      this.fireFanTimer = BOSS.fanIntervalSeconds
      return true
    }
    return false
  }
}
