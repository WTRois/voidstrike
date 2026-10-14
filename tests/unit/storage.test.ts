import { describe, expect, it } from 'vitest'

import {
  loadProfile,
  recordRun,
  resetLocalProfile,
  saveProfile,
} from '../../game/storage/localProfile'
import type { ProfileStore } from '../../game/storage/localProfile'
import {
  MAX_TOP_SCORES,
  PROFILE_KEY,
  defaultProfile,
  parseProfile,
} from '../../game/storage/storageSchema'

class MemoryStore implements ProfileStore {
  private readonly data = new Map<string, string>()

  getItem(key: string): string | null {
    return this.data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value)
  }

  removeItem(key: string): void {
    this.data.delete(key)
  }
}

class ThrowingStore implements ProfileStore {
  getItem(): string | null {
    throw new Error('denied')
  }

  setItem(): void {
    throw new Error('full')
  }

  removeItem(): void {
    throw new Error('denied')
  }
}

describe('storage schema', () => {
  it('profile valid diterima apa adanya', () => {
    const profile = parseProfile({
      version: 1,
      bestScore: 500,
      topScores: [
        {
          score: 500,
          wave: 3,
          durationMs: 60000,
          enemiesDestroyed: 9,
          bossDefeated: 1,
          playedAt: '2026-10-14T00:00:00.000Z',
        },
      ],
      settings: { muted: true, quality: 'low', cameraShake: true },
      totalRuns: 2,
      updatedAt: '2026-10-14T00:00:00.000Z',
    })
    expect(profile.bestScore).toBe(500)
    expect(profile.topScores).toHaveLength(1)
    expect(profile.settings.quality).toBe('low')
  })

  it('JSON corrupt / versi salah / bukan object → default aman', () => {
    expect(parseProfile(null).bestScore).toBe(0)
    expect(parseProfile('corrupt').topScores).toEqual([])
    expect(parseProfile({ version: 2 }).totalRuns).toBe(0)
    expect(parseProfile({ version: 1, bestScore: Number.NaN, topScores: 'x' }).bestScore).toBe(0)
    const fallback = defaultProfile()
    expect(fallback.version).toBe(1)
    expect(MAX_TOP_SCORES).toBe(10)
    expect(PROFILE_KEY).toBe('voidstrike.profile.v1')
  })

  it('entri rusak dibuang, top 10 terurut, best konsisten', () => {
    const raw: unknown[] = [
      {
        score: 50,
        wave: 1,
        durationMs: 1,
        enemiesDestroyed: 1,
        bossDefeated: 0,
        playedAt: 'bad-date',
      },
    ]
    for (let i = 0; i < 12; i += 1) {
      raw.push({
        score: i * 10,
        wave: 1,
        durationMs: 1,
        enemiesDestroyed: 1,
        bossDefeated: 0,
        playedAt: '2026-10-14T00:00:00.000Z',
      })
    }
    const profile = parseProfile({
      version: 1,
      bestScore: 5,
      topScores: raw,
      settings: {},
      totalRuns: -3,
      updatedAt: 'x',
    })
    expect(profile.topScores).toHaveLength(10)
    expect(profile.topScores[0]?.score).toBe(110)
    expect(profile.bestScore).toBe(110)
    expect(profile.totalRuns).toBe(0)
    expect(profile.settings.quality).toBe('auto')
  })
})

describe('localProfile', () => {
  it('recordRun menyimpan top 10 + best + totalRuns', () => {
    const store = new MemoryStore()
    const first = recordRun(
      { score: 100, wave: 2, durationMs: 60000, enemiesDestroyed: 8, bossDefeated: 0 },
      store,
    )
    expect(first.isNewBest).toBe(true)
    const second = recordRun(
      { score: 50, wave: 1, durationMs: 30000, enemiesDestroyed: 3, bossDefeated: 0 },
      store,
    )
    expect(second.isNewBest).toBe(false)
    const loaded = loadProfile(store)
    expect(loaded.bestScore).toBe(100)
    expect(loaded.topScores.map((entry) => entry.score)).toEqual([100, 50])
    expect(loaded.totalRuns).toBe(2)
  })

  it('storage melempar (penuh/nonaktif) tidak menghambat game', () => {
    const store = new ThrowingStore()
    expect(loadProfile(store).bestScore).toBe(0)
    expect(saveProfile(defaultProfile(), store)).toBe(false)
    const result = recordRun(
      { score: 10, wave: 1, durationMs: 1, enemiesDestroyed: 1, bossDefeated: 0 },
      store,
    )
    expect(result.profile.bestScore).toBe(10)
    expect(() => resetLocalProfile(store)).not.toThrow()
    expect(loadProfile(null).topScores).toEqual([])
  })

  it('reset menghapus data tersimpan', () => {
    const store = new MemoryStore()
    recordRun({ score: 10, wave: 1, durationMs: 1, enemiesDestroyed: 1, bossDefeated: 0 }, store)
    resetLocalProfile(store)
    const loaded = loadProfile(store)
    expect(loaded.bestScore).toBe(0)
    expect(loaded.totalRuns).toBe(0)
  })
})
