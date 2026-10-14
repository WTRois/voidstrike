import { describe, expect, it } from 'vitest'

import { BOSS } from '../../game/config/gameBalance'
import { Boss } from '../../game/entities/Boss'

describe('Boss', () => {
  it('spawn mengatur HP dan telegraph aktif', () => {
    const boss = new Boss()
    boss.spawn(12, 6, 0, 150)
    expect(boss.active).toBe(true)
    expect(boss.hp).toBe(150)
    expect(boss.maxHp).toBe(150)
    expect(boss.isTelegraphing).toBe(true)
  })

  it('telegraph bergerak ke anchor tanpa menembak', () => {
    const boss = new Boss()
    boss.spawn(12, 6, 0, 150)
    boss.update(0.5, 0, 0, -5, 5)
    expect(boss.x).toBeCloseTo(12 - BOSS.enterSpeed * 0.5, 10)
    expect(boss.updateFireSalvo(99)).toBe(false)
    expect(boss.updateFireFan(99)).toBe(false)
    boss.update(BOSS.telegraphSeconds, 1, 0, -5, 5)
    expect(boss.isTelegraphing).toBe(false)
    expect(boss.x).toBe(boss.anchorX)
  })

  it('hover mengejar Y pemain dalam batas arena', () => {
    const boss = new Boss()
    boss.spawn(6, 6, 0, 150)
    boss.update(BOSS.telegraphSeconds, 0, 0, -5, 5)
    boss.update(1, 1, 4, -5, 5)
    expect(boss.y).toBeGreaterThan(0)
    expect(boss.y).toBeLessThanOrEqual(4)
    boss.update(99, 2, 99, -5, 5)
    expect(boss.y).toBeLessThanOrEqual(4)
  })

  it('dua pola tembakan berjalan di interval masing-masing', () => {
    const boss = new Boss()
    boss.spawn(6, 6, 0, 150)
    boss.update(BOSS.telegraphSeconds, 0, 0, -5, 5)
    expect(boss.updateFireSalvo(0.1)).toBe(false)
    expect(boss.updateFireSalvo(BOSS.salvoIntervalSeconds)).toBe(true)
    expect(boss.updateFireFan(0.1)).toBe(false)
    expect(boss.updateFireFan(BOSS.fanIntervalSeconds)).toBe(true)
  })

  it('damage menghancurkan dan menonaktifkan', () => {
    const boss = new Boss()
    boss.spawn(6, 6, 0, 10)
    expect(boss.damage(4)).toBe(false)
    expect(boss.active).toBe(true)
    expect(boss.damage(6)).toBe(true)
    expect(boss.active).toBe(false)
    expect(boss.damage(1)).toBe(false)
  })
})
