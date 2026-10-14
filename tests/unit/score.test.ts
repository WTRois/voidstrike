import { describe, expect, it } from 'vitest'

import { SCORE } from '../../game/config/gameBalance'
import { ScoreSystem } from '../../game/systems/ScoreSystem'

describe('ScoreSystem', () => {
  it('survival menambah 10 poin per detik dan dibulatkan', () => {
    const score = new ScoreSystem()
    score.addSurvival(1.5)
    expect(score.getScore()).toBe(15)
    score.addSurvival(0)
    score.addSurvival(-1)
    expect(score.getScore()).toBe(15)
  })

  it('kill reward sesuai archetype dan menghitung kills', () => {
    const score = new ScoreSystem()
    score.addKill('scout')
    score.addKill('interceptor')
    score.addKill('heavy')
    score.addKill('asteroid')
    score.addKill('mine')
    expect(score.getScore()).toBe(
      SCORE.kill.scout +
        SCORE.kill.interceptor +
        SCORE.kill.heavy +
        SCORE.kill.asteroid +
        SCORE.kill.mine,
    )
    expect(score.kills).toBe(5)
  })

  it('boss reward 1500 + bonus wave dan menghitung bosses', () => {
    const score = new ScoreSystem()
    score.addBoss(3)
    expect(score.getScore()).toBe(SCORE.bossBase + SCORE.bossPerWave * 3)
    expect(score.bosses).toBe(1)
  })

  it('reset mengosongkan semua', () => {
    const score = new ScoreSystem()
    score.addSurvival(10)
    score.addKill('scout')
    score.addBoss(3)
    score.reset()
    expect(score.getScore()).toBe(0)
    expect(score.kills).toBe(0)
    expect(score.bosses).toBe(0)
  })
})
