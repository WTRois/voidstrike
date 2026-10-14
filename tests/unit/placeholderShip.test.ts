import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { createPlaceholderPlayerShip } from '../../game/assets/createPlaceholderPlayerShip'
import { SHIP } from '../../game/config/gameBalance'

describe('createPlaceholderPlayerShip', () => {
  it('siluet menghadap +X: hidung di kanan, ekor di kiri', () => {
    const ship = createPlaceholderPlayerShip()
    const box = new THREE.Box3().setFromObject(ship)
    expect(box.max.x).toBeGreaterThan(1)
    expect(box.min.x).toBeLessThan(0)
    expect(box.max.x - box.min.x).toBeGreaterThan(box.max.y - box.min.y)
  })

  it('modular dan hemat: 6–16 mesh dengan material bersama', () => {
    const ship = createPlaceholderPlayerShip()
    const meshes: THREE.Mesh[] = []
    ship.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        meshes.push(child)
      }
    })
    expect(meshes.length).toBeGreaterThanOrEqual(6)
    expect(meshes.length).toBeLessThanOrEqual(16)
  })

  it('memiliki aksen emissive cyan khas Voidstrike', () => {
    const ship = createPlaceholderPlayerShip()
    let foundGlow = false
    ship.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material]
        for (const material of materials) {
          if (
            material instanceof THREE.MeshStandardMaterial &&
            material.emissive.getHex() === SHIP.accentColor &&
            material.emissiveIntensity > 1
          ) {
            foundGlow = true
          }
        }
      }
    })
    expect(foundGlow).toBe(true)
  })
})
