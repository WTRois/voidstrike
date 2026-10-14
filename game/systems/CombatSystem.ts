import { PICKUP, PRIMARY, SPECIAL } from '../config/gameBalance'

export interface PrimaryFireOrigin {
  x: number
  y: number
  fire: (x: number, y: number) => void
}

export interface SpecialFireOrigin {
  x: number
  y: number
  launch: (x: number, y: number, velocityX: number, velocityY: number) => void
}

/**
 * Primary weapon auto-fire (PRD §8.3): cooldown berjalan di atas delta time,
 * bukan jumlah frame. Diperluas Tahap 3 (special weapon, enemy fire).
 */
export class CombatSystem {
  private cooldown = 0
  private specialRemaining = 0

  reset(): void {
    this.cooldown = 0
    this.specialRemaining = 0
  }

  update(dtSeconds: number, firing: boolean, origin: PrimaryFireOrigin): void {
    if (!firing) {
      this.cooldown = 0
      return
    }
    if (dtSeconds <= 0) {
      return
    }
    this.cooldown -= dtSeconds
    while (this.cooldown <= 0) {
      origin.fire(origin.x, origin.y)
      this.cooldown += PRIMARY.cooldownSeconds
    }
  }

  /** Salvo 3 misil; false + tanpa efek saat cooldown aktif (PRD §8.4). */
  trySpecial(origin: SpecialFireOrigin): boolean {
    if (this.specialRemaining > 0) {
      return false
    }
    for (const velocityY of SPECIAL.spreadVelocityY) {
      origin.launch(origin.x, origin.y, SPECIAL.missileSpeed, velocityY)
    }
    this.specialRemaining = SPECIAL.cooldownSeconds
    return true
  }

  updateSpecial(dtSeconds: number): void {
    if (this.specialRemaining > 0 && dtSeconds > 0) {
      this.specialRemaining = Math.max(0, this.specialRemaining - dtSeconds)
    }
  }

  /** Pickup weapon charge: kurangi sisa cooldown, tanpa negatif (PRD §8.4). */
  reduceSpecial(seconds: number = PICKUP.specialReductionSeconds): void {
    this.specialRemaining = Math.max(0, this.specialRemaining - seconds)
  }

  getSpecialRemaining(): number {
    return this.specialRemaining
  }

  getSpecialFraction(): number {
    if (SPECIAL.cooldownSeconds <= 0) {
      return 0
    }
    return this.specialRemaining / SPECIAL.cooldownSeconds
  }
}
