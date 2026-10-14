import { describe, expect, it } from 'vitest'

import { PRIMARY } from '../../game/config/gameBalance'
import { Enemy } from '../../game/entities/Enemy'
import { ProjectilePool } from '../../game/entities/Projectile'

describe('ProjectilePool', () => {
  it('fire mengaktifkan proyektil dari pool', () => {
    const pool = new ProjectilePool(4)
    const item = pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -10, damage: 1 })
    expect(item).not.toBeNull()
    expect(pool.activeCount).toBe(1)
  })

  it('mengembalikan null saat pool penuh (cap eksplisit)', () => {
    const pool = new ProjectilePool(2)
    pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -10, damage: 1 })
    pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -10, damage: 1 })
    expect(pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -10, damage: 1 })).toBeNull()
  })

  it('bergerak maju −Z dan dibuang melewati killZ', () => {
    const pool = new ProjectilePool(2)
    const item = pool.fire({ x: 0, y: 1, z: -1.6, velocityZ: -10, damage: 1 })
    if (item === null) {
      throw new Error('pool harus punya slot kosong')
    }
    item.update(0.5)
    expect(item.z).toBeCloseTo(-6.6, 10)
    expect(item.y).toBe(1)
    item.update(10)
    expect(item.active).toBe(false)
    expect(pool.activeCount).toBe(0)
  })

  it('lifetime kedaluwarsa menonaktifkan proyektil', () => {
    const pool = new ProjectilePool(2)
    const item = pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -0.1, damage: 1 })
    if (item === null) {
      throw new Error('pool harus punya slot kosong')
    }
    item.update(PRIMARY.lifetimeSeconds + 1)
    expect(item.active).toBe(false)
  })

  it('clear menonaktifkan semua (dipakai restart sesi)', () => {
    const pool = new ProjectilePool(4)
    pool.fire({ x: 0, y: 0, z: -1.6, velocityZ: -10, damage: 1 })
    pool.fire({ x: 1, y: 0, z: -1.6, velocityZ: -10, damage: 1 })
    pool.clear()
    expect(pool.activeCount).toBe(0)
  })
})

describe('Enemy (scout)', () => {
  it('spawn mengatur HP penuh dan aktif', () => {
    const enemy = new Enemy()
    enemy.spawn(5, 2, -20, 'scout')
    expect(enemy.active).toBe(true)
    expect(enemy.x).toBe(5)
    expect(enemy.hp).toBeGreaterThan(0)
  })

  it('mendekat ke kamera (+Z) sesuai speed', () => {
    const enemy = new Enemy()
    enemy.spawn(5, 0, -20, 'scout')
    enemy.update(1, 0)
    expect(enemy.z).toBeCloseTo(-20 + enemy.speed, 10)
    expect(enemy.x).toBe(5)
  })

  it('damage mengurangi HP dan menghancurkan di nol', () => {
    const enemy = new Enemy()
    enemy.spawn(5, 0, -20, 'scout')
    expect(enemy.damage(1)).toBe(false)
    expect(enemy.active).toBe(true)
    expect(enemy.damage(99)).toBe(true)
    expect(enemy.active).toBe(false)
    expect(enemy.damage(1)).toBe(false)
  })
})
