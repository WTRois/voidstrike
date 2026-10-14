import * as THREE from 'three'

/**
 * Placeholder musuh + proyektil (PRD §10.1, §9.1): siluet dan warna
 * pembeda dari kapal pemain — pecahan angular merah hangat untuk scout,
 * slug energi cyan terang untuk peluru pemain.
 */

export function createPlaceholderScout(): THREE.Group {
  const scout = new THREE.Group()
  scout.name = 'placeholder-scout'

  const hull = new THREE.MeshStandardMaterial({
    color: 0x4a1f1a,
    metalness: 0.7,
    roughness: 0.45,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x330d08,
    emissive: 0xff5a48,
    emissiveIntensity: 1.6,
  })

  // Badan pecahan menghadap -X (ke arah pemain).
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 5), hull)
  body.rotation.z = Math.PI / 2
  scout.add(body)

  // Sirip silang agar terbaca saat kecil.
  const finGeometry = new THREE.BoxGeometry(0.5, 1.1, 0.08)
  const finV = new THREE.Mesh(finGeometry, hull)
  finV.position.x = 0.3
  scout.add(finV)
  const finH = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.1), hull)
  finH.position.x = 0.3
  scout.add(finH)

  // Inti hangat terlihat dari samping.
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), glow)
  core.scale.set(1.4, 1, 1)
  core.position.x = -0.2
  scout.add(core)

  scout.userData['forward'] = new THREE.Vector3(-1, 0, 0)
  return scout
}

const PROJECTILE_MATERIAL = (): THREE.MeshBasicMaterial =>
  new THREE.MeshBasicMaterial({ color: 0x7df3ff })

/** Slug peluru pemain: memanjang −Z, murah (Basic) dan kontras dengan musuh. */
export function createPlayerProjectileMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.7), PROJECTILE_MATERIAL())
  mesh.visible = false
  return mesh
}

/** Interceptor: ramping dengan sirip menyapu + inti oranye. */
export function createPlaceholderInterceptor(): THREE.Group {
  const interceptor = new THREE.Group()
  interceptor.name = 'placeholder-interceptor'

  const hull = new THREE.MeshStandardMaterial({
    color: 0x3d2b1a,
    metalness: 0.7,
    roughness: 0.45,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x331a05,
    emissive: 0xffa63d,
    emissiveIntensity: 1.6,
  })

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.5, 6), hull)
  body.rotation.z = Math.PI / 2
  interceptor.add(body)

  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.07, 1.2), hull)
  wing.position.x = 0.35
  wing.rotation.z = 0.2
  interceptor.add(wing)

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), glow)
  core.position.x = -0.25
  interceptor.add(core)

  interceptor.userData['forward'] = new THREE.Vector3(-1, 0, 0)
  return interceptor
}

/** Heavy: lapis baja besar dengan inti merah. */
export function createPlaceholderHeavy(): THREE.Group {
  const heavy = new THREE.Group()
  heavy.name = 'placeholder-heavy'

  const hull = new THREE.MeshStandardMaterial({
    color: 0x3a1f2b,
    metalness: 0.75,
    roughness: 0.4,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x2b0812,
    emissive: 0xff3d6e,
    emissiveIntensity: 1.6,
  })

  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.85, 0), hull)
  body.scale.set(1.3, 1, 1)
  heavy.add(body)

  const plateGeometry = new THREE.BoxGeometry(0.9, 0.18, 1.5)
  const plateTop = new THREE.Mesh(plateGeometry, hull)
  plateTop.position.y = 0.7
  heavy.add(plateTop)
  const plateBottom = new THREE.Mesh(plateGeometry, hull)
  plateBottom.position.y = -0.7
  heavy.add(plateBottom)

  const core = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), glow)
  core.position.x = -0.4
  heavy.add(core)

  heavy.userData['forward'] = new THREE.Vector3(-1, 0, 0)
  return heavy
}

/** Asteroid: batuan irregular yang berputar. */
export function createPlaceholderAsteroid(): THREE.Group {
  const asteroid = new THREE.Group()
  asteroid.name = 'placeholder-asteroid'

  const rock = new THREE.MeshStandardMaterial({
    color: 0x4d4238,
    metalness: 0.2,
    roughness: 0.9,
    flatShading: true,
  })
  const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), rock)
  body.scale.set(1.2, 0.9, 0.9)
  asteroid.add(body)
  return asteroid
}

/** Mine: oktahedron kuning berdenyut, mudah dibedakan dari asteroid. */
export function createPlaceholderMine(): THREE.Group {
  const mine = new THREE.Group()
  mine.name = 'placeholder-mine'

  const hull = new THREE.MeshStandardMaterial({
    color: 0x4d3d1a,
    metalness: 0.6,
    roughness: 0.5,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x33270a,
    emissive: 0xffd23d,
    emissiveIntensity: 1.8,
  })
  mine.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), hull))
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 8), glow)
  mine.add(core)
  return mine
}

/** Slot musuh: satu anak per kind, visibilitas diatur saat sync. */
export function createEnemySlotMesh(): THREE.Group {
  const slot = new THREE.Group()
  slot.name = 'enemy-slot'
  const scout = createPlaceholderScout()
  scout.name = 'kind-scout'
  const interceptor = createPlaceholderInterceptor()
  interceptor.name = 'kind-interceptor'
  const heavy = createPlaceholderHeavy()
  heavy.name = 'kind-heavy'
  const asteroid = createPlaceholderAsteroid()
  asteroid.name = 'kind-asteroid'
  const mine = createPlaceholderMine()
  mine.name = 'kind-mine'
  slot.add(scout, interceptor, heavy, asteroid, mine)
  slot.visible = false
  return slot
}

/** Boss placeholder: lambung tiga lapis dengan inti ungu, skala besar. */
export function createPlaceholderBoss(): THREE.Group {
  const boss = new THREE.Group()
  boss.name = 'placeholder-boss'

  const hull = new THREE.MeshStandardMaterial({
    color: 0x2b1a33,
    metalness: 0.8,
    roughness: 0.4,
    flatShading: true,
  })
  const glow = new THREE.MeshStandardMaterial({
    color: 0x220a2e,
    emissive: 0xc44dff,
    emissiveIntensity: 1.8,
  })

  const core = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), hull)
  core.scale.set(1.2, 1, 1)
  boss.add(core)

  const shellGeometry = new THREE.BoxGeometry(1.2, 0.25, 2.2)
  const shellTop = new THREE.Mesh(shellGeometry, hull)
  shellTop.position.y = 1.1
  boss.add(shellTop)
  const shellBottom = new THREE.Mesh(shellGeometry, hull)
  shellBottom.position.y = -1.1
  boss.add(shellBottom)

  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 10), glow)
  eye.position.x = -0.7
  boss.add(eye)

  const spikeGeometry = new THREE.ConeGeometry(0.25, 0.9, 5)
  for (const [sx, sy] of [
    [0.6, 0.9],
    [0.6, -0.9],
    [-0.2, 1.2],
    [-0.2, -1.2],
  ] as const) {
    const spike = new THREE.Mesh(spikeGeometry, hull)
    spike.position.set(sx, sy, 0)
    spike.rotation.z = sy > 0 ? -0.4 : 0.4
    boss.add(spike)
  }

  boss.userData['forward'] = new THREE.Vector3(-1, 0, 0)
  boss.visible = false
  return boss
}

/** Slot pickup: satu anak per jenis, visibilitas diatur saat sync. */
export function createPickupSlotMesh(): THREE.Group {
  const slot = new THREE.Group()
  slot.name = 'pickup-slot'
  const hull = createPickupMesh('hull')
  hull.name = 'kind-hull'
  const shield = createPickupMesh('shield')
  shield.name = 'kind-shield'
  const weapon = createPickupMesh('weapon')
  weapon.name = 'kind-weapon'
  slot.add(hull, shield, weapon)
  slot.visible = false
  return slot
}
/** Misil pemain: slug oranye lebih besar dari peluru primer, sumbu −Z. */
export function createMissileMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 0.2, 0.8),
    new THREE.MeshBasicMaterial({ color: 0xffb03d }),
  )
  mesh.visible = false
  return mesh
}

/** Peluru musuh: bola merah yang kontras dengan peluru pemain (PRD §2.2). */
export function createEnemyProjectileMesh(): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xff4d3d }),
  )
  mesh.visible = false
  return mesh
}

/** Pickup: bentuk + warna berbeda per jenis (PRD §9.3, bukan warna saja). */
export function createPickupMesh(kind: 'hull' | 'shield' | 'weapon'): THREE.Group {
  const group = new THREE.Group()
  group.name = `pickup-${kind}`
  if (kind === 'hull') {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({
        color: 0x0d3320,
        emissive: 0x3dff8a,
        emissiveIntensity: 1.8,
      }),
    )
    group.add(mesh)
  } else if (kind === 'shield') {
    const mesh = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.4, 0),
      new THREE.MeshStandardMaterial({
        color: 0x0b2b33,
        emissive: 0x46e6ff,
        emissiveIntensity: 1.8,
      }),
    )
    group.add(mesh)
  } else {
    const mesh = new THREE.Mesh(
      new THREE.TetrahedronGeometry(0.45, 0),
      new THREE.MeshStandardMaterial({
        color: 0x33200a,
        emissive: 0xffb03d,
        emissiveIntensity: 1.8,
      }),
    )
    group.add(mesh)
  }
  group.visible = false
  return group
}
