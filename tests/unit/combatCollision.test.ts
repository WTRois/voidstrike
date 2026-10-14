import { describe, expect, it, vi } from 'vitest'

import { ENEMY } from '../../game/config/gameBalance'
import { Enemy } from '../../game/entities/Enemy'
import { PlayerShip } from '../../game/entities/PlayerShip'
import { ProjectilePool } from '../../game/entities/Projectile'
import { CollisionSystem, sphereHit } from '../../game/systems/CollisionSystem'
import { CombatSystem } from '../../game/systems/CombatSystem'

describe('sphereHit', () => {
  it('mendeteksi tumpang tindih dan meleset 3D dengan benar', () => {
    expect(sphereHit(0, 0, 0, 1, 1.5, 0, 0, 1)).toBe(true)
    expect(sphereHit(0, 0, 0, 1, 3, 0, 0, 1)).toBe(false)
    expect(sphereHit(0, 0, 0, 1, 1, 1, 1, 1)).toBe(true)
    expect(sphereHit(0, 0, 0, 1, 0, 0, 2.5, 1)).toBe(false)
  })
})

describe('CombatSystem', () => {
  it('menembak segera pada tick pertama lalu mengikuti cooldown', () => {
    const combat = new CombatSystem()
    const fire = vi.fn()
    combat.update(0.01, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire).toHaveBeenCalledTimes(1)
    combat.update(0.1, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire).toHaveBeenCalledTimes(1)
    combat.update(0.12, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire).toHaveBeenCalledTimes(2)
  })

  it('berhenti menembak dan mereset cooldown saat firing false (pause)', () => {
    const combat = new CombatSystem()
    const fire = vi.fn()
    combat.update(0.2, true, { x: 0, y: 0, z: -1.6, fire })
    combat.update(10, false, { x: 0, y: 0, z: -1.6, fire })
    const calls = fire.mock.calls.length
    combat.update(0.01, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire.mock.calls.length).toBe(calls + 1)
  })

  it('reset mengembalikan tembakan segera', () => {
    const combat = new CombatSystem()
    const fire = vi.fn()
    combat.update(0.01, true, { x: 0, y: 0, z: -1.6, fire })
    combat.reset()
    combat.update(0.01, true, { x: 0, y: 0, z: -1.6, fire })
    expect(fire).toHaveBeenCalledTimes(2)
  })
})

describe('CollisionSystem', () => {
  it('proyektil menghancurkan scout dan menyelesaikan satu hit', () => {
    const collisions = new CollisionSystem()
    const pool = new ProjectilePool(4)
    const enemy = new Enemy()
    enemy.spawn(0, 0, -10, 'scout')
    enemy.hp = 1
    pool.fire({ x: 0, y: 0, z: -10, velocityZ: -10, damage: 1 })
    const onKill = vi.fn()
    collisions.resolveProjectiles(pool.items, [enemy], onKill)
    expect(enemy.active).toBe(false)
    expect(onKill).toHaveBeenCalledTimes(1)
    expect(pool.activeCount).toBe(0)
  })

  it('proyektil nonaktif setelah hit walau musuh selamat (HP 2)', () => {
    const collisions = new CollisionSystem()
    const pool = new ProjectilePool(4)
    const enemy = new Enemy()
    enemy.spawn(0, 0, -10, 'scout')
    expect(enemy.hp).toBe(ENEMY.scout.hp)
    pool.fire({ x: 0, y: 0, z: -10, velocityZ: -10, damage: 1 })
    const onKill = vi.fn()
    collisions.resolveProjectiles(pool.items, [enemy], onKill)
    expect(enemy.active).toBe(true)
    expect(enemy.hp).toBe(ENEMY.scout.hp - 1)
    expect(pool.activeCount).toBe(0)
    expect(onKill).not.toHaveBeenCalled()
  })

  it('entity nonaktif dan proyektil meleset diabaikan', () => {
    const collisions = new CollisionSystem()
    const pool = new ProjectilePool(4)
    const enemy = new Enemy()
    pool.fire({ x: 50, y: 50, z: -10, velocityZ: -10, damage: 1 })
    const onKill = vi.fn()
    collisions.resolveProjectiles(pool.items, [enemy], onKill)
    expect(onKill).not.toHaveBeenCalled()
    expect(pool.activeCount).toBe(1)
  })

  it('kedalaman memisahkan: hit XY sama tapi Z jauh = meleset', () => {
    const collisions = new CollisionSystem()
    const pool = new ProjectilePool(4)
    const enemy = new Enemy()
    enemy.spawn(0, 0, -10, 'scout')
    pool.fire({ x: 0, y: 0, z: 0, velocityZ: -10, damage: 1 })
    const onKill = vi.fn()
    collisions.resolveProjectiles(pool.items, [enemy], onKill)
    expect(onKill).not.toHaveBeenCalled()
    expect(pool.activeCount).toBe(1)
  })

  it('kontak pemain menonaktifkan musuh dan memanggil callback sekali', () => {
    const collisions = new CollisionSystem()
    const player = new PlayerShip()
    player.reset(0, 0)
    const enemy = new Enemy()
    enemy.spawn(0, 0, 0, 'scout')
    const onContact = vi.fn()
    collisions.resolvePlayerContact(player, [enemy], onContact)
    expect(enemy.active).toBe(false)
    expect(onContact).toHaveBeenCalledTimes(1)
  })
})
