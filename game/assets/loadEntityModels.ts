import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface ModelNormalizeOptions {
  /** Panjang sisi-bounding-box terpanjang setelah skala (world unit). */
  targetLength: number
  /** Yaw asumsi model menghadap +Z; +90° → +X, −90° → −X. */
  yawRadians: number
  /** Roll pra-yaw untuk model berhidung +Y (rebah ke bidang XY). */
  rollRadians?: number
  /** Gabung mesh statis per material (default true; hemat draw call). */
  merge?: boolean
  /** Nama grup hasil untuk kontrak sync engine. */
  name: string
  /** Arah hidung logis (+X pemain, −X musuh). */
  forwardX: 1 | -1
}

/**
 * Loader GLB generik best-effort (PRD §10.3): gagal load → null dan
 * pemanggil tetap memakai placeholder. GLTFLoader diimpor dinamis agar
 * bundle/test node tidak terbebani.
 */
export async function loadModel(url: string): Promise<THREE.Object3D | null> {
  try {
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    const loader = new GLTFLoader()
    const gltf = await loader.loadAsync(url)
    return gltf.scene
  } catch {
    return null
  }
}

/**
 * Normalisasi murni (teruji node): merge mesh statis per material, bbox ke
 * origin, skala uniform, orientasi ke arah hadap. Visual dipisah dari
 * hitbox (PRD §10.3, §11.5).
 */
export function normalizeModel(
  source: THREE.Object3D,
  options: ModelNormalizeOptions,
): THREE.Group {
  const group = new THREE.Group()
  group.name = options.name
  const content = options.merge === false ? source : mergeStaticMeshes(source)
  const orient = new THREE.Group()
  const flat = new THREE.Group()
  flat.rotation.z = options.rollRadians ?? 0
  flat.add(content)
  orient.add(flat)
  orient.rotation.y = options.yawRadians
  group.add(orient)
  group.updateMatrixWorld(true)
  const preBox = new THREE.Box3().setFromObject(orient)
  const preSize = preBox.getSize(new THREE.Vector3())
  const maxDim = Math.max(preSize.x, preSize.y, preSize.z)
  if (maxDim > 0) {
    orient.scale.setScalar(options.targetLength / maxDim)
    // Ukur ULANG pasca-skala: shift dihitung dari dunia final agar tepat nol.
    group.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(orient)
    const center = box.getCenter(new THREE.Vector3())
    const localCenter = flat.worldToLocal(center.clone())
    content.position.sub(localCenter)
  }
  group.userData['forward'] = new THREE.Vector3(options.forwardX, 0, 0)
  return group
}

/**
 * Gabung semua Mesh statis per material menjadi satu mesh (hemat draw
 * call: musuh 65–140 mesh → ±jumlah material). Transform dunia di-bake
 * ke geometri. Skinned/morph dipertahankan apa adanya (tidak di-merge).
 */
export function mergeStaticMeshes(source: THREE.Object3D): THREE.Object3D {
  source.updateMatrixWorld(true)
  const buckets = new Map<
    string,
    { material: THREE.Material; geometries: THREE.BufferGeometry[] }
  >()
  const kept: THREE.Object3D[] = []
  const meshes: THREE.Mesh[] = []
  source.traverse((child) => {
    if ((child as THREE.Mesh).isMesh === true) {
      meshes.push(child as THREE.Mesh)
    }
  })
  for (const mesh of meshes) {
    const geometry = mesh.geometry as THREE.BufferGeometry
    const morphPositions = geometry.morphAttributes['position'] ?? []
    if ((mesh as THREE.SkinnedMesh).isSkinnedMesh === true || morphPositions.length > 0) {
      kept.push(mesh)
      continue
    }
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    const material = materials[0] ?? new THREE.MeshStandardMaterial()
    const baked = geometry.index !== null ? geometry.toNonIndexed() : geometry.clone()
    if (baked.getAttribute('normal') === undefined) {
      baked.computeVertexNormals()
    }
    baked.applyMatrix4(mesh.matrixWorld)
    const key = (material as THREE.Material).uuid
    const bucket = buckets.get(key)
    if (bucket !== undefined) {
      bucket.geometries.push(baked)
    } else {
      buckets.set(key, { material: material as THREE.Material, geometries: [baked] })
    }
  }
  const merged = new THREE.Group()
  for (const { material, geometries } of buckets.values()) {
    // Samakan set atribut agar mergeGeometries tidak gagal.
    let common = new Set(Object.keys(geometries[0]?.attributes ?? {}))
    for (const entry of geometries) {
      common = new Set([...common].filter((name) => entry.getAttribute(name) !== undefined))
    }
    for (const entry of geometries) {
      for (const name of Object.keys(entry.attributes)) {
        if (!common.has(name)) {
          entry.deleteAttribute(name)
        }
      }
    }
    const combined = mergeGeometries(geometries, false)
    for (const entry of geometries) {
      entry.dispose()
    }
    if (combined !== null) {
      merged.add(new THREE.Mesh(combined, material))
    }
  }
  for (const node of kept) {
    merged.add(node)
  }
  return merged
}
