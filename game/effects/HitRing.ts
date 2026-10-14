import * as THREE from 'three'

import { POOLS } from '../config/gameBalance'

const RING_LIFE = 0.3

interface Ring {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>
  life: number
  scale: number
  active: boolean
}

/**
 * Ring impact pooled: cyan untuk shield, oranye untuk hull/kill.
 * Feedback damage instan tanpa alokasi (PRD §2.2, §8.2).
 */
export class HitRingPool {
  readonly group = new THREE.Group()
  private readonly rings: Ring[] = []

  constructor(size: number = POOLS.maxHitRings) {
    this.group.name = 'hit-rings'
    for (let i = 0; i < size; i += 1) {
      const mesh = new THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>(
        new THREE.RingGeometry(0.8, 1, 32),
        new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      )
      mesh.visible = false
      this.rings.push({ mesh, life: 0, scale: 1, active: false })
      this.group.add(mesh)
    }
  }

  spawn(x: number, y: number, color: number, scale = 1): void {
    for (const ring of this.rings) {
      if (!ring.active) {
        ring.active = true
        ring.life = RING_LIFE
        ring.scale = scale
        ring.mesh.visible = true
        ring.mesh.position.set(x, y, 1)
        ring.mesh.material.color.setHex(color)
        return
      }
    }
  }

  update(dtSeconds: number): void {
    if (dtSeconds <= 0) {
      return
    }
    for (const ring of this.rings) {
      if (!ring.active) {
        continue
      }
      ring.life -= dtSeconds
      if (ring.life <= 0) {
        ring.active = false
        ring.mesh.visible = false
        continue
      }
      const progress = 1 - ring.life / RING_LIFE
      const size = ring.scale * (0.5 + progress * 1.7)
      ring.mesh.scale.set(size, size, 1)
      ring.mesh.material.opacity = 0.9 * (1 - progress)
    }
  }

  clear(): void {
    for (const ring of this.rings) {
      ring.active = false
      ring.mesh.visible = false
    }
  }

  get activeCount(): number {
    let count = 0
    for (const ring of this.rings) {
      if (ring.active) {
        count += 1
      }
    }
    return count
  }
}
