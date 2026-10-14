import * as THREE from 'three'

import { RENDER } from '../config/gameBalance'

/** Scene + pencahayaan baseline. Tanpa shadow map / post-processing (PRD §15.1). */
export function createScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(RENDER.backgroundColor)
  return scene
}

export function createLights(scene: THREE.Scene): void {
  const hemisphere = new THREE.HemisphereLight(0x8fb8ff, 0x0a0d18, 0.9)
  const key = new THREE.DirectionalLight(0xffffff, 1.4)
  key.position.set(3, 5, 8)
  const rim = new THREE.DirectionalLight(0x46e6ff, 0.5)
  rim.position.set(-4, -2, 6)
  scene.add(hemisphere, key, rim)
}
