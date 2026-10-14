import { SCORE } from '../config/gameBalance'
import type { EnemyKind } from '../entities/Enemy'

/**
 * Skor sesi: survival + kill + boss (PRD §8.10). Akumulasi float,
 * dibulatkan saat dibaca/disimpan. Persistensi masuk Tahap 6.
 */
export class ScoreSystem {
  private points = 0
  kills = 0
  bosses = 0

  reset(): void {
    this.points = 0
    this.kills = 0
    this.bosses = 0
  }

  addSurvival(dtSeconds: number): void {
    if (dtSeconds > 0) {
      this.points += SCORE.survivalPerSecond * dtSeconds
    }
  }

  addKill(kind: EnemyKind): void {
    this.points += SCORE.kill[kind]
    this.kills += 1
  }

  addBoss(wave: number): void {
    this.points += SCORE.bossBase + SCORE.bossPerWave * wave
    this.bosses += 1
  }

  getScore(): number {
    return Math.floor(this.points)
  }
}
