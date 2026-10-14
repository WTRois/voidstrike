import { WAVE } from '../config/gameBalance'
import type { EnemyKind } from '../entities/Enemy'

export interface CompositionRule {
  kind: EnemyKind
  desired: number
  intervalSeconds: number
}

const BASE_INTERVAL: Record<EnemyKind, number> = {
  scout: 0.9,
  interceptor: 1.6,
  heavy: 4,
  asteroid: 2.2,
  mine: 3,
}

const BASE_DESIRED: Record<EnemyKind, number> = {
  scout: 4,
  interceptor: 3,
  heavy: 2,
  asteroid: 2,
  mine: 1,
}

/**
 * Progression endless (PRD §8.9–8.10): wave bernomor, boss tiap
 * kelipatan 3, difficulty naik dengan cap. Logika murni, teruji penuh.
 */
export class WaveSystem {
  wave = 1
  kills = 0
  bossActive = false

  reset(startWave = 1): void {
    this.wave = Math.min(Math.max(Math.floor(startWave), 1), 99)
    this.kills = 0
    this.bossActive = false
  }

  isBossWave(wave: number = this.wave): boolean {
    return wave % WAVE.bossEveryWaves === 0
  }

  quotaFor(wave: number = this.wave): number {
    return Math.min(WAVE.quotaBase + WAVE.quotaPerWave * wave, WAVE.quotaMax)
  }

  /** Kill normal; true bila kuota wave terpenuhi (diabaikan saat boss aktif). */
  registerKill(): boolean {
    if (this.bossActive) {
      return false
    }
    this.kills += 1
    return this.kills >= this.quotaFor()
  }

  /** Boss kalah; true bila transisi wave boleh jalan. */
  registerBossDefeated(): boolean {
    if (!this.bossActive) {
      return false
    }
    this.bossActive = false
    return true
  }

  onBossSpawned(): void {
    this.bossActive = true
  }

  advance(): void {
    this.wave += 1
    this.kills = 0
    this.bossActive = false
  }

  intervalFor(kind: EnemyKind, wave: number = this.wave): number {
    const scaled = BASE_INTERVAL[kind] * Math.pow(WAVE.intervalDecay, wave - 1)
    return Math.max(WAVE.minIntervalSeconds, scaled)
  }

  speedMultiplier(wave: number = this.wave): number {
    return Math.min(WAVE.speedMax, 1 + WAVE.speedPerWave * (wave - 1))
  }

  fireIntervalScale(wave: number = this.wave): number {
    return Math.max(WAVE.fireIntervalMinScale, 1 - WAVE.fireIntervalPerWave * (wave - 1))
  }

  composition(wave: number = this.wave): CompositionRule[] {
    if (this.isBossWave(wave)) {
      return [
        { kind: 'scout', desired: 2, intervalSeconds: this.intervalFor('scout', wave) },
        { kind: 'interceptor', desired: 1, intervalSeconds: this.intervalFor('interceptor', wave) },
      ]
    }
    const rules: CompositionRule[] = [
      {
        kind: 'scout',
        desired: BASE_DESIRED.scout,
        intervalSeconds: this.intervalFor('scout', wave),
      },
      {
        kind: 'asteroid',
        desired: BASE_DESIRED.asteroid,
        intervalSeconds: this.intervalFor('asteroid', wave),
      },
    ]
    if (wave >= WAVE.unlockMine) {
      rules.push({
        kind: 'mine',
        desired: BASE_DESIRED.mine,
        intervalSeconds: this.intervalFor('mine', wave),
      })
    }
    if (wave >= WAVE.unlockInterceptor) {
      rules.push({
        kind: 'interceptor',
        desired: BASE_DESIRED.interceptor,
        intervalSeconds: this.intervalFor('interceptor', wave),
      })
    }
    if (wave >= WAVE.unlockHeavy) {
      rules.push({
        kind: 'heavy',
        desired: BASE_DESIRED.heavy,
        intervalSeconds: this.intervalFor('heavy', wave),
      })
    }
    return rules
  }
}
