import { describe, expect, it } from 'vitest'

import { BOSS, CHASE } from '../../game/config/gameBalance'
import { Boss } from '../../game/entities/Boss'

const ZONE = { minX: -9, maxX: 9, minY: -5, maxY: 5 }

describe('Boss chase-cam', () => {
  it('spawn mengatur HP dan telegraph aktif', () => {
    const boss = new Boss()
    boss.spawn(0, 1, CHASE.bossEnterZ, CHASE.bossZ, 150)
    expect(boss.active).toBe(true)
    expect(boss.hp).toBe(150)
    expect(boss.maxHp).toBe(150)
    expect(boss.isTelegraphing).toBe(true)
  })

  it('telegraph mendekat ke anchor tanpa menembak', () => {
    const boss = new Boss()
    boss.spawn(0, 1, CHASE.bossEnterZ, CHASE.bossZ, 150)
    boss.update(0.5, 0, 0, 0, ZONE)
    expect(boss.z).toBeCloseTo(CHASE.bossEnterZ + BOSS.enterSpeed * 0.5, 10)
    expect(boss.updateFireSalvo(99)).toBe(false)
    expect(boss.updateFireFan(99)).toBe(false)
    boss.update(BOSS.telegraphSeconds, 1, 0, 0, ZONE)
    expect(boss.isTelegraphing).toBe(false)
    expect(boss.z).toBe(boss.anchorZ)
  })

  it('hover mengejar X/Y pemain dalam batas arena', () => {
    const boss = new Boss()
    boss.spawn(0, 1, CHASE.bossEnterZ, CHASE.bossZ, 150)
    boss.update(BOSS.telegraphSeconds, 0, 0, 0, ZONE)
    boss.update(1, 1, 4, 3, ZONE)
    expect(boss.x).toBeGreaterThan(0)
    expect(boss.y).toBeGreaterThan(1)
    expect(boss.x).toBeLessThanOrEqual(4)
    boss.update(99, 2, 99, 99, ZONE)
    expect(boss.x).toBeLessThanOrEqual(ZONE.maxX - 1)
    expect(boss.y).toBeLessThanOrEqual(ZONE.maxY - 1)
  })

  it('dua pola tembakan berjalan di interval masing-masing', () => {
    const boss = new Boss()
    boss.spawn(0, 1, CHASE.bossEnterZ, CHASE.bossZ, 150)
    boss.update(BOSS.telegraphSeconds, 0, 0, 0, ZONE)
    expect(boss.updateFireSalvo(0.1)).toBe(false)
    expect(boss.updateFireSalvo(BOSS.salvoIntervalSeconds)).toBe(true)
    expect(boss.updateFireFan(0.1)).toBe(false)
    expect(boss.updateFireFan(BOSS.fanIntervalSeconds)).toBe(true)
  })

  it('damage menghancurkan dan menonaktifkan', () => {
    const boss = new Boss()
    boss.spawn(0, 1, CHASE.bossEnterZ, CHASE.bossZ, 10)
    expect(boss.damage(4)).toBe(false)
    expect(boss.active).toBe(true)
    expect(boss.damage(6)).toBe(true)
    expect(boss.active).toBe(false)
    expect(boss.damage(1)).toBe(false)
  })
})
