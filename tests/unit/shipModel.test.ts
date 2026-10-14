import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { normalizePlayerShip } from '../../game/assets/loadPlayerShip'
import { mergeStaticMeshes, normalizeModel } from '../../game/assets/loadEntityModels'
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

describe('normalizeModel (generik musuh/boss)', () => {
  it('yaw −90° menghadap −X dan nama mengikuti kontrak slot', () => {
    const source = new THREE.Group()
    const mesh = boxMesh(4, 1, 2)
    source.add(mesh)
    const group = normalizeModel(source, {
      targetLength: 2,
      yawRadians: -Math.PI / 2,
      name: 'kind-scout',
      forwardX: -1,
    })
    expect(group.name).toBe('kind-scout')
    expect(group.userData['forward']).toEqual(new THREE.Vector3(-1, 0, 0))
    const box = new THREE.Box3().setFromObject(group)
    const size = box.getSize(new THREE.Vector3())
    expect(Math.max(size.x, size.y, size.z)).toBeCloseTo(2, 5)
  })

  it('clone template berbagi resource dan tetap bernama sama', () => {
    const source = new THREE.Group()
    source.add(boxMesh(2, 2, 2))
    const template = normalizeModel(source, {
      targetLength: 1.5,
      yawRadians: 0,
      name: 'kind-heavy',
      forwardX: -1,
    })
    const clone = template.clone(true)
    expect(clone.name).toBe('kind-heavy')
    expect(clone.children).toHaveLength(1)
  })

  it('roll +90° merebahkan model berhidung +Y menghadap −X', () => {
    const source = new THREE.Group()
    // Menara vertikal: panjang di Y (hidung +Y).
    const tower = boxMesh(1, 4, 1)
    source.add(tower)
    const group = normalizeModel(source, {
      targetLength: 4,
      yawRadians: 0,
      rollRadians: Math.PI / 2,
      name: 'kind-scout',
      forwardX: -1,
    })
    const box = new THREE.Box3().setFromObject(group)
    const size = box.getSize(new THREE.Vector3())
    // Setelah rebah: panjang pindah ke sumbu X.
    expect(size.x).toBeCloseTo(4, 4)
    expect(size.y).toBeCloseTo(1, 4)
  })
})

describe('mergeStaticMeshes', () => {
  it('menggabung mesh sematerial menjadi satu draw call', () => {
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const source = new THREE.Group()
    for (const x of [-2, 0, 2]) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material)
      mesh.position.x = x
      source.add(mesh)
    }
    const merged = mergeStaticMeshes(source)
    const meshes: THREE.Object3D[] = []
    merged.traverse((child) => {
      if ((child as THREE.Mesh).isMesh === true) {
        meshes.push(child)
      }
    })
    expect(meshes).toHaveLength(1)
    const box = new THREE.Box3().setFromObject(merged)
    const size = box.getSize(new THREE.Vector3())
    expect(size.x).toBeCloseTo(5, 4)
  })

  it('material berbeda tidak digabung; transform dunia ikut ke-bake', () => {
    const source = new THREE.Group()
    const holder = new THREE.Group()
    holder.position.set(10, 0, 0)
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(2, 2, 2),
      new THREE.MeshStandardMaterial({ color: 0x00ff00 }),
    )
    holder.add(mesh)
    source.add(holder)
    source.add(boxMesh(1, 1, 1))
    const merged = mergeStaticMeshes(source)
    const meshes: THREE.Mesh[] = []
    merged.traverse((child) => {
      if ((child as THREE.Mesh).isMesh === true) {
        meshes.push(child as THREE.Mesh)
      }
    })
    expect(meshes).toHaveLength(2)
    const box = new THREE.Box3().setFromObject(merged)
    // Kotak hijau di x=10±1 → maxX ≈ 11 membuktikan bake transform.
    expect(box.max.x).toBeCloseTo(11, 4)
  })
})
