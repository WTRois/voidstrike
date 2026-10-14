/** Sumbu gerak netral perangkat: -1 … 1 per sumbu (PRD §13.2). */
export interface InputAxis {
  x: number
  y: number
}

export interface InputCallbacks {
  onPause?: () => void
  onConfirm?: () => void
  onMute?: () => void
  onSpecial?: () => void
}

/** Target event struktural agar window asli maupun fake test bisa dipakai. */
export interface InputEventTarget {
  addEventListener(type: string, listener: EventListener, options?: AddEventListenerOptions): void
  removeEventListener(type: string, listener: EventListener, options?: EventListenerOptions): void
  dispatchEvent?(event: Event): boolean
}

interface KeyEventLike {
  code: string
  repeat?: boolean
  preventDefault?: () => void
}

interface PointerEventLike {
  clientX: number
  clientY: number
  pointerId?: number
  isPrimary?: boolean
  button?: number
}

const AXIS_KEYS = new Set([
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
])

const HANDLED_KEYS = new Set([...AXIS_KEYS, 'Space', 'Escape', 'KeyP', 'Enter', 'KeyM'])

/**
 * Keyboard → input netral (PRD §7.1, §13.2). Tidak menyentuh DOM/HUD,
 * membersihkan input saat blur/hidden, melepas listener saat dispose.
 * Pointer/touch drag masuk Tahap 5; arsitektur axis/action sudah netral.
 */
export class InputManager {
  private readonly target: InputEventTarget | null
  private readonly callbacks: InputCallbacks
  private readonly held = new Set<string>()
  private pointerElement: InputEventTarget | null = null
  private dragging = false
  private lastPointerX = 0
  private lastPointerY = 0
  private dragDeltaX = 0
  private dragDeltaY = 0
  private disposed = false

  constructor(target: InputEventTarget | null, callbacks: InputCallbacks = {}) {
    this.target = target
    this.callbacks = callbacks
    if (target !== null) {
      target.addEventListener('keydown', this.handleKeyDown)
      target.addEventListener('keyup', this.handleKeyUp)
      target.addEventListener('blur', this.handleBlur)
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility)
    }
  }

  getAxis(): InputAxis {
    let x = 0
    let y = 0
    if (this.held.has('KeyA') || this.held.has('ArrowLeft')) {
      x -= 1
    }
    if (this.held.has('KeyD') || this.held.has('ArrowRight')) {
      x += 1
    }
    if (this.held.has('KeyW') || this.held.has('ArrowUp')) {
      y += 1
    }
    if (this.held.has('KeyS') || this.held.has('ArrowDown')) {
      y -= 1
    }
    return { x, y }
  }

  isDown(code: string): boolean {
    return this.held.has(code)
  }

  clear(): void {
    this.held.clear()
  }

  /**
   * Drag relatif (Pointer Events, mouse/sentuh/pen) pada elemen canvas.
   * Delta piksel dikonsumsi engine dan dipetakan ke world.
   */
  attachPointer(element: InputEventTarget | null): void {
    this.detachPointer()
    this.pointerElement = element
    if (element !== null && !this.disposed) {
      element.addEventListener('pointerdown', this.handlePointerDown)
      element.addEventListener('pointermove', this.handlePointerMove)
      element.addEventListener('pointerup', this.handlePointerUp)
      element.addEventListener('pointercancel', this.handlePointerUp)
    }
  }

  detachPointer(): void {
    this.pointerElement?.removeEventListener('pointerdown', this.handlePointerDown)
    this.pointerElement?.removeEventListener('pointermove', this.handlePointerMove)
    this.pointerElement?.removeEventListener('pointerup', this.handlePointerUp)
    this.pointerElement?.removeEventListener('pointercancel', this.handlePointerUp)
    this.pointerElement = null
    this.dragging = false
    this.dragDeltaX = 0
    this.dragDeltaY = 0
  }

  consumeDragDelta(): { dx: number; dy: number } {
    const delta = { dx: this.dragDeltaX, dy: this.dragDeltaY }
    this.dragDeltaX = 0
    this.dragDeltaY = 0
    return delta
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.target?.removeEventListener('keydown', this.handleKeyDown)
    this.target?.removeEventListener('keyup', this.handleKeyUp)
    this.target?.removeEventListener('blur', this.handleBlur)
    this.detachPointer()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility)
    }
    this.held.clear()
  }

  private readonly handleKeyDown = (event: Event): void => {
    if (this.disposed) {
      return
    }
    const key = event as unknown as KeyEventLike
    if (!HANDLED_KEYS.has(key.code)) {
      return
    }
    key.preventDefault?.()
    if (key.repeat === true) {
      return
    }
    if (AXIS_KEYS.has(key.code)) {
      this.held.add(key.code)
      return
    }
    switch (key.code) {
      case 'Space':
        this.callbacks.onSpecial?.()
        break
      case 'Escape':
      case 'KeyP':
        this.callbacks.onPause?.()
        break
      case 'Enter':
        this.callbacks.onConfirm?.()
        break
      case 'KeyM':
        this.callbacks.onMute?.()
        break
    }
  }

  private readonly handleKeyUp = (event: Event): void => {
    const key = event as unknown as KeyEventLike
    this.held.delete(key.code)
  }

  private readonly handleBlur = (): void => {
    this.clear()
  }

  private readonly handleVisibility = (): void => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.clear()
    }
  }

  private readonly handlePointerDown = (event: Event): void => {
    if (this.disposed) {
      return
    }
    const pointer = event as unknown as PointerEventLike
    if (pointer.isPrimary === false || (pointer.button !== undefined && pointer.button !== 0)) {
      return
    }
    this.dragging = true
    this.lastPointerX = pointer.clientX
    this.lastPointerY = pointer.clientY
  }

  private readonly handlePointerMove = (event: Event): void => {
    if (this.disposed || !this.dragging) {
      return
    }
    const pointer = event as unknown as PointerEventLike
    this.dragDeltaX += pointer.clientX - this.lastPointerX
    this.dragDeltaY += pointer.clientY - this.lastPointerY
    this.lastPointerX = pointer.clientX
    this.lastPointerY = pointer.clientY
  }

  private readonly handlePointerUp = (): void => {
    this.dragging = false
  }
}
