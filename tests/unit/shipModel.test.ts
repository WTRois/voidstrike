import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { normalizePlayerShip } from '../../game/assets/loadPlayerShip'
import { SHIP_MODEL } from '../../game/config/gameBalance'

function boxMesh(width: number, height: number, depth: number, x = 0, y = 0, z = 0): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0xffffff }),
  )
  mesh.position.set(x, y, z)
  return mesh
}

describe('normalizePlayerShip', () => {
  it('skala uniform: sisi terpanjang = targetLength', () => {
    const source = new THREE.Group()
    source.add(boxMesh(4, 1, 2))
    const group = normalizePlayerShip(source)
    const box = new THREE.Box3().setFromObject(group)
    const size = box.getSize(new THREE.Vector3())
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(SHIP_MODEL.targetLength, 5)
  })

  it('bbox di tengah origin dan forward +X', () => {
    const source = new THREE.Group()
    source.add(boxMesh(2, 2, 2, 5, -3, 1))
    const group = normalizePlayerShip(source)
    const box = new THREE.Box3().setFromObject(group)
    const center = box.getCenter(new THREE.Vector3())
    expect(center.x).toBeCloseTo(0, 5)
    expect(center.y).toBeCloseTo(0, 5)
    expect(center.z).toBeCloseTo(0, 5)
    expect(group.userData['forward']).toEqual(new THREE.Vector3(1, 0, 0))
    expect(group.name).toBe('player-ship-model')
  })

  it('sumber tanpa volume tidak menghasilkan skala invalid', () => {
    const group = normalizePlayerShip(new THREE.Group())
    const box = new THREE.Box3().setFromObject(group)
    expect(box.isEmpty()).toBe(true)
  })
})
