/**
 * Kontrak tipe bersama antara engine dan UI (PRD §11, §13).
 * Data per-frame tetap internal di engine; file ini hanya berisi
 * tipe snapshot/event yang boleh melintasi batas engine ↔ Vue.
 */
import type { GameState } from '../core/GameStateMachine'

/** Lifecycle minimal engine (PRD §11.3). Gameplay states penuh masuk Tahap 2. */
export type EngineStatus = 'initializing' | 'ready' | 'error' | 'disposed'

export type QualityPreset = 'low' | 'high' | 'auto'

export interface WorldBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface ViewportSize {
  width: number
  height: number
}

/** Snapshot ringkas untuk UI (PRD §13.6): diambil via poll ≤10Hz, bukan per-frame. */
export interface GameSnapshot {
  state: GameState
  hull: number
  shield: number
  maxHull: number
  maxShield: number
  specialRemaining: number
  specialCooldown: number
  enemiesActive: number
  shotsActive: number
  score: number
  wave: number
  kills: number
  bossesDefeated: number
  durationSeconds: number
  muted: boolean
  bossActive: boolean
  bossTelegraph: boolean
  bossHp: number
  bossMax: number
  bossName: string
}
