import { describe, expect, it, vi } from 'vitest'

import { clampDelta, GameLoop } from '../../game/core/GameLoop'

function createMockRaf() {
  let nextId = 0
  const callbacks = new Map<number, (timeMs: number) => void>()
  return {
    callbacks,
    requestFrame: (callback: (timeMs: number) => void): number => {
      nextId += 1
      callbacks.set(nextId, callback)
      return nextId
    },
    cancelFrame: (handle: number): void => {
      callbacks.delete(handle)
    },
    flush: (timeMs: number): void => {
      for (const callback of [...callbacks.values()]) {
        callback(timeMs)
      }
    },
  }
}

describe('clampDelta', () => {
  it('membatasi delta besar ke maksimum', () => {
    expect(clampDelta(1.5, 0.05)).toBe(0.05)
  })

  it('menolak nilai negatif dan non-finite', () => {
    expect(clampDelta(-1)).toBe(0)
    expect(clampDelta(Number.NaN)).toBe(0)
    expect(clampDelta(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('GameLoop', () => {
  it('start idempotent: satu loop aktif walau dipanggil dua kali', () => {
    const raf = createMockRaf()
    const onTick = vi.fn()
    const loop = new GameLoop({
      onTick,
      clock: () => 1000,
      requestFrame: raf.requestFrame,
      cancelFrame: raf.cancelFrame,
    })
    loop.start()
    loop.start()
    expect(raf.callbacks.size).toBe(1)
    expect(loop.isRunning).toBe(true)
    loop.dispose()
  })

  it('meneruskan delta ter-clamp berdasarkan clock, bukan jumlah frame', () => {
    const raf = createMockRaf()
    let now = 1000
    const onTick = vi.fn()
    const loop = new GameLoop({
      onTick,
      maxDeltaSeconds: 0.05,
      clock: () => now,
      requestFrame: raf.requestFrame,
      cancelFrame: raf.cancelFrame,
    })
    loop.start()
    now = 1120 // +120ms → harus ter-clamp ke 0.05
    raf.flush(now)
    expect(onTick).toHaveBeenCalledTimes(1)
    expect(onTick.mock.calls[0]?.[0]).toBeCloseTo(0.05, 10)
    loop.dispose()
  })

  it('stop menghentikan tick dan dispose mencegah start ulang', () => {
    const raf = createMockRaf()
    const onTick = vi.fn()
    const loop = new GameLoop({
      onTick,
      clock: () => 0,
      requestFrame: raf.requestFrame,
      cancelFrame: raf.cancelFrame,
    })
    loop.start()
    loop.stop()
    expect(loop.isRunning).toBe(false)
    raf.flush(500)
    expect(onTick).not.toHaveBeenCalled()
    loop.dispose()
    loop.start()
    expect(loop.isRunning).toBe(false)
  })
})
