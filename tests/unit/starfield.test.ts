import type * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { CHASE, STARFIELD } from '../../game/config/gameBalance'
import { Starfield } from '../../game/effects/Starfield'
import type { WorldBounds } from '../../game/types/game'

const BOUNDS: WorldBounds = { minX: -8, maxX: 8, minY: -5, maxY: 5 }

function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

function positionAttribute(points: THREE.Object3D): THREE.BufferAttribute {
  return (points as THREE.Points).geometry.getAttribute('position') as THREE.BufferAttribute
}

describe('Starfield streaming', () => {
  it('membuat minimal 2 lapis parallax sesuai konfigurasi', () => {
    const starfield = new Starfield(BOUNDS, seededRandom(1))
    expect(starfield.layerCount).toBeGreaterThanOrEqual(2)
    expect(starfield.layerCount).toBe(STARFIELD.layers.length)
    starfield.dispose()
  })

  it('bintang mengalir ke kamera (+Z) dan wrap dalam rentang', () => {
    const starfield = new Starfield(BOUNDS, seededRandom(42))
    const near = CHASE.cullZ - 1 + 0.01
    const far = CHASE.spawnZ - 10 - 0.01
    starfield.update(5, BOUNDS)
    for (const points of starfield.group.children) {
      if (!(points as THREE.Points).isPoints) {
        continue
      }
      const attribute = positionAttribute(points)
      for (let i = 0; i < attribute.count; i += 1) {
        const z = attribute.getZ(i)
        expect(z).toBeGreaterThanOrEqual(far)
        expect(z).toBeLessThanOrEqual(near)
      }
    }
    starfield.dispose()
  })

  it('nebula opsional di node, parallax fokus-XY aman di semua env', () => {
    const starfield = new Starfield(BOUNDS, seededRandom(3))
    // Node tanpa document: backdrop kosong; browser: 3 sprite. Keduanya valid.
    expect(starfield.backdrop.children.length).toBeLessThanOrEqual(3)
    expect(() => starfield.update(1, BOUNDS, 2.5, -1)).not.toThrow()
    expect(() => starfield.update(1, BOUNDS)).not.toThrow()
    starfield.dispose()
    expect(starfield.backdrop.children).toHaveLength(0)
  })

  it('dispose idempotent dan update setelah dispose menjadi no-op', () => {
    const starfield = new Starfield(BOUNDS, seededRandom(7))
    const geometries = starfield.group.children.map((points) => positionAttribute(points))
    const snapshot = geometries.map((geometry) => Array.from(geometry.array.slice(0, 6)))
    starfield.dispose()
    starfield.dispose()
    expect(starfield.isDisposed).toBe(true)
    expect(starfield.group.children).toHaveLength(0)
    starfield.update(1, BOUNDS)
    expect(geometries.map((geometry) => Array.from(geometry.array.slice(0, 6)))).toEqual(snapshot)
  })
})
