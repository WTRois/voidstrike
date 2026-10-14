import { useRoute, useState } from '#app'
import { onMounted, onUnmounted, type Ref } from 'vue'

import spaceshipModelUrl from '~/assets/3d/spaceship.glb?url'
import scoutModelUrl from '~/assets/3d/enemy-scout.glb?url'
import interceptorModelUrl from '~/assets/3d/enemy-interceptor.glb?url'
import heavyModelUrl from '~/assets/3d/enemy-heavy.glb?url'
import asteroidModelUrl from '~/assets/3d/asteroid-01.glb?url'
import bossModelUrl from '~/assets/3d/boss-01.glb?url'
import explosionSfxUrl from '~/assets/audio/sfx/explotion-scifi.mp3?url'
import introSfxUrl from '~/assets/audio/sfx/intro-start.mp3?url'
import shootSfxUrl from '~/assets/audio/sfx/shoot-sfx.mp3?url'
import type { GameEngine, GameEngineOptions } from '../../game/core/GameEngine'
import type { GameState } from '../../game/core/GameStateMachine'
import { loadProfile, recordRun, saveProfile } from '../../game/storage/localProfile'
import type { GameSnapshot, QualityPreset } from '../../game/types/game'

export type GameSessionStatus = 'idle' | 'loading' | 'ready' | 'error'

const SNAPSHOT_INTERVAL_MS = 200

function parseStartWave(value: unknown): number {
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : Number.NaN
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 99 ? parsed : 1
}

let engine: GameEngine | null = null
let stateUnsubscribe: (() => void) | null = null
let snapshotTimer: ReturnType<typeof setInterval> | null = null
let attachCancelled = false
let ownerRecreate: (() => Promise<void>) | null = null
let runRecorded = false

/**
 * Adapter lifecycle engine ↔ Vue (PRD §13.6). Three.js hanya diimpor
 * dinamis setelah mount agar tidak dieksekusi saat SSR (PRD §3.3).
 * State gameplay mengalir via event subscription + snapshot 5 Hz,
 * bukan per-frame.
 *
 * Satu engine bersama: pemanggil dengan canvas menjadi owner (attach/
 * dispose), pemanggil tanpa canvas (menu/HUD) memakai state + aksi sama.
 * Preferensi (quality/muted/shake) hidup di sini; persistensi Tahap 6.
 */
export function useGameSession(canvasRef?: Ref<HTMLCanvasElement | null>) {
  const status = useState<GameSessionStatus>('vs-session-status', () => 'idle')
  const gameState = useState<GameState>('vs-game-state', () => 'menu')
  const errorMessage = useState<string | null>('vs-session-error', () => null)
  const snapshot = useState<GameSnapshot | null>('vs-snapshot', () => null)
  const quality = useState<QualityPreset>('vs-quality', () => 'auto')
  const muted = useState<boolean>('vs-muted', () => false)
  const shakeEnabled = useState<boolean>('vs-shake', () => false)
  const bestScore = useState<number>('vs-best', () => 0)
  const lastRunIsNewBest = useState<boolean>('vs-newbest', () => false)
  // Hook playtesting: ?wave=N memulai run dari wave N (default 1).
  const startWave = parseStartWave(useRoute().query.wave)

  function persistSettings(): void {
    const profile = loadProfile()
    profile.settings = {
      muted: muted.value,
      quality: quality.value,
      cameraShake: shakeEnabled.value,
    }
    profile.updatedAt = new Date().toISOString()
    saveProfile(profile)
  }

  function recordFinishedRun(): void {
    const current = snapshot.value ?? engine?.getSnapshot() ?? null
    if (current === null) {
      return
    }
    const { profile, isNewBest } = recordRun({
      score: current.score,
      wave: current.wave,
      durationMs: current.durationSeconds * 1000,
      enemiesDestroyed: current.kills,
      bossDefeated: current.bossesDefeated,
    })
    bestScore.value = profile.bestScore
    lastRunIsNewBest.value = isNewBest
  }

  function engineOptions(): GameEngineOptions {
    return {
      quality: quality.value,
      startWave,
      muted: muted.value,
      shake: shakeEnabled.value,
      shipModelUrl: spaceshipModelUrl,
      entityModelUrls: {
        scout: scoutModelUrl,
        interceptor: interceptorModelUrl,
        heavy: heavyModelUrl,
        asteroid: asteroidModelUrl,
      },
      bossModelUrl,
      sfx: { shoot: shootSfxUrl, explosion: explosionSfxUrl, intro: introSfxUrl },
    }
  }

  function startSnapshotPoll(): void {
    stopSnapshotPoll()
    snapshotTimer = setInterval(() => {
      const current = engine?.getSnapshot() ?? null
      snapshot.value = current
      // Perubahan mute dari tombol M keyboard hanya sampai ke engine;
      // selaraskan ref + persist di satu titik ini.
      if (current !== null && current.muted !== muted.value) {
        muted.value = current.muted
        persistSettings()
      }
    }, SNAPSHOT_INTERVAL_MS)
  }

  function stopSnapshotPoll(): void {
    if (snapshotTimer !== null) {
      clearInterval(snapshotTimer)
      snapshotTimer = null
    }
  }

  async function attach(): Promise<void> {
    const canvas = canvasRef?.value
    if (canvas === undefined || canvas === null || engine !== null) {
      return
    }
    attachCancelled = false
    status.value = 'loading'
    errorMessage.value = null
    // Preferensi + best dimuat dulu agar engine lahir dengan opsi benar.
    const profile = loadProfile()
    quality.value = profile.settings.quality
    muted.value = profile.settings.muted
    shakeEnabled.value = profile.settings.cameraShake
    bestScore.value = profile.bestScore
    lastRunIsNewBest.value = false
    try {
      const { GameEngine: EngineClass } = await import('../../game/core/GameEngine')
      if (attachCancelled) {
        return
      }
      engine = new EngineClass(canvas, engineOptions())
      if (attachCancelled) {
        engine.dispose()
        engine = null
        return
      }
      gameState.value = engine.getGameState()
      stateUnsubscribe = engine.subscribeGameState((state) => {
        gameState.value = state
        // Rekam skor tepat sekali per run saat game over (PRD §14).
        if (state === 'playing') {
          runRecorded = false
          lastRunIsNewBest.value = false
        } else if (state === 'gameOver' && !runRecorded) {
          runRecorded = true
          recordFinishedRun()
        }
      })
      engine.start()
      startSnapshotPoll()
      status.value = 'ready'
      // Profiling Tahap 6: hanya di dev, untuk smoke FPS/draw calls via browser.
      if (import.meta.dev && typeof window !== 'undefined') {
        ;(window as unknown as { __voidstrike?: unknown }).__voidstrike = {
          renderStats: () => engine?.getRenderStats() ?? null,
          snapshot: () => engine?.getSnapshot() ?? null,
          shipModel: () => engine?.isShipModelLoaded() ?? false,
          models: () => engine?.getLoadedModels() ?? [],
          sfx: () => engine?.getSfxState() ?? null,
        }
      }
    } catch (error) {
      engine = null
      if (error instanceof Error && error.name === 'EngineInitError') {
        errorMessage.value = error.message
      } else {
        errorMessage.value = 'Gagal menyiapkan viewport 3D. Coba muat ulang halaman.'
      }
      console.warn('[voidstrike] engine attach failed.', error)
      status.value = 'error'
    }
  }

  function detach(): void {
    stopSnapshotPoll()
    snapshot.value = null
    stateUnsubscribe?.()
    stateUnsubscribe = null
    engine?.dispose()
    engine = null
  }

  function startGame(): boolean {
    engine?.unlockAudio()
    return engine?.startRun() ?? false
  }

  function pauseGame(): boolean {
    return engine?.pause() ?? false
  }

  function resumeGame(): boolean {
    engine?.unlockAudio()
    return engine?.resume() ?? false
  }

  function quitToMenu(): boolean {
    return engine?.quitToMenu() ?? false
  }

  function restartRun(): boolean {
    return engine?.restartRun() ?? false
  }

  function fireSpecialWeapon(): boolean {
    engine?.unlockAudio()
    return engine?.fireSpecial() ?? false
  }

  function toggleMute(): boolean {
    const next = engine?.toggleMute() ?? !muted.value
    muted.value = next
    persistSettings()
    return next
  }

  function setMuted(value: boolean): void {
    muted.value = value
    if (engine !== null && engine.getSnapshot().muted !== value) {
      engine.toggleMute()
    }
    persistSettings()
  }

  function setShakeEnabled(value: boolean): void {
    shakeEnabled.value = value
    engine?.setShakeEnabled(value)
    persistSettings()
  }

  /** Ganti kualitas grafis (bangun ulang renderer → kembali ke menu). */
  async function applyQuality(value: QualityPreset): Promise<void> {
    quality.value = value
    persistSettings()
    await recreateEngine()
  }

  async function recreateEngine(): Promise<void> {
    if (ownerRecreate !== null) {
      await ownerRecreate()
    }
  }

  function playUiClick(): void {
    engine?.playUiClick()
  }

  /** Bersihkan total lalu mulai bersih — dipakai tombol retry + uji restart. */
  async function restart(): Promise<void> {
    if (canvasRef === undefined) {
      return
    }
    detach()
    await attach()
  }

  onMounted(() => {
    if (canvasRef !== undefined) {
      ownerRecreate = restart
      void attach()
    }
  })

  onUnmounted(() => {
    if (canvasRef !== undefined) {
      attachCancelled = true
      ownerRecreate = null
      detach()
    }
  })

  return {
    status,
    gameState,
    errorMessage,
    snapshot,
    quality,
    muted,
    shakeEnabled,
    bestScore,
    lastRunIsNewBest,
    startGame,
    pauseGame,
    resumeGame,
    quitToMenu,
    restartRun,
    fireSpecialWeapon,
    toggleMute,
    setMuted,
    setShakeEnabled,
    applyQuality,
    playUiClick,
    restart,
  }
}
