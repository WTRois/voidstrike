import { describe, expect, it } from 'vitest'

import { CHASE, ENEMY, HAZARD, SPECIAL } from '../../game/config/gameBalance'
import { Enemy } from '../../game/entities/Enemy'
import { EnemyProjectilePool } from '../../game/entities/EnemyProjectile'
import { MissilePool } from '../../game/entities/Missile'
import { PickupPool } from '../../game/entities/Pickup'

describe('Enemy kinds chase-cam', () => {
  it('interceptor weave di sekitar baseX/baseY sambil mendekat', () => {
    const enemy = new Enemy()
    enemy.spawn(5, 0, -10, 'interceptor')
    enemy.update(0.5, 0)
    const y0 = enemy.y
    enemy.update(0.5, 1)
    expect(enemy.y).not.toBe(y0)
    expect(Math.abs(enemy.y)).toBeLessThanOrEqual(ENEMY.interceptor.weaveAmplitude + 0.001)
    expect(enemy.z).toBeGreaterThan(-10)
  })

  it('heavy lambat dengan HP dan radius lebih besar', () => {
    const heavy = new Enemy()
    heavy.spawn(5, 0, -10, 'heavy')
    const scout = new Enemy()
    scout.spawn(5, 0, -10, 'scout')
    expect(heavy.hp).toBe(ENEMY.heavy.hp)
    expect(heavy.speed).toBeLessThan(scout.speed)
    expect(heavy.radius).toBeGreaterThan(scout.radius)
  })

  it('asteroid dan mine punya HP dan tidak menembak', () => {
    const asteroid = new Enemy()
    asteroid.spawn(5, 0, -10, 'asteroid')
    const mine = new Enemy()
    mine.spawn(5, 0, -10, 'mine')
    expect(asteroid.hp).toBe(HAZARD.asteroid.hp)
    expect(mine.hp).toBe(HAZARD.mine.hp)
    expect(asteroid.canShoot).toBe(false)
    expect(mine.canShoot).toBe(false)
    expect(asteroid.updateFire(99)).toBe(false)
  })

  it('interceptor/heavy siap menembak setelah interval', () => {
    const enemy = new Enemy()
    enemy.spawn(5, 0, -10, 'interceptor')
    expect(enemy.updateFire(0.1)).toBe(false)
    expect(enemy.updateFire(99)).toBe(true)
    expect(enemy.updateFire(0.1)).toBe(false)
  })
})

describe('EnemyProjectilePool 3D', () => {
  it('aimed shot bergerak menuju arah yang dihitung saat ditembak', () => {
    const pool = new EnemyProjectilePool(4)
    const shot = pool.fire({
      x: 0,
      y: 0,
      z: -10,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 7,
      damage: 8,
    })
    if (shot === null) {
      throw new Error('pool harus punya slot kosong')
    }
    shot.update(1, { minX: -9, maxX: 9, minY: -5, maxY: 5 })
    expect(shot.z).toBeCloseTo(-3, 10)
    expect(pool.activeCount).toBe(1)
    shot.update(99, { minX: -9, maxX: 9, minY: -5, maxY: 5 })
    expect(shot.active).toBe(false)
  })

  it('dibuang setelah melewati kamera (cullZ)', () => {
    const pool = new EnemyProjectilePool(4)
    const shot = pool.fire({
      x: 0,
      y: 0,
      z: CHASE.cullZ - 0.5,
      velocityX: 0,
      velocityY: 0,
      velocityZ: 5,
      damage: 8,
    })
    if (shot === null) {
      throw new Error('pool harus punya slot kosong')
    }
    shot.update(1, { minX: -9, maxX: 9, minY: -5, maxY: 5 })
    expect(shot.active).toBe(false)
  })
})

describe('MissilePool homing', () => {
  it('berbelok menuju target dalam batas turn rate', () => {
    const pool = new MissilePool(4)
    const missile = pool.launch(0, 0, 0, 14, 0, -14)
    if (missile === null) {
      throw new Error('pool harus punya slot kosong')
    }
    missile.update(0.5, { x: 10, y: 10 }, { minX: -99, maxX: 99, minY: -99, maxY: 99 })
    expect(missile.velocityY).toBeGreaterThan(0)
    expect(missile.velocityX).toBeLessThan(14)
    const speed = Math.hypot(missile.velocityX, missile.velocityY)
    expect(speed).toBeCloseTo(14, 5)
  })

  it('terbang lurus tanpa target, maju −Z', () => {
    const pool = new MissilePool(4)
    const missile = pool.launch(0, 0, 0, 14, 1.6, -SPECIAL.missileSpeed)
    if (missile === null) {
      throw new Error('pool harus punya slot kosong')
    }
    missile.update(1, null, { minX: -99, maxX: 99, minY: -99, maxY: 99 })
    expect(missile.x).toBeCloseTo(14, 10)
    expect(missile.y).toBeCloseTo(1.6, 10)
    expect(missile.z).toBeCloseTo(-SPECIAL.missileSpeed, 10)
  })
})

describe('PickupPool', () => {
  it('melayang ke kamera dan kedaluwarsa sesuai lifetime', () => {
    const pool = new PickupPool(4)
    const pickup = pool.spawn(5, 0, -5, 'hull')
    if (pickup === null) {
      throw new Error('pool harus punya slot kosong')
    }
    pickup.update(1)
    expect(pickup.z).toBeGreaterThan(-5)
    expect(pickup.active).toBe(true)
    pickup.update(99)
    expect(pickup.active).toBe(false)
    expect(pickup.kind).toBe('hull')
  })
})
