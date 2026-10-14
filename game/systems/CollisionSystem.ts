import type { Enemy } from '../entities/Enemy'
import type { EnemyProjectile } from '../entities/EnemyProjectile'
import type { Pickup, PickupKind } from '../entities/Pickup'
import type { PlayerShip } from '../entities/PlayerShip'

/** Sumber damage apa pun yang bisa mengenai musuh (peluru, misil). */
export interface DamageDealer {
  x: number
  y: number
  radius: number
  active: boolean
  damage: number
  deactivate: () => void
}

/** Hitbox lingkaran 2D pada bidang XY; visual terpisah dari collision (PRD §11.5). */
export function circleHit(
  ax: number,
  ay: number,
  aRadius: number,
  bx: number,
  by: number,
  bRadius: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const range = aRadius + bRadius
  return dx * dx + dy * dy <= range * range
}

/**
 * Collision arcade MVP (PRD §11.5): entity nonaktif / di luar layar
 * tidak dihitung; satu proyektil menyelesaikan satu hit.
 */
export class CollisionSystem {
  resolveProjectiles(
    dealers: DamageDealer[],
    enemies: Enemy[],
    onKill: (enemy: Enemy, dealer: DamageDealer) => void,
  ): void {
    for (const dealer of dealers) {
      if (!dealer.active) {
        continue
      }
      for (const enemy of enemies) {
        if (!enemy.active) {
          continue
        }
        if (circleHit(dealer.x, dealer.y, dealer.radius, enemy.x, enemy.y, enemy.radius)) {
          dealer.deactivate()
          if (enemy.damage(dealer.damage)) {
            onKill(enemy, dealer)
          }
          break
        }
      }
    }
  }

  resolveEnemyShots(
    shots: EnemyProjectile[],
    player: PlayerShip,
    onHit: (damage: number) => void,
  ): void {
    for (const shot of shots) {
      if (!shot.active) {
        continue
      }
      if (circleHit(shot.x, shot.y, shot.radius, player.x, player.y, player.radius)) {
        shot.deactivate()
        onHit(shot.damage)
      }
    }
  }

  resolvePickups(
    pickups: Pickup[],
    player: PlayerShip,
    onCollect: (kind: PickupKind) => void,
  ): void {
    for (const pickup of pickups) {
      if (!pickup.active) {
        continue
      }
      if (circleHit(pickup.x, pickup.y, pickup.radius, player.x, player.y, player.radius)) {
        pickup.deactivate()
        onCollect(pickup.kind)
      }
    }
  }

  resolvePlayerContact(
    player: PlayerShip,
    enemies: Enemy[],
    onContact: (enemy: Enemy) => void,
  ): void {
    for (const enemy of enemies) {
      if (!enemy.active) {
        continue
      }
      if (circleHit(player.x, player.y, player.radius, enemy.x, enemy.y, enemy.radius)) {
        enemy.deactivate()
        onContact(enemy)
      }
    }
  }
}
