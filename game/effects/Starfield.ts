import * as THREE from 'three'

import { NEBULA, STARFIELD, WORLD } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

interface StarLayer {
  points: THREE.Points
  material: THREE.PointsMaterial
  positions: Float32Array
  speed: number
}

interface Backdrop {
  sprite: THREE.Sprite
  drift: number
  parallaxY: number
  baseY: number
}

function makeNebulaTexture(innerColor: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') {
    return null
  }
  try {
    const size = 128
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (context === null) {
      return null
    }
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      4,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, innerColor)
    gradient.addColorStop(0.45, `${innerColor}55`)
    gradient.addColorStop(1, 'rgba(5, 7, 13, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  } catch {
    return null
  }
}

/**
 * Background parallax Tahap 7: N lapis bintang (kanan → kiri, kecepatan
 * berbeda, wrap di luar batas + margin) + nebula sprite prosedural yang
 * melayang lambat dan bergeser halus mengikuti fokus Y pemain.
 * `group` hanya berisi Points (kontrak test lama); nebula di `backdrop`.
 */
export class Starfield {
  readonly group = new THREE.Group()
  readonly backdrop = new THREE.Group()
  private readonly layers: StarLayer[] = []
  private readonly backdrops: Backdrop[] = []
  private readonly random: () => number
  private disposed = false

  constructor(bounds: WorldBounds, random: () => number = Math.random) {
    this.random = random
    this.group.name = 'starfield'
    this.backdrop.name = 'nebula-backdrop'
    for (const config of STARFIELD.layers) {
      const positions = new Float32Array(config.count * 3)
      this.scatter(positions, bounds)
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const material = new THREE.PointsMaterial({
        color: config.color,
        size: config.size,
        sizeAttenuation: false,
        transparent: true,
        opacity: config.opacity,
        depthWrite: false,
      })
      const points = new THREE.Points(geometry, material)
      points.position.z = config.depth
      points.frustumCulled = false
      this.layers.push({ points, material, positions, speed: config.speed })
      this.group.add(points)
    }
    for (const config of NEBULA.sprites) {
      const texture = makeNebulaTexture(config.inner)
      if (texture === null) {
        continue
      }
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: NEBULA.opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
      const sprite = new THREE.Sprite(material)
      sprite.position.set(config.x, config.y, config.depth)
      sprite.scale.set(config.scale, config.scale * 0.6, 1)
      this.backdrops.push({
        sprite,
        drift: config.drift,
        parallaxY: config.parallaxY,
        baseY: config.y,
      })
      this.backdrop.add(sprite)
    }
  }

  get layerCount(): number {
    return this.layers.length
  }

  get isDisposed(): boolean {
    return this.disposed
  }

  private scatter(positions: Float32Array, bounds: WorldBounds): void {
    const width = bounds.maxX - bounds.minX + WORLD.spawnMarginX * 2
    const height = bounds.maxY - bounds.minY
    for (let i = 0; i < positions.length; i += 3) {
      positions[i] = bounds.minX - WORLD.spawnMarginX + this.random() * width
      positions[i + 1] = bounds.minY + this.random() * height
      positions[i + 2] = 0
    }
  }

  update(dtSeconds: number, bounds: WorldBounds, focusY = 0): void {
    if (this.disposed || dtSeconds <= 0) {
      return
    }
    const leftEdge = bounds.minX - WORLD.spawnMarginX
    const rightEdge = bounds.maxX + WORLD.spawnMarginX
    const height = bounds.maxY - bounds.minY
    for (const layer of this.layers) {
      const positions = layer.positions
      for (let i = 0; i < positions.length; i += 3) {
        const x = (positions[i] ?? 0) - layer.speed * dtSeconds
        if (x < leftEdge) {
          positions[i] = rightEdge
          positions[i + 1] = bounds.minY + this.random() * height
        } else {
          positions[i] = x
        }
      }
      const attribute = layer.points.geometry.getAttribute('position') as THREE.BufferAttribute
      attribute.needsUpdate = true
    }
    for (const entry of this.backdrops) {
      let x = entry.sprite.position.x - entry.drift * dtSeconds
      if (x < leftEdge - 6) {
        x = rightEdge + 6
      }
      entry.sprite.position.x = x
      entry.sprite.position.y = entry.baseY - focusY * entry.parallaxY
    }
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    for (const layer of this.layers) {
      layer.points.geometry.dispose()
      layer.material.dispose()
      this.group.remove(layer.points)
    }
    this.layers.length = 0
    for (const entry of this.backdrops) {
      const material = entry.sprite.material as THREE.SpriteMaterial
      material.map?.dispose()
      material.dispose()
      this.backdrop.remove(entry.sprite)
    }
    this.backdrops.length = 0
  }
}
