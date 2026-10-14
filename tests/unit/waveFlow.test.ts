import { describe, expect, it } from 'vitest'

import { BOSS } from '../../game/config/gameBalance'
import { Boss } from '../../game/entities/Boss'
import { Enemy } from '../../game/entities/Enemy'
import { ScoreSystem } from '../../game/systems/ScoreSystem'
import { WaveSystem } from '../../game/systems/WaveSystem'

/**
 * Alur progression headless (tanpa WebGL): wave normal → kuota → advance,
 * wave boss → telegraph → kalah → bonus + advance. Logika yang sama
 * dipakai engine; glue rendering diverifikasi via smoke browser.
 */
describe('wave flow headless', () => {
  it('wave 1 → 2 lewat kuota kill', () => {
    const waves = new WaveSystem()
    const score = new ScoreSystem()
    const quota = waves.quotaFor(1)
    let completed = false
    for (let i = 0; i < quota; i += 1) {
      const enemy = new Enemy()
      enemy.spawn(5, 0, 'scout')
      if (enemy.damage(99)) {
        score.addKill(enemy.kind)
        completed = waves.registerKill()
      }
    }
    expect(completed).toBe(true)
    expect(score.kills).toBe(quota)
    expect(score.getScore()).toBe(quota * 100)
    waves.advance()
    expect(waves.wave).toBe(2)
    expect(waves.isBossWave()).toBe(false)
  })

  it('wave 3: boss spawn → telegraph → kalah → bonus + wave 4', () => {
    const waves = new WaveSystem()
    const score = new ScoreSystem()
    waves.reset(3)
    expect(waves.isBossWave()).toBe(true)
    const boss = new Boss()
    boss.spawn(12, 6, 0, BOSS.hpBase + BOSS.hpPerBoss * 1)
    waves.onBossSpawned()
    expect(waves.registerKill()).toBe(false)
    boss.update(BOSS.telegraphSeconds, 0, 0, -5, 5)
    expect(boss.isTelegraphing).toBe(false)
    let died = false
    for (let i = 0; i < 200 && !died; i += 1) {
      died = boss.damage(1)
    }
    expect(died).toBe(true)
    score.addBoss(waves.wave)
    expect(score.getScore()).toBe(1500 + 100 * 3)
    expect(waves.registerBossDefeated()).toBe(true)
    waves.advance()
    expect(waves.wave).toBe(4)
    expect(waves.bossActive).toBe(false)
  })

  it('survival dan kill terakumulasi bersama', () => {
    const score = new ScoreSystem()
    score.addSurvival(10)
    score.addKill('heavy')
    expect(score.getScore()).toBe(100 + 400)
  })
})
