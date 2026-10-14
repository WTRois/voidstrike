import { describe, expect, it, vi } from 'vitest'

import type { InputEventTarget } from '../../game/input/InputManager'
import { InputManager } from '../../game/input/InputManager'

class FakeTarget implements InputEventTarget {
  private readonly listeners = new Map<string, Set<EventListener>>()

  addEventListener(type: string, listener: EventListener): void {
    let set = this.listeners.get(type)
    if (set === undefined) {
      set = new Set()
      this.listeners.set(type, set)
    }
    set.add(listener)
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener)
  }

  key(code: string, type: 'keydown' | 'keyup', repeat = false): void {
    let prevented = false
    const event = {
      type,
      code,
      repeat,
      preventDefault: () => {
        prevented = true
      },
    } as unknown as Event
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
    if (type === 'keydown') {
      this.lastPrevented = prevented
    }
  }

  pointer(
    type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
    clientX: number,
    clientY: number,
  ): void {
    const event = { type, clientX, clientY, isPrimary: true, button: 0 } as unknown as Event
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }

  blur(): void {
    const event = { type: 'blur' } as unknown as Event
    for (const listener of this.listeners.get('blur') ?? []) {
      listener(event)
    }
  }

  lastPrevented = false
}

describe('InputManager', () => {
  it('mengubah WASD/panah menjadi axis netral', () => {
    const target = new FakeTarget()
    const input = new InputManager(target)
    target.key('KeyD', 'keydown')
    target.key('KeyW', 'keydown')
    expect(input.getAxis()).toEqual({ x: 1, y: 1 })
    target.key('KeyD', 'keyup')
    expect(input.getAxis()).toEqual({ x: 0, y: 1 })
    target.key('ArrowLeft', 'keydown')
    target.key('ArrowRight', 'keydown')
    expect(input.getAxis().x).toBe(0)
    input.dispose()
  })

  it('tombol tak dikenal diabaikan tanpa preventDefault', () => {
    const target = new FakeTarget()
    const callbacks = { onPause: vi.fn(), onConfirm: vi.fn(), onMute: vi.fn(), onSpecial: vi.fn() }
    const input = new InputManager(target, callbacks)
    target.key('KeyQ', 'keydown')
    expect(target.lastPrevented).toBe(false)
    expect(callbacks.onPause).not.toHaveBeenCalled()
    expect(input.getAxis()).toEqual({ x: 0, y: 0 })
    input.dispose()
  })

  it('aksi tepi: Space/Esc/P/Enter/M memanggil callback sekali (repeat diabaikan)', () => {
    const target = new FakeTarget()
    const callbacks = { onPause: vi.fn(), onConfirm: vi.fn(), onMute: vi.fn(), onSpecial: vi.fn() }
    const input = new InputManager(target, callbacks)
    target.key('Space', 'keydown')
    target.key('Space', 'keydown', true)
    target.key('Escape', 'keydown')
    target.key('KeyP', 'keydown')
    target.key('Enter', 'keydown')
    target.key('KeyM', 'keydown')
    expect(callbacks.onSpecial).toHaveBeenCalledTimes(1)
    expect(callbacks.onPause).toHaveBeenCalledTimes(2)
    expect(callbacks.onConfirm).toHaveBeenCalledTimes(1)
    expect(callbacks.onMute).toHaveBeenCalledTimes(1)
    expect(target.lastPrevented).toBe(true)
    input.dispose()
  })

  it('blur membersihkan tombol tertahan', () => {
    const target = new FakeTarget()
    const input = new InputManager(target)
    target.key('KeyW', 'keydown')
    expect(input.isDown('KeyW')).toBe(true)
    target.blur()
    expect(input.getAxis()).toEqual({ x: 0, y: 0 })
    input.dispose()
  })

  it('dispose melepas listener: tidak ada callback setelah dispose', () => {
    const target = new FakeTarget()
    const callbacks = { onSpecial: vi.fn() }
    const input = new InputManager(target, callbacks)
    input.dispose()
    target.key('Space', 'keydown')
    target.key('KeyD', 'keydown')
    expect(callbacks.onSpecial).not.toHaveBeenCalled()
    expect(input.getAxis()).toEqual({ x: 0, y: 0 })
  })

  it('mode detached (target null) aman tanpa DOM', () => {
    const input = new InputManager(null)
    expect(input.getAxis()).toEqual({ x: 0, y: 0 })
    input.clear()
    input.dispose()
  })

  it('pointer drag relatif terakumulasi dan terkonsumsi sekali', () => {
    const keys = new FakeTarget()
    const pointer = new FakeTarget()
    const input = new InputManager(keys)
    input.attachPointer(pointer)
    pointer.pointer('pointerdown', 100, 100)
    pointer.pointer('pointermove', 120, 90)
    pointer.pointer('pointermove', 130, 80)
    expect(input.consumeDragDelta()).toEqual({ dx: 30, dy: -20 })
    expect(input.consumeDragDelta()).toEqual({ dx: 0, dy: 0 })
    pointer.pointer('pointerup', 130, 80)
    pointer.pointer('pointermove', 200, 200)
    expect(input.consumeDragDelta()).toEqual({ dx: 0, dy: 0 })
    input.dispose()
  })

  it('detachPointer menghentikan akumulasi drag', () => {
    const input = new InputManager(new FakeTarget())
    const pointer = new FakeTarget()
    input.attachPointer(pointer)
    pointer.pointer('pointerdown', 0, 0)
    input.detachPointer()
    pointer.pointer('pointermove', 50, 50)
    expect(input.consumeDragDelta()).toEqual({ dx: 0, dy: 0 })
    input.dispose()
  })
})
