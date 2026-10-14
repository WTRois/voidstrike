import type { BufferGeometry, Material, Object3D } from 'three'

interface DisposableChild {
  geometry?: BufferGeometry
  material?: Material | Material[]
}

function disposeMaterial(material: Material | Material[]): void {
  const list = Array.isArray(material) ? material : [material]
  for (const entry of list) {
    entry.dispose()
  }
}

/**
 * Bebaskan geometry/material milik subtree. Aman dipanggil berulang
 * dan aman untuk material bersama (dispose() Three.js idempotent).
 */
export function disposeObject3D(root: Object3D): void {
  root.traverse((child) => {
    const candidate = child as unknown as DisposableChild
    candidate.geometry?.dispose()
    if (candidate.material !== undefined) {
      disposeMaterial(candidate.material)
    }
  })
}
