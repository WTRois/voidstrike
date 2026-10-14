import { describe, expect, it, vi } from 'vitest'

import { PICKUP, SPECIAL } from '../../game/config/gameBalance'
import { CombatSystem } from '../../game/systems/CombatSystem'

function origin(launch: ReturnType<typeof vi.fn>) {
  return { x: 0, y: 0, z: -1.6, launch }
}

describe('CombatSystem special weapon', () => {
  it('trySpecial meluncurkan salvo 3 misil ke depan dan mengunci cooldown', () => {
    const combat = new CombatSystem()
    const launch = vi.fn()
    expect(combat.trySpecial(origin(launch))).toBe(true)
    expect(launch).toHaveBeenCalledTimes(SPECIAL.missileCount)
    for (const call of launch.mock.calls) {
      // (x, y, z, vx, vy, vz): maju −Z secepat missileSpeed.
      expect(call[5]).toBe(-SPECIAL.missileSpeed)
    }
    expect(combat.getSpecialRemaining()).toBe(SPECIAL.cooldownSeconds)
    expect(combat.trySpecial(origin(launch))).toBe(false)
    expect(launch).toHaveBeenCalledTimes(SPECIAL.missileCount)
  })

  it('cooldown berjalan di atas delta time', () => {
    const combat = new CombatSystem()
    combat.trySpecial(origin(vi.fn()))
    combat.updateSpecial(SPECIAL.cooldownSeconds - 1)
    expect(combat.getSpecialRemaining()).toBeCloseTo(1, 10)
    expect(combat.getSpecialFraction()).toBeCloseTo(1 / SPECIAL.cooldownSeconds, 10)
    combat.updateSpecial(1)
    expect(combat.trySpecial(origin(vi.fn()))).toBe(true)
  })

  it('weapon charge mengurangi sisa cooldown tanpa negatif', () => {
    const combat = new CombatSystem()
    combat.trySpecial(origin(vi.fn()))
    combat.reduceSpecial(PICKUP.specialReductionSeconds)
    expect(combat.getSpecialRemaining()).toBe(
      SPECIAL.cooldownSeconds - PICKUP.specialReductionSeconds,
    )
    combat.reduceSpecial(1000)
    expect(combat.getSpecialRemaining()).toBe(0)
  })

  it('reset membersihkan cooldown primer dan special', () => {
    const combat = new CombatSystem()
    combat.trySpecial(origin(vi.fn()))
    combat.reset()
    expect(combat.getSpecialRemaining()).toBe(0)
    const fire = vi.fn()
    combat.update(0.01, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire).toHaveBeenCalledTimes(1)
  })
})
