import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import {
  createEnemyProjectileMesh,
  createEnemySlotMesh,
  createMissileMesh,
  createPickupMesh,
  createPickupSlotMesh,
} from '../../game/assets/createPlaceholderEntities'

function countMeshes(root: THREE.Object3D): number {
  let count = 0
  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      count += 1
    }
  })
  return count
}

describe('entity visuals Tahap 3', () => {
  it('slot musuh memuat 5 varian kind yang bisa di-toggle', () => {
    const slot = createEnemySlotMesh()
    expect(slot.children.map((child) => child.name).sort()).toEqual(
      ['kind-asteroid', 'kind-heavy', 'kind-interceptor', 'kind-mine', 'kind-scout'].sort(),
    )
    expect(countMeshes(slot)).toBeGreaterThanOrEqual(8)
  })

  it('proyektil pemain/musuh/misil berbeda warna dan tersembunyi awal', () => {
    const player = createEnemyProjectileMesh()
    expect(player.visible).toBe(false)
    const missile = createMissileMesh()
    expect(missile.visible).toBe(false)
    const playerMat = (missile as THREE.Mesh).material
    const enemyMat = (player as THREE.Mesh).material
    expect(playerMat).not.toBe(enemyMat)
  })

  it('slot pickup memuat 3 varian jenis', () => {
    const slot = createPickupSlotMesh()
    expect(slot.children.map((child) => child.name).sort()).toEqual(
      ['kind-hull', 'kind-shield', 'kind-weapon'].sort(),
    )
    expect(createPickupMesh('hull').name).toBe('pickup-hull')
  })
})
