import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { createLights, createScene } from '../../game/core/SceneFactory'
import { RENDER } from '../../game/config/gameBalance'

describe('SceneFactory', () => {
  it('scene memakai background gelap sesuai art direction', () => {
    const scene = createScene()
    expect(scene.background).toBeInstanceOf(THREE.Color)
    expect((scene.background as THREE.Color).getHex()).toBe(RENDER.backgroundColor)
  })

  it('lights menambah 3 directional/hemisphere tanpa shadow map', () => {
    const scene = createScene()
    createLights(scene)
    const lights = scene.children.filter((child) => child instanceof THREE.Light)
    expect(lights).toHaveLength(3)
    for (const light of lights) {
      if (light instanceof THREE.DirectionalLight) {
        expect(light.castShadow).toBe(false)
      }
    }
  })
})
