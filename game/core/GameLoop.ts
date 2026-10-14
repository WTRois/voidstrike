import { RENDER } from '../config/gameBalance'

/** Clamp delta agar lag tab tidak menimbulkan lompatan simulasi (PRD §11.4). */
export function clampDelta(
  rawSeconds: number,
  maxSeconds: number = RENDER.maxDeltaSeconds,
): number {
  if (!Number.isFinite(rawSeconds) || rawSeconds < 0) {
    return 0
  }
  return Math.min(rawSeconds, maxSeconds)
}

export interface GameLoopOptions {
  onTick: (dtSeconds: number) => void
  maxDeltaSeconds?: number
  clock?: () => number
  requestFrame?: (callback: (timeMs: number) => void) => number
  cancelFrame?: (handle: number) => void
}

function defaultClock(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

/**
 * Pemilik tunggal render/game loop (PRD §11.4).
 * Memakai requestAnimationFrame; start() idempotent, dispose() final.
 * Fixed-step accumulator ditunda ke Tahap 2 bila collision membutuhkannya.
 */
export class GameLoop {
  private readonly onTick: (dtSeconds: number) => void
  private readonly maxDeltaSeconds: number
  private readonly clock: () => number
  private readonly requestFrame: (callback: (timeMs: number) => void) => number
  private readonly cancelFrame: (handle: number) => void
  private handle: number | null = null
  private lastTime = 0
  private disposed = false

  constructor(options: GameLoopOptions) {
    this.onTick = options.onTick
    this.maxDeltaSeconds = options.maxDeltaSeconds ?? RENDER.maxDeltaSeconds
    this.clock = options.clock ?? defaultClock
    this.requestFrame =
      options.requestFrame ??
      ((callback) =>
        typeof requestAnimationFrame !== 'undefined' ? requestAnimationFrame(callback) : 0)
    this.cancelFrame =
      options.cancelFrame ??
      ((handle) => {
        if (typeof cancelAnimationFrame !== 'undefined') {
          cancelAnimationFrame(handle)
        }
      })
  }

  get isRunning(): boolean {
    return this.handle !== null
  }

  start(): void {
    if (this.disposed || this.handle !== null) {
      return
    }
    this.lastTime = this.clock()
    const step = (): void => {
      if (this.handle === null || this.disposed) {
        return
      }
      const now = this.clock()
      const dt = clampDelta((now - this.lastTime) / 1000, this.maxDeltaSeconds)
      this.lastTime = now
      this.onTick(dt)
      if (this.handle !== null && !this.disposed) {
        this.handle = this.requestFrame(step)
      }
    }
    this.handle = this.requestFrame(step)
  }

  stop(): void {
    if (this.handle !== null) {
      this.cancelFrame(this.handle)
      this.handle = null
    }
  }

  dispose(): void {
    this.disposed = true
    this.stop()
  }
}
