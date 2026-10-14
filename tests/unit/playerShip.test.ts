import { describe, expect, it } from 'vitest'

import { PLAYER } from '../../game/config/gameBalance'
import { PlayerShip } from '../../game/entities/PlayerShip'
import type { WorldBounds } from '../../game/types/game'

const ZONE: WorldBounds = { minX: -8, maxX: -2, minY: -4, maxY: 4 }

describe('PlayerShip', () => {
  it('bergerak sesuai axis * speed * delta', () => {
    const ship = new PlayerShip()
    ship.reset(-5, 0)
    ship.update(0.2, 1, 0, ZONE)
    expect(ship.x).toBeCloseTo(-5 + PLAYER.speed * 0.2, 10)
    expect(ship.y).toBe(0)
  })

  it('dijepit ke zona pemain, tidak keluar arena', () => {
    const ship = new PlayerShip()
    ship.reset(-2, 4)
    ship.update(10, 1, 1, ZONE)
    expect(ship.x).toBe(ZONE.maxX)
    expect(ship.y).toBe(ZONE.maxY)
    ship.reset(-8, -4)
    ship.update(10, -1, -1, ZONE)
    expect(ship.x).toBe(ZONE.minX)
    expect(ship.y).toBe(ZONE.minY)
  })

  it('gerak diagonal dinormalisasi agar konsisten', () => {
    const ship = new PlayerShip()
    ship.reset(-5, 0)
    ship.update(0.5, 1, 1, ZONE)
    const step = (PLAYER.speed * 0.5) / Math.sqrt(2)
    expect(ship.x).toBeCloseTo(-5 + step, 10)
    expect(ship.y).toBeCloseTo(step, 10)
  })

  it('delta non-positif tidak mengubah posisi', () => {
    const ship = new PlayerShip()
    ship.reset(-5, 1)
    ship.update(0, 1, 1, ZONE)
    ship.update(-1, 1, 1, ZONE)
    expect(ship.x).toBe(-5)
    expect(ship.y).toBe(1)
  })
})
