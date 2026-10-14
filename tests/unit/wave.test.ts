import { describe, expect, it } from 'vitest'

import { WAVE } from '../../game/config/gameBalance'
import { WaveSystem } from '../../game/systems/WaveSystem'

describe('WaveSystem', () => {
  it('boss muncul pada wave 3, 6, 9 dan kelipatannya', () => {
    const waves = new WaveSystem()
    for (const wave of [3, 6, 9, 12]) {
      expect(waves.isBossWave(wave)).toBe(true)
    }
    for (const wave of [1, 2, 4, 5, 7, 8]) {
      expect(waves.isBossWave(wave)).toBe(false)
    }
  })

  it('kuota kill menyelesaikan wave normal', () => {
    const waves = new WaveSystem()
    const quota = waves.quotaFor(1)
    for (let i = 0; i < quota - 1; i += 1) {
      expect(waves.registerKill()).toBe(false)
    }
    expect(waves.registerKill()).toBe(true)
    waves.advance()
    expect(waves.wave).toBe(2)
    expect(waves.kills).toBe(0)
  })

  it('transisi wave tidak jalan saat boss masih hidup', () => {
    const waves = new WaveSystem()
    waves.reset(3)
    waves.onBossSpawned()
    expect(waves.registerKill()).toBe(false)
    expect(waves.registerBossDefeated()).toBe(true)
    expect(waves.registerBossDefeated()).toBe(false)
  })

  it('difficulty scaling mengikuti cap', () => {
    const waves = new WaveSystem()
    expect(waves.intervalFor('scout', 1)).toBeCloseTo(0.9, 10)
    expect(waves.intervalFor('scout', 999)).toBe(WAVE.minIntervalSeconds)
    expect(waves.speedMultiplier(1)).toBe(1)
    expect(waves.speedMultiplier(999)).toBe(WAVE.speedMax)
    expect(waves.fireIntervalScale(1)).toBe(1)
    expect(waves.fireIntervalScale(999)).toBe(WAVE.fireIntervalMinScale)
  })

  it('komposisi terbuka bertahap dan ringan saat boss wave', () => {
    const waves = new WaveSystem()
    const kinds = (wave: number): string[] => waves.composition(wave).map((rule) => rule.kind)
    expect(kinds(1)).toEqual(expect.arrayContaining(['scout', 'asteroid']))
    expect(kinds(1)).not.toContain('interceptor')
    expect(kinds(2)).toContain('interceptor')
    expect(kinds(4)).toContain('heavy')
    const bossWave = waves.composition(3)
    expect(bossWave.length).toBeLessThanOrEqual(2)
    expect(waves.quotaFor(999)).toBe(WAVE.quotaMax)
  })

  it('reset mendukung startWave playtesting dengan batas aman', () => {
    const waves = new WaveSystem()
    waves.reset(3)
    expect(waves.wave).toBe(3)
    waves.reset(0)
    expect(waves.wave).toBe(1)
    waves.reset(999)
    expect(waves.wave).toBe(99)
  })
})
