import type { Enemy } from '../entities/Enemy'
import type { EnemyProjectile } from '../entities/EnemyProjectile'
import type { Pickup, PickupKind } from '../entities/Pickup'
import type { PlayerShip } from '../entities/PlayerShip'

/** Sumber damage apa pun yang bisa mengenai musuh (peluru, misil). */
export interface DamageDealer {
  x: number
  y: number
  z: number
  radius: number
  active: boolean
  damage: number
  deactivate: () => void
}

/** Hitbox bola 3D; visual terpisah dari collision (PRD §11.5). */
export function sphereHit(
  ax: number,
  ay: number,
  az: number,
  aRadius: number,
  bx: number,
  by: number,
  bz: number,
  bRadius: number,
): boolean {
  const dx = ax - bx
  const dy = ay - by
  const dz = az - bz
  const range = aRadius + bRadius
  return dx * dx + dy * dy + dz * dz <= range * range
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
        if (
          sphereHit(
            dealer.x,
            dealer.y,
            dealer.z,
            dealer.radius,
            enemy.x,
            enemy.y,
            enemy.z,
            enemy.radius,
          )
        ) {
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
      if (
        sphereHit(shot.x, shot.y, shot.z, shot.radius, player.x, player.y, player.z, player.radius)
      ) {
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
      if (
        sphereHit(
          pickup.x,
          pickup.y,
          pickup.z,
          pickup.radius,
          player.x,
          player.y,
          player.z,
          player.radius,
        )
      ) {
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
      if (
        sphereHit(
          player.x,
          player.y,
          player.z,
          player.radius,
          enemy.x,
          enemy.y,
          enemy.z,
          enemy.radius,
        )
      ) {
        enemy.deactivate()
        onContact(enemy)
      }
    }
  }
}
