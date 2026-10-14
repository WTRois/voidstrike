import * as THREE from 'three'

import { SHIP } from '../config/gameBalance'

/**
 * Placeholder prosedural pesawat pemain (PRD §10.2): siluet stealth tajam
 * menghadap +X — badan runcing, pod samping, mesin ganda emissive cyan.
 * Disengaja modular (~13 mesh, 3 material bersama), bukan satu kubus.
 * Kontrak GLB final (orientasi/scale via wrapper Group) menyusul Tahap 7.
 */
export function createPlaceholderPlayerShip(): THREE.Group {
  const ship = new THREE.Group()
  ship.name = 'placeholder-player-ship'

  const hull = new THREE.MeshStandardMaterial({
    color: SHIP.hullColor,
    metalness: 0.85,
    roughness: 0.35,
    flatShading: true,
  })
  const dark = new THREE.MeshStandardMaterial({
    color: SHIP.darkPanelColor,
    metalness: 0.7,
    roughness: 0.5,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x0b2b33,
    emissive: SHIP.accentColor,
    emissiveIntensity: SHIP.engineEmissiveIntensity,
  })

  // Badan utama: silinder meruncing ke hidung (+X).
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.6, 8), hull)
  body.rotation.z = -Math.PI / 2
  ship.add(body)

  // Hidung runcing +X.
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.9, 8), hull)
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 1.75
  ship.add(nose)

  // Kokpit di punggung badan.
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.26, 12, 8), dark)
  cockpit.scale.set(1.6, 0.8, 0.9)
  cockpit.position.set(0.55, 0.3, 0)
  ship.add(cockpit)

  // Sayap atas menyapu ke belakang.
  const wingTop = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.07, 1.1), dark)
  wingTop.position.set(-0.55, 0.42, 0)
  wingTop.rotation.z = -0.15
  ship.add(wingTop)

  // Sirip bawah.
  const finBottom = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.07), dark)
  finBottom.position.set(-0.9, -0.5, 0)
  finBottom.rotation.z = 0.25
  ship.add(finBottom)

  // Sirip ekor vertikal.
  const tailFin = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.75, 0.07), hull)
  tailFin.position.set(-1.05, 0.5, 0)
  tailFin.rotation.z = 0.3
  ship.add(tailFin)

  // Pod mekanis di kedua sisi + blok mesin belakang.
  const podGeometry = new THREE.BoxGeometry(1.6, 0.32, 0.3)
  const engineGeometry = new THREE.CylinderGeometry(0.2, 0.24, 0.7, 8)
  const exhaustGeometry = new THREE.CircleGeometry(0.16, 12)
  for (const side of [1, -1]) {
    const pod = new THREE.Mesh(podGeometry, dark)
    pod.position.set(-0.25, -0.18, side * 0.52)
    ship.add(pod)

    const engine = new THREE.Mesh(engineGeometry, hull)
    engine.rotation.z = -Math.PI / 2
    engine.position.set(-1.45, -0.1, side * 0.52)
    ship.add(engine)

    const exhaust = new THREE.Mesh(exhaustGeometry, glow)
    exhaust.rotation.y = -Math.PI / 2
    exhaust.position.set(-1.81, -0.1, side * 0.52)
    ship.add(exhaust)
  }

  // Strip cahaya aksen di sisi badan.
  const stripGeometry = new THREE.BoxGeometry(1.8, 0.05, 0.02)
  for (const side of [1, -1]) {
    const strip = new THREE.Mesh(stripGeometry, glow)
    strip.position.set(0.1, 0.05, side * 0.37)
    ship.add(strip)
  }

  ship.userData['forward'] = new THREE.Vector3(1, 0, 0)
  return ship
}
