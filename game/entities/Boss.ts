import { BOSS } from '../config/gameBalance'

/**
 * Boss archetype tunggal (PRD §8.9): masuk dengan telegraph, hover di
 * sisi kanan, dua pola serangan (aimed salvo + fan). Wave system mengatur
 * kemunculan tiap wave 3/6/9; skor dan wave transition milik engine.
 */
export class Boss {
  x = 0
  y = 0
  hp = 0
  maxHp = 1
  active = false
  telegraphRemaining = 0
  anchorX = 0
  fireSalvoTimer = 0
  fireFanTimer = 0
  readonly radius = BOSS.radius

  get isTelegraphing(): boolean {
    return this.active && this.telegraphRemaining > 0
  }

  spawn(enterX: number, anchorX: number, y: number, hp: number): void {
    this.x = enterX
    this.anchorX = anchorX
    this.y = y
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
    playerY: number,
    minY: number,
    maxY: number,
  ): void {
    if (!this.active || dtSeconds <= 0) {
      return
    }
    if (this.telegraphRemaining > 0) {
      this.telegraphRemaining -= dtSeconds
      const step = BOSS.enterSpeed * dtSeconds
      this.x = Math.max(this.anchorX, this.x - step)
      return
    }
    this.x = this.anchorX
    const drift = Math.min(Math.max(playerY, minY + 1), maxY - 1)
    const delta = drift - this.y
    const maxStep = BOSS.hoverSpeed * dtSeconds
    this.y +=
      Math.min(Math.max(delta, -maxStep), maxStep) +
      Math.sin(elapsedSeconds * 1.5) * 0.15 * dtSeconds
    this.y = Math.min(Math.max(this.y, minY + 1), maxY - 1)
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
