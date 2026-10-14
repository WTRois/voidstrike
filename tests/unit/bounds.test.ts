import { describe, expect, it } from 'vitest'

import { computeBounds, computePlayerZone, computeSpawnX } from '../../game/utils/bounds'

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

  it('zona pemain berada di pita kiri dalam batas dunia', () => {
    const bounds = computeBounds(5, 16 / 9)
    const zone = computePlayerZone(bounds)
    expect(zone.minX).toBeGreaterThan(bounds.minX)
    expect(zone.maxX).toBeLessThan(bounds.maxX)
    expect(zone.minY).toBeGreaterThan(bounds.minY)
    expect(zone.maxY).toBeLessThan(bounds.maxY)
  })

  it('spawn X berada di luar batas kanan + margin', () => {
    const bounds = computeBounds(5, 16 / 9)
    expect(computeSpawnX(bounds)).toBe(bounds.maxX + 2)
  })
})
