export type EventListener<T> = (payload: T) => void

/**
 * Emitter sinkron minimal untuk event semantik engine
 * (healthChanged, bossSpawned, … — PRD §13.1, dipakai penuh Tahap 3+).
 */
export class EventEmitter<T> {
  private readonly listeners = new Set<EventListener<T>>()

  subscribe(listener: EventListener<T>): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  emit(payload: T): void {
    for (const listener of [...this.listeners]) {
      listener(payload)
    }
  }

  clear(): void {
    this.listeners.clear()
  }

  get size(): number {
    return this.listeners.size
  }
}
