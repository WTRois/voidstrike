import {
  PROFILE_KEY,
  defaultProfile,
  parseProfile,
  type LocalProfileV1,
  type RunInput,
} from './storageSchema'

/** Subset Storage agar bisa di-fake pada test (penuh/corrupt/nonaktif). */
export interface ProfileStore {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

function defaultStore(): ProfileStore | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

/** Best-effort: storage rusak/nonaktif → default, game tetap jalan (PRD §14.3). */
export function loadProfile(store: ProfileStore | null = defaultStore()): LocalProfileV1 {
  if (store === null) {
    return defaultProfile()
  }
  try {
    const raw = store.getItem(PROFILE_KEY)
    if (raw === null) {
      return defaultProfile()
    }
    return parseProfile(JSON.parse(raw) as unknown)
  } catch {
    return defaultProfile()
  }
}

export function saveProfile(
  profile: LocalProfileV1,
  store: ProfileStore | null = defaultStore(),
): boolean {
  if (store === null) {
    return false
  }
  try {
    store.setItem(PROFILE_KEY, JSON.stringify(profile))
    return true
  } catch {
    return false
  }
}

export function recordRun(
  input: RunInput,
  store: ProfileStore | null = defaultStore(),
): { profile: LocalProfileV1; isNewBest: boolean } {
  const profile = loadProfile(store)
  const previousBest = profile.bestScore
  profile.topScores.push({
    score: Math.max(0, Math.floor(input.score)),
    wave: Math.max(0, Math.floor(input.wave)),
    durationMs: Math.max(0, Math.floor(input.durationMs)),
    enemiesDestroyed: Math.max(0, Math.floor(input.enemiesDestroyed)),
    bossDefeated: Math.max(0, Math.floor(input.bossDefeated)),
    playedAt: new Date().toISOString(),
  })
  profile.topScores.sort((a, b) => b.score - a.score)
  profile.topScores = profile.topScores.slice(0, 10)
  profile.bestScore = Math.max(previousBest, profile.topScores[0]?.score ?? 0)
  profile.totalRuns += 1
  profile.updatedAt = new Date().toISOString()
  saveProfile(profile, store)
  return { profile, isNewBest: profile.bestScore > previousBest }
}

export function resetLocalProfile(store: ProfileStore | null = defaultStore()): void {
  if (store === null) {
    return
  }
  try {
    store.removeItem(PROFILE_KEY)
  } catch {
    // Best-effort.
  }
}
