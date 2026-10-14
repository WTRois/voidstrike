import { WORLD } from '../config/gameBalance'
import type { WorldBounds } from '../types/game'

const FALLBACK_ASPECT = 16 / 9

function isValidAspect(aspect: number): boolean {
  return Number.isFinite(aspect) && aspect > 0
}

/** Hitung batas dunia dari setengah tinggi frustum dan aspect ratio viewport. */
export function computeBounds(halfHeight: number, aspect: number): WorldBounds {
  const safeAspect = isValidAspect(aspect) ? aspect : FALLBACK_ASPECT
  const halfWidth = halfHeight * safeAspect
  return {
    minX: -halfWidth,
    maxX: halfWidth,
    minY: -halfHeight,
    maxY: halfHeight,
  }
}

/** Zona gerak pemain: pita kiri arena dengan margin dalam (PRD §6.2). */
export function computePlayerZone(bounds: WorldBounds): WorldBounds {
  const minX = bounds.minX + WORLD.playerMargin
  return {
    minX,
    maxX: Math.max(minX, bounds.minX + WORLD.playerZoneWidth),
    minY: bounds.minY + WORLD.playerMargin,
    maxY: bounds.maxY - WORLD.playerMargin,
  }
}

/** Posisi X spawn di luar batas kanan viewport (PRD §6.2). */
export function computeSpawnX(bounds: WorldBounds): number {
  return bounds.maxX + WORLD.spawnMarginX
}
