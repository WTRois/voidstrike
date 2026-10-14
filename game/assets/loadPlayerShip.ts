import type * as THREE from 'three'

import { SHIP_MODEL } from '../config/gameBalance'
import { loadModel, normalizeModel } from './loadEntityModels'

/**
 * Loader model GLB pemain Tahap 7 (PRD §10.3). Best-effort: gagal load
 * → null dan pemanggil tetap memakai placeholder prosedural.
 */
export async function loadPlayerShipModel(url: string): Promise<THREE.Group | null> {
  const scene = await loadModel(url)
  if (scene === null) {
    return null
  }
  return normalizePlayerShip(scene)
}

/**
 * Normalisasi murni (teruji node): skala uniform agar sisi terpanjang =
 * targetLength, bbox di tengah origin, yaw ke +X. Visual dipisah dari
 * hitbox — entity gameplay tidak berubah (PRD §10.3).
 */
export function normalizePlayerShip(source: THREE.Object3D): THREE.Group {
  return normalizeModel(source, {
    targetLength: SHIP_MODEL.targetLength,
    yawRadians: SHIP_MODEL.yawRadians,
    pitchRadians: SHIP_MODEL.pitchRadians,
    name: 'player-ship-model',
    forwardX: 1,
  })
}
