import * as THREE from 'three'

import { SHIP_MODEL } from '../config/gameBalance'

/**
 * Loader model GLB pemain Tahap 7 (PRD §10.3). Best-effort: gagal load
 * (file hilang, WebGL tak tersedia, omgeving node) → null dan pemanggil
 * tetap memakai placeholder prosedural.
 */
export async function loadPlayerShipModel(url: string): Promise<THREE.Group | null> {
  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return normalizePlayerShip(gltf.scene)
  } catch {
    return null
  }
}

/**
 * Normalisasi murni (teruji node): skala uniform agar sisi terpanjang =
 * targetLength, bbox di tengah origin, yaw ke +X. Visual dipisah dari
 * hitbox — entity gameplay tidak berubah (PRD §10.3).
 */
export function normalizePlayerShip(source: THREE.Object3D): THREE.Group {
  const group = new THREE.Group()
  group.name = 'player-ship-model'
  const box = new THREE.Box3().setFromObject(source)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = maxDim > 0 ? SHIP_MODEL.targetLength / maxDim : 1
  const inner = new THREE.Group()
  source.position.sub(center)
  inner.add(source)
  inner.scale.setScalar(scale)
  inner.rotation.y = SHIP_MODEL.yawRadians
  group.add(inner)
  group.userData['forward'] = new THREE.Vector3(1, 0, 0)
  return group
}
