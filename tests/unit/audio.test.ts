import { describe, expect, it } from 'vitest'

import { AudioManager } from '../../game/effects/AudioManager'

describe('AudioManager', () => {
  it('semua efek aman dipanggil sebelum unlock (no-op tanpa context)', () => {
    const audio = new AudioManager()
    expect(() => {
      audio.shoot()
      audio.enemyDestroyed()
      audio.bossExploded()
      audio.gameStart()
      audio.playerHit(true)
      audio.playerHit(false)
      audio.pickup()
      audio.special()
      audio.bossWarn()
      audio.click()
    }).not.toThrow()
  })

  it('URL sampel tanpa HTMLAudio (node) tetap aman via fallback synth', () => {
    const audio = new AudioManager({
      shoot: 'shoot.mp3',
      explosion: 'boom.mp3',
      intro: 'intro.mp3',
    })
    expect(() => {
      audio.unlock()
      audio.shoot()
      audio.enemyDestroyed()
      audio.bossExploded()
      audio.gameStart()
      audio.setMuted(true)
      audio.shoot()
      audio.dispose()
    }).not.toThrow()
  })

  it('unlock tanpa DOM aman dan mute flag konsisten', () => {
    const audio = new AudioManager()
    audio.unlock()
    expect(audio.isMuted()).toBe(false)
    expect(audio.toggleMute()).toBe(true)
    expect(audio.isMuted()).toBe(true)
    audio.setMuted(false)
    expect(audio.isMuted()).toBe(false)
    audio.dispose()
  })
})
