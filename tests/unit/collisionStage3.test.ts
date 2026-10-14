import { describe, expect, it, vi } from 'vitest'

import { Enemy } from '../../game/entities/Enemy'
import { EnemyProjectilePool } from '../../game/entities/EnemyProjectile'
import { PickupPool } from '../../game/entities/Pickup'
import { PlayerShip } from '../../game/entities/PlayerShip'
import { CollisionSystem } from '../../game/systems/CollisionSystem'

describe('CollisionSystem Tahap 3', () => {
  it('peluru musuh mengenai pemain sekali lalu nonaktif', () => {
    const collisions = new CollisionSystem()
    const pool = new EnemyProjectilePool(4)
    const player = new PlayerShip()
    player.reset(0, 0)
    pool.fire({ x: 0, y: 0, velocityX: -5, velocityY: 0, damage: 8 })
    const onHit = vi.fn()
    collisions.resolveEnemyShots(pool.items, player, onHit)
    expect(onHit).toHaveBeenCalledWith(8)
    expect(pool.activeCount).toBe(0)
    collisions.resolveEnemyShots(pool.items, player, onHit)
    expect(onHit).toHaveBeenCalledTimes(1)
  })

  it('peluru musuh meleset tidak memicu hit', () => {
    const collisions = new CollisionSystem()
    const pool = new EnemyProjectilePool(4)
    const player = new PlayerShip()
    player.reset(0, 0)
    pool.fire({ x: 0, y: 5, velocityX: -5, velocityY: 0, damage: 8 })
    const onHit = vi.fn()
    collisions.resolveEnemyShots(pool.items, player, onHit)
    expect(onHit).not.toHaveBeenCalled()
  })

  it('pickup diambil sekali dengan jenis yang benar', () => {
    const collisions = new CollisionSystem()
    const pool = new PickupPool(4)
    const player = new PlayerShip()
    player.reset(0, 0)
    pool.spawn(0, 0, 'shield')
    const onCollect = vi.fn()
    collisions.resolvePickups(pool.items, player, onCollect)
    expect(onCollect).toHaveBeenCalledWith('shield')
    expect(pool.activeCount).toBe(0)
    collisions.resolvePickups(pool.items, player, onCollect)
    expect(onCollect).toHaveBeenCalledTimes(1)
  })

  it('kontak dengan hazard memakai enemy yang sesuai jenisnya', () => {
    const collisions = new CollisionSystem()
    const player = new PlayerShip()
    player.reset(0, 0)
    const mine = new Enemy()
    mine.spawn(0, 0, 'mine')
    const onContact = vi.fn()
    collisions.resolvePlayerContact(player, [mine], onContact)
    expect(mine.active).toBe(false)
    expect(onContact).toHaveBeenCalledTimes(1)
  })
})
