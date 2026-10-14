import { EventEmitter } from './EventEmitter'

/** State gameplay eksplisit (PRD §11.3). Tidak ada boolean ganda isPlaying/isDead. */
export type GameState = 'boot' | 'loading' | 'menu' | 'playing' | 'paused' | 'gameOver' | 'error'

const TRANSITIONS: Record<GameState, readonly GameState[]> = {
  boot: ['loading', 'error'],
  loading: ['menu', 'error'],
  menu: ['playing', 'error'],
  playing: ['paused', 'gameOver', 'menu', 'error'],
  paused: ['playing', 'menu', 'error'],
  gameOver: ['playing', 'menu'],
  error: ['menu'],
}

/** State machine dengan transisi eksplisit dan tervalidasi (PRD §11.3). */
export class GameStateMachine {
  private readonly events = new EventEmitter<GameState>()
  private state: GameState = 'boot'

  getState(): GameState {
    return this.state
  }

  can(to: GameState): boolean {
    return TRANSITIONS[this.state].includes(to)
  }

  /** Transisi valid → true; invalid ditolak (false), state tidak berubah. */
  transition(to: GameState): boolean {
    if (!this.can(to)) {
      return false
    }
    this.state = to
    this.events.emit(to)
    return true
  }

  subscribe(listener: (state: GameState) => void): () => void {
    return this.events.subscribe(listener)
  }

  /** Mulai sesi baru dari menu atau game over (reset state sesi milik engine). */
  startRun(): boolean {
    if (this.state !== 'menu' && this.state !== 'gameOver') {
      return false
    }
    return this.transition('playing')
  }

  pause(): boolean {
    return this.state === 'playing' ? this.transition('paused') : false
  }

  resume(): boolean {
    return this.state === 'paused' ? this.transition('playing') : false
  }

  quitToMenu(): boolean {
    if (this.state !== 'playing' && this.state !== 'paused' && this.state !== 'gameOver') {
      return false
    }
    return this.transition('menu')
  }

  endRun(): boolean {
    return this.state === 'playing' ? this.transition('gameOver') : false
  }

  fail(): boolean {
    return this.transition('error')
  }
}
