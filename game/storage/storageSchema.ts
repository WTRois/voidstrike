import type { QualityPreset } from '../types/game'

/** Key berversi; jangan pakai key generik (PRD §14.1). */
export const PROFILE_KEY = 'voidstrike.profile.v1'
export const MAX_TOP_SCORES = 10

export interface RunRecord {
  score: number
  wave: number
  durationMs: number
  enemiesDestroyed: number
  bossDefeated: number
  playedAt: string
}

export interface LocalProfileV1 {
  version: 1
  bestScore: number
  topScores: RunRecord[]
  settings: {
    muted: boolean
    quality: QualityPreset
    cameraShake: boolean
  }
  totalRuns: number
  updatedAt: string
}

export interface RunInput {
  score: number
  wave: number
  durationMs: number
  enemiesDestroyed: number
  bossDefeated: number
}

function isValidCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function toIntCount(value: unknown): number {
  return isValidCount(value) ? Math.floor(value) : 0
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function parseRecord(raw: unknown): RunRecord | null {
  if (typeof raw !== 'object' || raw === null) {
    return null
  }
  const record = raw as Record<string, unknown>
  if (!isValidDate(record['playedAt'])) {
    return null
  }
  return {
    score: toIntCount(record['score']),
    wave: toIntCount(record['wave']),
    durationMs: toIntCount(record['durationMs']),
    enemiesDestroyed: toIntCount(record['enemiesDestroyed']),
    bossDefeated: toIntCount(record['bossDefeated']),
    playedAt: record['playedAt'],
  }
}

function parseQuality(value: unknown): QualityPreset {
  return value === 'low' || value === 'high' || value === 'auto' ? value : 'auto'
}

export function defaultProfile(): LocalProfileV1 {
  return {
    version: 1,
    bestScore: 0,
    topScores: [],
    settings: { muted: false, quality: 'auto', cameraShake: false },
    totalRuns: 0,
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Validasi penuh (PRD §14.3): JSON corrupt/invalid → default aman,
 * entri rusak dibuang, top 10 terurut, best konsisten dengan top scores.
 */
export function parseProfile(raw: unknown): LocalProfileV1 {
  const fallback = defaultProfile()
  if (typeof raw !== 'object' || raw === null) {
    return fallback
  }
  const data = raw as Record<string, unknown>
  if (data['version'] !== 1) {
    return fallback
  }
  const records: RunRecord[] = []
  if (Array.isArray(data['topScores'])) {
    for (const entry of data['topScores']) {
      const record = parseRecord(entry)
      if (record !== null) {
        records.push(record)
      }
    }
  }
  records.sort((a, b) => b.score - a.score)
  const topScores = records.slice(0, MAX_TOP_SCORES)
  const settings = (data['settings'] ?? {}) as Record<string, unknown>
  const bestScore = Math.max(toIntCount(data['bestScore']), topScores[0]?.score ?? 0)
  return {
    version: 1,
    bestScore,
    topScores,
    settings: {
      muted: settings['muted'] === true,
      quality: parseQuality(settings['quality']),
      cameraShake: settings['cameraShake'] === true,
    },
    totalRuns: toIntCount(data['totalRuns']),
    updatedAt: isValidDate(data['updatedAt']) ? (data['updatedAt'] as string) : fallback.updatedAt,
  }
}
