import { describe, expect, it } from 'vitest'

import { MuzzleFlashPool } from '../../game/effects/MuzzleFlash'

describe('MuzzleFlashPool', () => {
  it('spawn menyalakan flash yang padam sesuai lifetime', () => {
    const pool = new MuzzleFlashPool(2)
    pool.spawn(1, 2)
    pool.update(0.01)
    let visible = 0
    for (const child of pool.group.children) {
      if ((child as import('three').Mesh).visible) {
        visible += 1
      }
    }
    expect(visible).toBe(1)
    pool.update(1)
    for (const child of pool.group.children) {
      expect((child as import('three').Mesh).visible).toBe(false)
    }
  })

  it('clear mematikan semua dan pool terbatas', () => {
    const pool = new MuzzleFlashPool(1)
    pool.spawn(0, 0)
    pool.spawn(1, 1)
    pool.clear()
    for (const child of pool.group.children) {
      expect((child as import('three').Mesh).visible).toBe(false)
    }
  })
})
