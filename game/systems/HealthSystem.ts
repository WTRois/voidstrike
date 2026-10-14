import { PLAYER } from '../config/gameBalance'

export interface DamageResult {
  ignored: boolean
  shieldDamage: number
  hullDamage: number
  died: boolean
}

/**
 * Hull + energy shield pemain (PRD §8.2, §13.3). Perhitungan murni di atas
 * delta time — dapat diuji penuh tanpa renderer.
 * Damage selalu ke shield dulu, sisa ke hull; hull tidak beregenerasi.
 */
export class HealthSystem {
  hull: number = PLAYER.hullMax
  shield: number = PLAYER.shieldMax
  invulnRemaining = 0
  private secondsSinceDamage = 999

  reset(): void {
    this.hull = PLAYER.hullMax
    this.shield = PLAYER.shieldMax
    this.invulnRemaining = 0
    this.secondsSinceDamage = 999
  }

  isAlive(): boolean {
    return this.hull > 0
  }

  update(dtSeconds: number): void {
    if (dtSeconds <= 0) {
      return
    }
    if (this.invulnRemaining > 0) {
      this.invulnRemaining = Math.max(0, this.invulnRemaining - dtSeconds)
    }
    this.secondsSinceDamage += dtSeconds
    if (
      this.isAlive() &&
      this.secondsSinceDamage >= PLAYER.shieldRegenDelaySeconds &&
      this.shield < PLAYER.shieldMax
    ) {
      this.shield = Math.min(
        PLAYER.shieldMax,
        this.shield + PLAYER.shieldRegenPerSecond * dtSeconds,
      )
    }
  }

  applyDamage(amount: number): DamageResult {
    if (!this.isAlive() || this.invulnRemaining > 0 || amount <= 0) {
      return { ignored: true, shieldDamage: 0, hullDamage: 0, died: false }
    }
    this.secondsSinceDamage = 0
    this.invulnRemaining = PLAYER.invulnSeconds
    const shieldDamage = Math.min(this.shield, amount)
    this.shield -= shieldDamage
    const hullDamage = Math.min(this.hull, amount - shieldDamage)
    this.hull -= hullDamage
    return { ignored: false, shieldDamage, hullDamage, died: this.hull <= 0 }
  }

  healHull(amount: number): number {
    if (!this.isAlive() || amount <= 0) {
      return 0
    }
    const healed = Math.min(PLAYER.hullMax - this.hull, amount)
    this.hull += healed
    return healed
  }

  rechargeShield(amount: number): number {
    if (!this.isAlive() || amount <= 0) {
      return 0
    }
    const charged = Math.min(PLAYER.shieldMax - this.shield, amount)
    this.shield += charged
    return charged
  }
}
