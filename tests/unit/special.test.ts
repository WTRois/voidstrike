import { describe, expect, it, vi } from 'vitest'

import { PICKUP, SPECIAL } from '../../game/config/gameBalance'
import { CombatSystem } from '../../game/systems/CombatSystem'

describe('CombatSystem special weapon', () => {
  it('trySpecial meluncurkan salvo 3 misil dan mengunci cooldown', () => {
    const combat = new CombatSystem()
    const launch = vi.fn()
    expect(combat.trySpecial({ x: 0, y: 0, launch })).toBe(true)
    expect(launch).toHaveBeenCalledTimes(SPECIAL.missileCount)
    expect(combat.getSpecialRemaining()).toBe(SPECIAL.cooldownSeconds)
    expect(combat.trySpecial({ x: 0, y: 0, launch })).toBe(false)
    expect(launch).toHaveBeenCalledTimes(SPECIAL.missileCount)
  })

  it('cooldown berjalan di atas delta time', () => {
    const combat = new CombatSystem()
    combat.trySpecial({ x: 0, y: 0, launch: vi.fn() })
    combat.updateSpecial(SPECIAL.cooldownSeconds - 1)
    expect(combat.getSpecialRemaining()).toBeCloseTo(1, 10)
    expect(combat.getSpecialFraction()).toBeCloseTo(1 / SPECIAL.cooldownSeconds, 10)
    combat.updateSpecial(1)
    expect(combat.trySpecial({ x: 0, y: 0, launch: vi.fn() })).toBe(true)
  })

  it('weapon charge mengurangi sisa cooldown tanpa negatif', () => {
    const combat = new CombatSystem()
    combat.trySpecial({ x: 0, y: 0, launch: vi.fn() })
    combat.reduceSpecial(PICKUP.specialReductionSeconds)
    expect(combat.getSpecialRemaining()).toBe(
      SPECIAL.cooldownSeconds - PICKUP.specialReductionSeconds,
    )
    combat.reduceSpecial(1000)
    expect(combat.getSpecialRemaining()).toBe(0)
  })

  it('reset membersihkan cooldown primer dan special', () => {
    const combat = new CombatSystem()
    combat.trySpecial({ x: 0, y: 0, launch: vi.fn() })
    combat.reset()
    expect(combat.getSpecialRemaining()).toBe(0)
    const fire = vi.fn()
    combat.update(0.01, true, { x: 0, y: 0, fire })
    expect(fire).toHaveBeenCalledTimes(1)
  })
})
