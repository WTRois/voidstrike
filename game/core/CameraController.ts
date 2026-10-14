import * as THREE from 'three'

import { CHASE, RENDER, WORLD } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'
import { computeBounds } from '../utils/bounds'

/**
 * Kamera chase ala Vendetta (Tahap 8): di belakang + sedikit di atas kapal,
 * menatap ke depan (−Z). Mengikuti kapal dengan faktor < 1 agar kapal
 * selalu dalam bingkai dengan margin; bounds gameplay tetap kotak tetap
 * pada bidang kapal (aproksimasi aman, terverifikasi smoke di tepi zona).
 */
export class CameraController {
  readonly camera: THREE.PerspectiveCamera
  private readonly halfHeight = WORLD.halfHeight
  private aspect = 16 / 9
  private baseX = 0
  private baseY: number = CHASE.camHeight
  private shakeX = 0
  private shakeY = 0

  constructor() {
    const fovRadians = 2 * Math.atan(this.halfHeight / RENDER.cameraZ)
    this.camera = new THREE.PerspectiveCamera((fovRadians * 180) / Math.PI, this.aspect, 0.1, 120)
    this.snap(0, -2)
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

  /** Jepret ke posisi ikuti (spawn/menu); tanpa smoothing. */
  snap(shipX: number, shipY: number): void {
    this.baseX = shipX * CHASE.followX
    this.baseY = CHASE.camHeight + shipY * CHASE.followY
    this.apply()
    this.camera.lookAt(shipX * CHASE.lookX, shipY * CHASE.lookY, CHASE.lookZ)
  }

  /** Ikuti kapal dengan smoothing eksponensial + tatap ke depan. */
  follow(dtSeconds: number, shipX: number, shipY: number): void {
    const targetX = shipX * CHASE.followX
    const targetY = CHASE.camHeight + shipY * CHASE.followY
    if (dtSeconds <= 0) {
      this.baseX = targetX
      this.baseY = targetY
    } else {
      const blend = 1 - Math.exp(-5 * dtSeconds)
      this.baseX += (targetX - this.baseX) * blend
      this.baseY += (targetY - this.baseY) * blend
    }
    this.apply()
    this.camera.lookAt(shipX * CHASE.lookX, shipY * CHASE.lookY, CHASE.lookZ)
  }

  /** Offset guncangan kamera; (0,0) = posisi dasar. */
  setShake(x: number, y: number): void {
    this.shakeX = x
    this.shakeY = y
    this.apply()
  }

  private apply(): void {
    this.camera.position.set(this.baseX + this.shakeX, this.baseY + this.shakeY, RENDER.cameraZ)
  }
}
