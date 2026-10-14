import { describe, expect, it } from 'vitest'

import { HitRingPool } from '../../game/effects/HitRing'

describe('HitRingPool', () => {
  it('spawn mengaktifkan satu ring dan update menganimasikannya', () => {
    const pool = new HitRingPool(4)
    pool.spawn(1, 2, 0x46e6ff)
    expect(pool.activeCount).toBe(1)
    pool.update(0.1)
    expect(pool.activeCount).toBe(1)
    pool.update(1)
    expect(pool.activeCount).toBe(0)
  })

  it('melebihi kapasitas tidak menambah ring (cap eksplisit)', () => {
    const pool = new HitRingPool(2)
    pool.spawn(0, 0, 0xffffff)
    pool.spawn(1, 1, 0xffffff)
    pool.spawn(2, 2, 0xffffff)
    expect(pool.activeCount).toBe(2)
  })

  it('clear menonaktifkan semua', () => {
    const pool = new HitRingPool(4)
    pool.spawn(0, 0, 0xffffff)
    pool.clear()
    expect(pool.activeCount).toBe(0)
  })
})
