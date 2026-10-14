import { describe, expect, it } from 'vitest'

import { PLAYER } from '../../game/config/gameBalance'
import { HealthSystem } from '../../game/systems/HealthSystem'

describe('HealthSystem', () => {
  it('damage masuk shield dulu, sisa ke hull', () => {
    const health = new HealthSystem()
    const result = health.applyDamage(30)
    expect(result.ignored).toBe(false)
    expect(result.shieldDamage).toBe(30)
    expect(result.hullDamage).toBe(0)
    expect(health.shield).toBe(70)
    expect(health.hull).toBe(PLAYER.hullMax)
  })

  it('shield habis → sisa damage ke hull, tidak negatif', () => {
    const health = new HealthSystem()
    health.shield = 10
    const result = health.applyDamage(40)
    expect(result.shieldDamage).toBe(10)
    expect(result.hullDamage).toBe(30)
    expect(health.shield).toBe(0)
    expect(health.hull).toBe(PLAYER.hullMax - 30)
    health.invulnRemaining = 0
    const lethal = health.applyDamage(1000)
    expect(lethal.died).toBe(true)
    expect(health.hull).toBe(0)
    expect(health.shield).toBe(0)
  })

  it('invulnerability window menolak damage tambahan', () => {
    const health = new HealthSystem()
    health.applyDamage(10)
    expect(health.invulnRemaining).toBeGreaterThan(0)
    const blocked = health.applyDamage(50)
    expect(blocked.ignored).toBe(true)
    expect(health.shield).toBe(PLAYER.shieldMax - 10)
    health.update(PLAYER.invulnSeconds)
    const accepted = health.applyDamage(10)
    expect(accepted.ignored).toBe(false)
  })

  it('shield regen setelah delay tanpa damage, tidak sebelumnya', () => {
    const health = new HealthSystem()
    health.applyDamage(40)
    expect(health.shield).toBe(PLAYER.shieldMax - 40)
    health.update(PLAYER.shieldRegenDelaySeconds - 1)
    expect(health.shield).toBe(PLAYER.shieldMax - 40)
    health.update(2)
    expect(health.shield).toBeGreaterThan(PLAYER.shieldMax - 40)
  })

  it('hull tidak beregenerasi dan heal/shield dibatasi maksimum', () => {
    const health = new HealthSystem()
    health.shield = 0
    health.invulnRemaining = 0
    health.applyDamage(50)
    const hullAfter = health.hull
    health.update(60)
    expect(health.hull).toBe(hullAfter)
    expect(health.healHull(1000)).toBe(PLAYER.hullMax - hullAfter)
    expect(health.hull).toBe(PLAYER.hullMax)
    expect(health.rechargeShield(1000)).toBeLessThanOrEqual(PLAYER.shieldMax)
    expect(health.shield).toBe(PLAYER.shieldMax)
  })

  it('reset mengembalikan penuh dan mati tidak bisa di-heal', () => {
    const health = new HealthSystem()
    health.invulnRemaining = 0
    health.applyDamage(10000)
    expect(health.isAlive()).toBe(false)
    expect(health.healHull(25)).toBe(0)
    health.reset()
    expect(health.hull).toBe(PLAYER.hullMax)
    expect(health.shield).toBe(PLAYER.shieldMax)
    expect(health.isAlive()).toBe(true)
  })
})
