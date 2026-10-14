import { AUDIO } from '../config/gameBalance'

interface ToneOptions {
  frequency: number
  frequencyEnd?: number
  durationSeconds: number
  type: OscillatorType
  gain: number
}

/** URL sampel SFX; kosong = synth murni (aman di node/test). */
export interface SfxSampleUrls {
  shoot?: string
  explosion?: string
  intro?: string
}

function canUseHtmlAudio(): boolean {
  return typeof Audio !== 'undefined'
}

function makePool(
  url: string | undefined,
  size: number,
  gain: number,
  muted: boolean,
): HTMLAudioElement[] {
  if (!canUseHtmlAudio() || url === undefined || url === '') {
    return []
  }
  const pool: HTMLAudioElement[] = []
  try {
    for (let i = 0; i < size; i += 1) {
      const element = new Audio(url)
      element.preload = 'auto'
      element.volume = muted ? 0 : gain
      pool.push(element)
    }
  } catch {
    return []
  }
  return pool
}

/**
 * Audio hibrida Tahap 7: sampel MP3 (shoot/explosion/intro) bila URL
 * tersedia dan HTMLAudio didukung; Web Audio synthesizer tetap dipakai
 * sebagai fallback dan untuk efek lain (hit, pickup, special, warn, click).
 * Best-effort: context/sample gagal → no-op, game tetap jalan.
 */
export class AudioManager {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  private mutedFlag = false
  private readonly sampleUrls: SfxSampleUrls
  private shootPool: HTMLAudioElement[] = []
  private shootIndex = 0
  private explosionPool: HTMLAudioElement[] = []
  private explosionIndex = 0
  private introSound: HTMLAudioElement | null = null

  constructor(sampleUrls: SfxSampleUrls = {}) {
    this.sampleUrls = sampleUrls
  }

  isMuted(): boolean {
    return this.mutedFlag
  }

  /** Jumlah sampel siap main (smoke test dev; 0 di node). */
  getPoolState(): { shootPool: number; explosionPool: number; introLoaded: boolean } {
    return {
      shootPool: this.shootPool.length,
      explosionPool: this.explosionPool.length,
      introLoaded: this.introSound !== null,
    }
  }

  setMuted(muted: boolean): void {
    this.mutedFlag = muted
    if (this.master !== null && this.context !== null) {
      this.master.gain.setValueAtTime(muted ? 0 : 1, this.context.currentTime)
    }
    for (const element of [...this.shootPool, ...this.explosionPool]) {
      element.volume = 0
    }
    if (this.introSound !== null) {
      this.introSound.volume = 0
    }
    if (!muted) {
      this.restoreSampleVolumes()
    }
  }

  private restoreSampleVolumes(): void {
    for (const element of this.shootPool) {
      element.volume = AUDIO.shootGain
    }
    for (const element of this.explosionPool) {
      element.volume = AUDIO.explosionGain
    }
    if (this.introSound !== null) {
      this.introSound.volume = AUDIO.introGain
    }
  }

  toggleMute(): boolean {
    this.setMuted(!this.mutedFlag)
    return this.mutedFlag
  }

  unlock(): void {
    if (typeof window === 'undefined') {
      return
    }
    const candidate =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (candidate === undefined) {
      return
    }
    try {
      if (this.context === null) {
        this.context = new candidate()
        this.master = this.context.createGain()
        this.master.gain.value = this.mutedFlag ? 0 : 1
        this.master.connect(this.context.destination)
      }
      if (this.context.state === 'suspended') {
        void this.context.resume()
      }
    } catch {
      this.context = null
      this.master = null
    }
    if (
      this.shootPool.length === 0 &&
      this.explosionPool.length === 0 &&
      this.introSound === null
    ) {
      this.shootPool = makePool(
        this.sampleUrls.shoot,
        AUDIO.shootPoolSize,
        AUDIO.shootGain,
        this.mutedFlag,
      )
      this.explosionPool = makePool(
        this.sampleUrls.explosion,
        AUDIO.explosionPoolSize,
        AUDIO.explosionGain,
        this.mutedFlag,
      )
      if (
        canUseHtmlAudio() &&
        this.sampleUrls.intro !== undefined &&
        this.sampleUrls.intro !== ''
      ) {
        try {
          this.introSound = new Audio(this.sampleUrls.intro)
          this.introSound.preload = 'auto'
          this.introSound.volume = this.mutedFlag ? 0 : AUDIO.introGain
        } catch {
          this.introSound = null
        }
      }
    }
  }

  dispose(): void {
    try {
      void this.context?.close()
    } catch {
      // Audio best-effort; abaikan kegagalan cleanup.
    }
    this.context = null
    this.master = null
    this.noiseBuffer = null
    for (const element of [...this.shootPool, ...this.explosionPool]) {
      try {
        element.pause()
        element.removeAttribute('src')
        element.load()
      } catch {
        // Best-effort.
      }
    }
    this.shootPool = []
    this.explosionPool = []
    if (this.introSound !== null) {
      try {
        this.introSound.pause()
      } catch {
        // Best-effort.
      }
      this.introSound = null
    }
  }

  private playSample(kind: 'shoot' | 'explosion'): boolean {
    const pool = kind === 'shoot' ? this.shootPool : this.explosionPool
    if (pool.length === 0) {
      return false
    }
    const index = kind === 'shoot' ? this.shootIndex : this.explosionIndex
    const element = pool[index % pool.length]
    if (kind === 'shoot') {
      this.shootIndex = index + 1
    } else {
      this.explosionIndex = index + 1
    }
    if (element === undefined) {
      return false
    }
    try {
      element.currentTime = 0
      void element.play()?.catch(() => {})
      return true
    } catch {
      return false
    }
  }

  shoot(): void {
    if (this.playSample('shoot')) {
      return
    }
    this.tone({
      frequency: 700,
      frequencyEnd: 420,
      durationSeconds: 0.05,
      type: 'square',
      gain: 0.035,
    })
  }

  enemyDestroyed(): void {
    if (this.playSample('explosion')) {
      return
    }
    this.noiseBurst(0.12, 0.12, 2400)
  }

  bossExploded(): void {
    if (this.playSample('explosion')) {
      return
    }
    this.noiseBurst(0.5, 0.2, 900)
    this.tone({ frequency: 90, frequencyEnd: 40, durationSeconds: 0.5, type: 'sine', gain: 0.18 })
  }

  /** Bunyi mulai run (intro-start.mp3; fallback synth rising). */
  gameStart(): void {
    if (this.introSound !== null) {
      try {
        this.introSound.currentTime = 0
        void this.introSound.play()?.catch(() => {})
        return
      } catch {
        // Jatuh ke synth.
      }
    }
    this.tone({
      frequency: 220,
      frequencyEnd: 660,
      durationSeconds: 0.25,
      type: 'sawtooth',
      gain: 0.07,
    })
  }

  playerHit(shielded: boolean): void {
    if (shielded) {
      this.tone({
        frequency: 920,
        frequencyEnd: 700,
        durationSeconds: 0.12,
        type: 'triangle',
        gain: 0.12,
      })
    } else {
      this.tone({
        frequency: 150,
        frequencyEnd: 70,
        durationSeconds: 0.2,
        type: 'sawtooth',
        gain: 0.14,
      })
    }
  }

  pickup(): void {
    this.tone({ frequency: 520, frequencyEnd: 940, durationSeconds: 0.12, type: 'sine', gain: 0.1 })
  }

  special(): void {
    this.tone({
      frequency: 220,
      frequencyEnd: 820,
      durationSeconds: 0.3,
      type: 'sawtooth',
      gain: 0.08,
    })
  }

  bossWarn(): void {
    this.tone({ frequency: 110, durationSeconds: 0.18, type: 'square', gain: 0.12 })
    this.tone({
      frequency: 110,
      durationSeconds: 0.18,
      type: 'square',
      gain: 0.12,
      delaySeconds: 0.22,
    })
  }

  click(): void {
    this.tone({ frequency: 620, durationSeconds: 0.03, type: 'sine', gain: 0.06 })
  }

  private tone(options: ToneOptions & { delaySeconds?: number }): void {
    if (this.context === null || this.master === null) {
      return
    }
    try {
      const start = this.context.currentTime + (options.delaySeconds ?? 0)
      const oscillator = this.context.createOscillator()
      const gain = this.context.createGain()
      oscillator.type = options.type
      oscillator.frequency.setValueAtTime(options.frequency, start)
      if (options.frequencyEnd !== undefined) {
        oscillator.frequency.exponentialRampToValueAtTime(
          Math.max(1, options.frequencyEnd),
          start + options.durationSeconds,
        )
      }
      gain.gain.setValueAtTime(options.gain, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + options.durationSeconds)
      oscillator.connect(gain)
      gain.connect(this.master)
      oscillator.start(start)
      oscillator.stop(start + options.durationSeconds + 0.02)
    } catch {
      // Best-effort.
    }
  }

  private noiseBurst(durationSeconds: number, gainValue: number, cutoffHz: number): void {
    if (this.context === null || this.master === null) {
      return
    }
    try {
      if (this.noiseBuffer === null) {
        const length = Math.floor(this.context.sampleRate * 0.6)
        this.noiseBuffer = this.context.createBuffer(1, length, this.context.sampleRate)
        const data = this.noiseBuffer.getChannelData(0)
        for (let i = 0; i < data.length; i += 1) {
          data[i] = Math.random() * 2 - 1
        }
      }
      const start = this.context.currentTime
      const source = this.context.createBufferSource()
      source.buffer = this.noiseBuffer
      const filter = this.context.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = cutoffHz
      const gain = this.context.createGain()
      gain.gain.setValueAtTime(gainValue, start)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSeconds)
      source.connect(filter)
      filter.connect(gain)
      gain.connect(this.master)
      source.start(start)
      source.stop(start + durationSeconds + 0.02)
    } catch {
      // Best-effort.
    }
  }
}
