import { describe, expect, it } from 'vitest'

import { WORLD } from '../../game/config/gameBalance'
import { computeBounds, computePlayerZone } from '../../game/utils/bounds'

describe('bounds', () => {
  it('menghitung batas simetris dari halfHeight dan aspect', () => {
    const bounds = computeBounds(5, 2)
    expect(bounds).toEqual({ minX: -10, maxX: 10, minY: -5, maxY: 5 })
  })

  it('memakai fallback 16:9 untuk aspect invalid', () => {
    for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const bounds = computeBounds(5, aspect)
      expect(bounds.maxX).toBeCloseTo(5 * (16 / 9), 10)
      expect(bounds.minX).toBeCloseTo(-5 * (16 / 9), 10)
    }
  })

  it('zona pemain chase-cam: seluruh layar dikurangi margin', () => {
    const bounds = computeBounds(5, 16 / 9)
    const zone = computePlayerZone(bounds)
    expect(zone.minX).toBeCloseTo(bounds.minX + WORLD.playerMargin, 10)
    expect(zone.maxX).toBeCloseTo(bounds.maxX - WORLD.playerMargin, 10)
    expect(zone.minY).toBeCloseTo(bounds.minY + WORLD.playerMargin, 10)
    expect(zone.maxY).toBeCloseTo(bounds.maxY - WORLD.playerMargin, 10)
  })
})
