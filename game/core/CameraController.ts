import * as THREE from 'three'

import { RENDER, WORLD } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'
import { computeBounds } from '../utils/bounds'

/**
 * Kamera side-view fully-3D Tahap 7: PerspectiveCamera di +Z melihat -Z,
 * bidang gameplay tetap XY dan +X ke kanan. FOV diturunkan dari
 * WORLD.halfHeight + RENDER.cameraZ sehingga batas dunia identik dengan
 * perilaku orthographic lama — fairness collision tidak berubah, tetapi
 * layer parallax pada z berbeda kini punya gerak-semu alami.
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera
  private readonly halfHeight = WORLD.halfHeight
  private aspect = 16 / 9

  constructor() {
    const fovRadians = 2 * Math.atan(this.halfHeight / RENDER.cameraZ)
    this.camera = new THREE.PerspectiveCamera((fovRadians * 180) / Math.PI, this.aspect, 0.1, 100)
    this.camera.position.set(0, 0, RENDER.cameraZ)
    this.camera.lookAt(0, 0, 0)
    this.resize(1280, 720)
  }

  /** Hitung ulang aspect dari ukuran viewport; abaikan ukuran invalid. */
  resize(width: number, height: number): void {
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return
    }
    this.aspect = width / height
    this.camera.aspect = this.aspect
    this.camera.updateProjectionMatrix()
  }

  getBounds(): WorldBounds {
    return computeBounds(this.halfHeight, this.aspect)
  }

  /** Offset guncangan kamera; (0,0) = posisi dasar. */
  setShake(x: number, y: number): void {
    this.camera.position.x = x
    this.camera.position.y = y
  }
}
