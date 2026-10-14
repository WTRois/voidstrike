import { describe, expect, it, vi } from 'vitest'

import { EventEmitter } from '../../game/core/EventEmitter'

describe('EventEmitter', () => {
  it('mengirim payload ke semua subscriber', () => {
    const emitter = new EventEmitter<string>()
    const first = vi.fn()
    const second = vi.fn()
    emitter.subscribe(first)
    emitter.subscribe(second)
    emitter.emit('ready')
    expect(first).toHaveBeenCalledWith('ready')
    expect(second).toHaveBeenCalledWith('ready')
  })

  it('unsubscribe menghentikan pengiriman ke listener tersebut', () => {
    const emitter = new EventEmitter<number>()
    const listener = vi.fn()
    const unsubscribe = emitter.subscribe(listener)
    unsubscribe()
    emitter.emit(1)
    expect(listener).not.toHaveBeenCalled()
    expect(emitter.size).toBe(0)
  })

  it('clear menghapus semua listener', () => {
    const emitter = new EventEmitter<number>()
    emitter.subscribe(vi.fn())
    emitter.clear()
    expect(emitter.size).toBe(0)
  })
})
