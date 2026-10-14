import * as THREE from 'three'

import { FX } from '../config/gameBalance'

interface Flash {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  life: number
  active: boolean
}

/** Muzzle flash pooled: quad cyan kilat di hidung kapal (PRD §4.1 polish). */
export class MuzzleFlashPool {
  readonly group = new THREE.Group()
  private readonly flashes: Flash[] = []

  constructor(size = 4) {
    this.group.name = 'muzzle-flashes'
    for (let i = 0; i < size; i += 1) {
      const mesh = new THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>(
        new THREE.PlaneGeometry(FX.muzzleWidth, FX.muzzleHeight),
        new THREE.MeshBasicMaterial({
          color: 0x9df3ff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      )
      mesh.visible = false
      this.flashes.push({ mesh, life: 0, active: false })
      this.group.add(mesh)
    }
  }

  spawn(x: number, y: number, z = 1): void {
    for (const flash of this.flashes) {
      if (!flash.active) {
        flash.active = true
        flash.life = FX.muzzleLifeSeconds
        flash.mesh.visible = true
        flash.mesh.position.set(x, y, z)
        flash.mesh.rotation.z = (Math.random() - 0.5) * 0.6
        const scale = 0.8 + Math.random() * 0.5
        flash.mesh.scale.set(scale, scale, 1)
        return
      }
    }
  }

  update(dtSeconds: number): void {
    if (dtSeconds <= 0) {
      return
    }
    for (const flash of this.flashes) {
      if (!flash.active) {
        continue
      }
      flash.life -= dtSeconds
      if (flash.life <= 0) {
        flash.active = false
        flash.mesh.visible = false
        continue
      }
      flash.mesh.material.opacity = Math.max(0, flash.life / FX.muzzleLifeSeconds)
    }
  }

  clear(): void {
    for (const flash of this.flashes) {
      flash.active = false
      flash.mesh.visible = false
    }
  }
}
