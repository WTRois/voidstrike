import * as THREE from 'three'

import {
  BOSS,
  CHASE,
  ENTITY_MODEL,
  FX,
  PICKUP,
  PLAYER,
  POOLS,
  PRIMARY,
  RENDER,
  SPECIAL,
} from '../config/gameBalance'
import type { EngineStatus, GameSnapshot, QualityPreset, WorldBounds } from '../types/game'
import { createPlaceholderPlayerShip } from '../assets/createPlaceholderPlayerShip'
import { loadModel, normalizeModel } from '../assets/loadEntityModels'
import { loadPlayerShipModel } from '../assets/loadPlayerShip'
import {
  createEnemyProjectileMesh,
  createEnemySlotMesh,
  createMissileMesh,
  createPickupSlotMesh,
  createPlaceholderBoss,
  createPlayerProjectileMesh,
} from '../assets/createPlaceholderEntities'
import { AudioManager, type SfxSampleUrls } from '../effects/AudioManager'
import { HitRingPool } from '../effects/HitRing'
import { MuzzleFlashPool } from '../effects/MuzzleFlash'
import { Starfield } from '../effects/Starfield'
import { Boss } from '../entities/Boss'
import { Enemy, type EnemyKind } from '../entities/Enemy'
import { EnemyProjectilePool } from '../entities/EnemyProjectile'
import { MissilePool } from '../entities/Missile'
import { PickupPool, type PickupKind } from '../entities/Pickup'
import { PlayerShip } from '../entities/PlayerShip'
import { ProjectilePool } from '../entities/Projectile'
import { InputManager } from '../input/InputManager'
import { computePlayerZone } from '../utils/bounds'
import { disposeObject3D } from '../utils/dispose'
import { CameraController } from './CameraController'
import { EventEmitter } from './EventEmitter'
import { GameLoop } from './GameLoop'
import type { GameState } from './GameStateMachine'
import { GameStateMachine } from './GameStateMachine'
import { createLights, createScene } from './SceneFactory'
import { CollisionSystem, sphereHit, type DamageDealer } from '../systems/CollisionSystem'
import { CombatSystem } from '../systems/CombatSystem'
import { ScoreSystem } from '../systems/ScoreSystem'
import { WaveSystem } from '../systems/WaveSystem'

/** Gagal inisialisasi WebGL — selalu bawa pesan ramah pengguna (PRD §15.3). */
export class EngineInitError extends Error {
  constructor(
    message = 'WebGL tidak tersedia di browser ini. Gunakan browser modern dengan akselerasi GPU untuk bermain VOIDSTRIKE: STARFALL.',
  ) {
    super(message)
    this.name = 'EngineInitError'
  }
}

export interface GameEngineOptions {
  quality?: QualityPreset
  /** Wave awal (hook playtesting; default 1). */
  startWave?: number
  muted?: boolean
  /** Camera shake default nonaktif (PRD §4.2, §15.4). */
  shake?: boolean
  /** URL model GLB pemain (Vite ?url dari app/assets); kosong = placeholder. */
  shipModelUrl?: string
  /** URL model GLB musuh/hazard per kind; kind tanpa URL = placeholder. */
  entityModelUrls?: Partial<Record<'scout' | 'interceptor' | 'heavy' | 'asteroid', string>>
  /** URL model GLB boss; kosong = placeholder. */
  bossModelUrl?: string
  /** URL sampel SFX; kosong = synth murni. */
  sfx?: SfxSampleUrls
}

export type EngineStatusListener = (status: EngineStatus) => void
export type GameStateListener = (state: GameState) => void

const DEATH_DELAY_SECONDS = 0.8
const RING_SHIELD = 0x46e6ff
const RING_HULL = 0xff6b4d
const RING_KILL = 0xffb03d

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(pointer: coarse)').matches
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function resolveDprCap(quality: QualityPreset): number {
  if (quality === 'low') {
    return 1
  }
  if (quality === 'high') {
    return RENDER.maxDprDesktop
  }
  return isCoarsePointer() ? RENDER.maxDprMobile : RENDER.maxDprDesktop
}

function randomIn(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function rollPickupKind(): PickupKind {
  const roll = Math.random()
  if (roll < 0.4) {
    return 'hull'
  }
  if (roll < 0.8) {
    return 'shield'
  }
  return 'weapon'
}

/**
 * Orkestrasi Tahap 5: + audio synth, muzzle flash, camera shake,
 * pointer drag, dan auto-pause saat tab hidden. Full HUD di Vue.
 */
export class GameEngine {
  private readonly canvas: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly cameraController: CameraController
  private readonly starfield: Starfield
  private readonly stateMachine = new GameStateMachine()
  private readonly input: InputManager
  private readonly audio: AudioManager
  private readonly player = new PlayerShip()
  private readonly ship: THREE.Group
  private shipModelLoaded = false
  private readonly loadedModels: string[] = []
  private lastShipX = 0
  private lastShipY = 0
  private readonly projectiles = new ProjectilePool()
  private readonly projectileMeshes: THREE.Mesh[] = []
  private readonly muzzle = new MuzzleFlashPool()
  private readonly missiles = new MissilePool()
  private readonly missileMeshes: THREE.Mesh[] = []
  private readonly enemyShots = new EnemyProjectilePool()
  private readonly enemyShotMeshes: THREE.Mesh[] = []
  private readonly enemies: Enemy[] = []
  private readonly enemyMeshes: THREE.Group[] = []
  private readonly boss = new Boss()
  private readonly bossMesh: THREE.Group
  private readonly pickups = new PickupPool()
  private readonly pickupMeshes: THREE.Group[] = []
  private readonly rings = new HitRingPool()
  private readonly combat = new CombatSystem()
  private readonly collisions = new CollisionSystem()
  private readonly waves = new WaveSystem()
  private readonly score = new ScoreSystem()
  private readonly loop: GameLoop
  private readonly statusEvents = new EventEmitter<EngineStatus>()
  private readonly resizeObserver: ResizeObserver | null = null
  private readonly reduceMotion: boolean
  private readonly startWave: number
  private readonly directorTimers: Record<EnemyKind, number> = {
    scout: 0,
    interceptor: 0,
    heavy: 0,
    asteroid: 0,
    mine: 0,
  }
  private status: EngineStatus = 'initializing'
  private elapsedSeconds = 0
  private dying = false
  private deathTimer = 0
  private shakeTime = 0
  private shakeEnabled: boolean
  private disposed = false

  constructor(canvas: HTMLCanvasElement, options: GameEngineOptions = {}) {
    this.canvas = canvas
    const quality = options.quality ?? 'auto'
    this.startWave = options.startWave ?? 1
    this.shakeEnabled = options.shake ?? false

    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: quality !== 'low',
        powerPreference: 'high-performance',
      })
    } catch (error) {
      console.warn('[voidstrike] WebGLRenderer creation failed.', error)
    }
    if (renderer === null) {
      throw new EngineInitError()
    }
    this.renderer = renderer
    const deviceDpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
    this.renderer.setPixelRatio(Math.min(deviceDpr, resolveDprCap(quality)))
    // Fully-3D Tahap 7: tone mapping sinematik untuk material PBR GLB.
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.1
    this.audio = new AudioManager(options.sfx ?? {})
    this.audio.setMuted(options.muted ?? false)

    this.scene = createScene()
    createLights(this.scene)

    this.cameraController = new CameraController()
    this.resizeToElement()

    const bounds = this.cameraController.getBounds()
    this.starfield = new Starfield(bounds)
    this.scene.add(this.starfield.group)
    this.scene.add(this.starfield.backdrop)
    this.scene.add(this.rings.group)
    this.scene.add(this.muzzle.group)

    // Wrapper visual: placeholder + (async) model GLB; posisi/hitbox tetap milik entity.
    this.ship = new THREE.Group()
    this.ship.name = 'player-ship'
    const placeholder = createPlaceholderPlayerShip()
    placeholder.name = 'placeholder-ship'
    this.ship.add(placeholder)
    const zone = computePlayerZone(bounds)
    this.player.reset(PLAYER.startX, PLAYER.startY)
    this.player.clampToZone(zone)
    this.lastShipX = this.player.x
    this.lastShipY = this.player.y
    this.cameraController.snap(this.player.x, this.player.y)
    this.ship.position.set(this.player.x, this.player.y, 0)
    this.scene.add(this.ship)
    if (options.shipModelUrl !== undefined && options.shipModelUrl !== '') {
      void this.attachShipModel(options.shipModelUrl)
    }
    if (options.entityModelUrls !== undefined) {
      void this.attachEntityModels(options.entityModelUrls)
    }
    if (options.bossModelUrl !== undefined && options.bossModelUrl !== '') {
      void this.attachBossModel(options.bossModelUrl)
    }

    for (let i = 0; i < POOLS.maxPlayerProjectiles; i += 1) {
      const mesh = createPlayerProjectileMesh()
      this.projectileMeshes.push(mesh)
      this.scene.add(mesh)
    }
    for (let i = 0; i < POOLS.maxMissiles; i += 1) {
      const mesh = createMissileMesh()
      this.missileMeshes.push(mesh)
      this.scene.add(mesh)
    }
    for (let i = 0; i < POOLS.maxEnemyProjectiles; i += 1) {
      const mesh = createEnemyProjectileMesh()
      this.enemyShotMeshes.push(mesh)
      this.scene.add(mesh)
    }
    for (let i = 0; i < POOLS.maxEnemies; i += 1) {
      this.enemies.push(new Enemy())
      const mesh = createEnemySlotMesh()
      this.enemyMeshes.push(mesh)
      this.scene.add(mesh)
    }
    this.bossMesh = createPlaceholderBoss()
    this.scene.add(this.bossMesh)
    for (let i = 0; i < POOLS.maxPickups; i += 1) {
      const mesh = createPickupSlotMesh()
      this.pickupMeshes.push(mesh)
      this.scene.add(mesh)
    }

    const target = typeof window !== 'undefined' ? window : null
    this.input = new InputManager(target, {
      onPause: () => this.togglePause(),
      onConfirm: () => this.confirm(),
      onSpecial: () => this.fireSpecial(),
      onMute: () => this.toggleMute(),
    })
    this.input.attachPointer(canvas)

    this.reduceMotion = prefersReducedMotion()
    this.loop = new GameLoop({ onTick: (dt) => this.tick(dt) })

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => this.resizeToElement())
      observer.observe(canvas.parentElement ?? canvas)
      this.resizeObserver = observer
    }
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibility)
    }

    this.stateMachine.transition('loading')
    this.stateMachine.transition('menu')
    this.setStatus('ready')
  }

  getStatus(): EngineStatus {
    return this.status
  }

  subscribeStatus(listener: EngineStatusListener): () => void {
    return this.statusEvents.subscribe(listener)
  }

  getGameState(): GameState {
    return this.stateMachine.getState()
  }

  subscribeGameState(listener: GameStateListener): () => void {
    return this.stateMachine.subscribe(listener)
  }

  /** Statistik render frame terakhir untuk profiling (PRD §15.1, §17.4). */
  getRenderStats(): { drawCalls: number; triangles: number; geometries: number; textures: number } {
    const info = this.renderer.info
    return {
      drawCalls: info.render.calls,
      triangles: info.render.triangles,
      geometries: info.memory.geometries,
      textures: info.memory.textures,
    }
  }

  getSnapshot(): GameSnapshot {
    let enemiesActive = 0
    for (const enemy of this.enemies) {
      if (enemy.active) {
        enemiesActive += 1
      }
    }
    return {
      state: this.stateMachine.getState(),
      hull: Math.round(this.player.health.hull),
      shield: Math.round(this.player.health.shield),
      maxHull: PLAYER.hullMax,
      maxShield: PLAYER.shieldMax,
      specialRemaining: this.combat.getSpecialRemaining(),
      specialCooldown: SPECIAL.cooldownSeconds,
      enemiesActive,
      shotsActive: this.enemyShots.activeCount,
      score: this.score.getScore(),
      wave: this.waves.wave,
      kills: this.score.kills,
      bossesDefeated: this.score.bosses,
      durationSeconds: Math.floor(this.elapsedSeconds),
      muted: this.audio.isMuted(),
      bossActive: this.boss.active,
      bossTelegraph: this.boss.isTelegraphing,
      bossHp: Math.max(0, Math.round(this.boss.hp)),
      bossMax: this.boss.maxHp,
      bossName: BOSS.name,
    }
  }

  /** Status pool SFX untuk smoke test (dev saja via __voidstrike). */
  getSfxState(): { shootPool: number; explosionPool: number; introLoaded: boolean } {
    return this.audio.getPoolState()
  }

  /** True bila model GLB pemain berhasil dipasang (debug/smoke Tahap 7). */
  isShipModelLoaded(): boolean {
    return this.shipModelLoaded
  }

  /** Daftar kind model GLB yang berhasil dipasang (smoke test dev). */
  getLoadedModels(): string[] {
    return [...this.loadedModels]
  }

  /** Buka kunci audio (wajib dari gesture pengguna). */
  unlockAudio(): void {
    this.audio.unlock()
  }

  toggleMute(): boolean {
    return this.audio.toggleMute()
  }

  setShakeEnabled(enabled: boolean): void {
    this.shakeEnabled = enabled
  }

  playUiClick(): void {
    this.audio.click()
  }

  /** Mulai sesi baru: reset total lalu state → playing. */
  startRun(): boolean {
    if (this.disposed || !this.stateMachine.startRun()) {
      return false
    }
    this.unlockAudio()
    this.audio.gameStart()
    this.resetRun()
    return true
  }

  /** Restart dari playing/paused/gameOver via menu (transisi tervalidasi). */
  restartRun(): boolean {
    if (this.disposed) {
      return false
    }
    const state = this.stateMachine.getState()
    if (state !== 'playing' && state !== 'paused' && state !== 'gameOver') {
      return false
    }
    this.quitToMenu()
    return this.startRun()
  }

  pause(): boolean {
    if (this.disposed || !this.stateMachine.pause()) {
      return false
    }
    this.input.clear()
    return true
  }

  resume(): boolean {
    if (this.disposed || !this.stateMachine.resume()) {
      return false
    }
    this.unlockAudio()
    this.input.clear()
    return true
  }

  quitToMenu(): boolean {
    if (this.disposed || !this.stateMachine.quitToMenu()) {
      return false
    }
    this.clearEntities()
    this.input.clear()
    return true
  }

  /** Special manual (Space / tombol HUD): false saat cooldown aktif. */
  fireSpecial(): boolean {
    if (this.disposed || this.dying || this.stateMachine.getState() !== 'playing') {
      return false
    }
    const fired = this.combat.trySpecial({
      x: this.player.x,
      y: this.player.y,
      z: CHASE.muzzleZ,
      launch: (x, y, z, velocityX, velocityY, velocityZ) => {
        this.missiles.launch(x, y, z, velocityX, velocityY, velocityZ)
      },
    })
    if (fired) {
      this.audio.special()
    }
    return fired
  }

  start(): void {
    if (!this.disposed) {
      this.loop.start()
    }
  }

  stop(): void {
    this.loop.stop()
  }

  get isRunning(): boolean {
    return this.loop.isRunning
  }

  /** Sinkronkan renderer + kamera ke ukuran elemen; jepit pemain ke zona. */
  resizeToElement(): void {
    if (this.disposed) {
      return
    }
    const element = this.canvas.parentElement ?? this.canvas
    const width = element.clientWidth
    const height = element.clientHeight
    if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
      return
    }
    this.renderer.setSize(width, height, false)
    this.cameraController.resize(width, height)
    this.player.clampToZone(computePlayerZone(this.cameraController.getBounds()))
  }

  dispose(): void {
    if (this.disposed) {
      return
    }
    this.disposed = true
    this.loop.dispose()
    this.input.dispose()
    this.audio.dispose()
    this.resizeObserver?.disconnect()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibility)
    }
    this.setStatus('disposed')
    this.statusEvents.clear()
    disposeObject3D(this.scene)
    this.scene.clear()
    this.renderer.dispose()
    this.renderer.forceContextLoss()
  }

  private readonly handleVisibility = (): void => {
    if (
      typeof document !== 'undefined' &&
      document.hidden &&
      this.stateMachine.getState() === 'playing'
    ) {
      this.pause()
    }
  }

  private resetRun(): void {
    this.clearEntities()
    const bounds = this.cameraController.getBounds()
    const zone = computePlayerZone(bounds)
    this.player.reset(PLAYER.startX, PLAYER.startY)
    this.player.clampToZone(zone)
    this.lastShipX = this.player.x
    this.lastShipY = this.player.y
    this.cameraController.snap(this.player.x, this.player.y)
    this.lastShipX = this.player.x
    this.lastShipY = this.player.y
    this.player.health.reset()
    this.combat.reset()
    this.waves.reset(this.startWave)
    this.score.reset()
    this.elapsedSeconds = 0
    this.dying = false
    this.deathTimer = 0
    this.shakeTime = 0
    for (const kind of Object.keys(this.directorTimers) as EnemyKind[]) {
      this.directorTimers[kind] = 0
    }
    if (this.waves.isBossWave()) {
      this.spawnBoss(computePlayerZone(this.cameraController.getBounds()))
    }
    this.input.clear()
  }

  private clearEntities(): void {
    this.projectiles.clear()
    this.missiles.clear()
    this.enemyShots.clear()
    this.pickups.clear()
    this.rings.clear()
    this.muzzle.clear()
    for (const enemy of this.enemies) {
      enemy.deactivate()
    }
    this.boss.deactivate()
    this.combat.reset()
    this.dying = false
    this.shakeTime = 0
    this.cameraController.setShake(0, 0)
    this.syncEntityMeshes()
  }

  private togglePause(): void {
    const state = this.stateMachine.getState()
    if (state === 'playing') {
      this.pause()
    } else if (state === 'paused') {
      this.resume()
    }
  }

  private confirm(): void {
    const state = this.stateMachine.getState()
    if (state === 'menu' || state === 'gameOver') {
      this.startRun()
    }
  }

  private tick(dtSeconds: number): void {
    if (this.disposed) {
      return
    }
    this.cameraController.follow(dtSeconds, this.player.x, this.player.y)
    this.updateShake(dtSeconds)
    // Efek destruction singkat sebelum game over (PRD §8.1).
    if (this.dying) {
      this.deathTimer -= dtSeconds
      this.rings.update(dtSeconds)
      this.renderer.render(this.scene, this.cameraController.camera)
      if (this.deathTimer <= 0) {
        this.dying = false
        this.stateMachine.endRun()
      }
      return
    }
    // Pause/menu: bekukan seluruh simulasi, render saja (PRD §17.2).
    if (this.stateMachine.getState() !== 'playing') {
      this.renderer.render(this.scene, this.cameraController.camera)
      return
    }
    this.elapsedSeconds += dtSeconds
    const bounds = this.cameraController.getBounds()
    this.starfield.update(dtSeconds, bounds, this.player.x, this.player.y)
    this.score.addSurvival(dtSeconds)

    const zone = computePlayerZone(bounds)
    const axis = this.input.getAxis()
    this.player.update(dtSeconds, axis.x, axis.y, zone)
    this.applyDragDelta(zone)
    this.player.health.update(dtSeconds)

    this.combat.update(dtSeconds, true, {
      x: this.player.x,
      y: this.player.y,
      z: CHASE.muzzleZ,
      fire: (x, y, z) => {
        this.projectiles.fire({
          x,
          y,
          z,
          velocityZ: -PRIMARY.projectileSpeed,
          damage: PRIMARY.damage,
        })
        this.muzzle.spawn(x, y, z)
        this.audio.shoot()
      },
    })
    this.combat.updateSpecial(dtSeconds)

    this.updateDirector(dtSeconds, bounds)
    this.updateEnemies(dtSeconds)
    this.updateBoss(dtSeconds, zone)
    this.projectiles.update(dtSeconds)
    this.updateMissiles(dtSeconds, bounds)
    this.enemyShots.update(dtSeconds, bounds)
    this.pickups.update(dtSeconds)
    this.rings.update(dtSeconds)
    this.muzzle.update(dtSeconds)

    this.collisions.resolveProjectiles(this.projectiles.items, this.enemies, (enemy) =>
      this.handleEnemyDestroyed(enemy),
    )
    this.collisions.resolveProjectiles(this.missiles.items, this.enemies, (enemy) =>
      this.handleEnemyDestroyed(enemy),
    )
    this.damageBossFrom(this.projectiles.items)
    this.damageBossFrom(this.missiles.items)
    this.collisions.resolveEnemyShots(this.enemyShots.items, this.player, (damage) =>
      this.applyDamageToPlayer(damage, this.player.x, this.player.y, this.player.z),
    )
    this.collisions.resolvePlayerContact(this.player, this.enemies, (enemy) =>
      this.applyDamageToPlayer(enemy.contactDamage, enemy.x, enemy.y, enemy.z),
    )
    if (
      this.boss.active &&
      sphereHit(
        this.player.x,
        this.player.y,
        this.player.z,
        this.player.radius,
        this.boss.x,
        this.boss.y,
        this.boss.z,
        this.boss.radius,
      )
    ) {
      this.applyDamageToPlayer(BOSS.contactDamage, this.boss.x, this.boss.y, this.boss.z)
    }
    this.collisions.resolvePickups(this.pickups.items, this.player, (kind) =>
      this.applyPickup(kind),
    )

    this.syncShipMesh()
    this.syncEntityMeshes()
    this.renderer.render(this.scene, this.cameraController.camera)
  }

  private updateShake(dtSeconds: number): void {
    if (
      this.shakeTime <= 0 ||
      dtSeconds <= 0 ||
      !this.shakeEnabled ||
      this.reduceMotion ||
      this.disposed
    ) {
      if (this.shakeTime <= 0) {
        this.cameraController.setShake(0, 0)
      }
      return
    }
    this.shakeTime = Math.max(0, this.shakeTime - dtSeconds)
    const strength = FX.shakeMagnitude * (this.shakeTime / FX.shakeDurationSeconds)
    this.cameraController.setShake(
      (Math.random() - 0.5) * 2 * strength,
      (Math.random() - 0.5) * 2 * strength,
    )
  }

  private shake(): void {
    if (this.shakeEnabled && !this.reduceMotion) {
      this.shakeTime = FX.shakeDurationSeconds
    }
  }

  /** Drag relatif → dunia; mengabaikan saat canvas tak terukur. */
  private applyDragDelta(zone: WorldBounds): void {
    const drag = this.input.consumeDragDelta()
    if (drag.dx === 0 && drag.dy === 0) {
      return
    }
    const rect = this.canvas.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      return
    }
    const bounds = this.cameraController.getBounds()
    this.player.x += (drag.dx * (bounds.maxX - bounds.minX)) / rect.width
    this.player.y -= (drag.dy * (bounds.maxY - bounds.minY)) / rect.height
    this.player.clampToZone(zone)
  }

  private updateDirector(dtSeconds: number, bounds: WorldBounds): void {
    for (const rule of this.waves.composition()) {
      let active = 0
      for (const enemy of this.enemies) {
        if (enemy.active && enemy.kind === rule.kind) {
          active += 1
        }
      }
      if (active >= rule.desired) {
        continue
      }
      const timer = this.directorTimers[rule.kind] - dtSeconds
      if (timer > 0) {
        this.directorTimers[rule.kind] = timer
        continue
      }
      this.directorTimers[rule.kind] = rule.intervalSeconds
      for (const enemy of this.enemies) {
        if (!enemy.active) {
          // Spawn di koridor bidang kapal (bukan frustum jauh yang lebar):
          // menjamin perjumpaan, bukan sekadar lewat di tepi.
          enemy.spawn(
            randomIn(bounds.minX + 1, bounds.maxX - 1),
            randomIn(bounds.minY + 1, bounds.maxY - 1),
            CHASE.spawnZ + randomIn(-2, 2),
            rule.kind,
          )
          enemy.speedScale = this.waves.speedMultiplier()
          enemy.intervalScale = this.waves.fireIntervalScale()
          break
        }
      }
    }
  }

  private updateEnemies(dtSeconds: number): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue
      }
      enemy.update(dtSeconds, this.elapsedSeconds)
      enemy.spinAngle += enemy.spin * dtSeconds
      // Lewat kamera → buang; tembak hanya saat mendekat di depan kapal.
      if (enemy.z > CHASE.cullZ) {
        enemy.deactivate()
        continue
      }
      // Dogfight: musuh cerdas melengkungkan basis gerak ke arah kapal.
      if (enemy.kind === 'scout' || enemy.kind === 'interceptor' || enemy.kind === 'heavy') {
        const pull = CHASE.convergePerSecond * dtSeconds
        enemy.baseX += Math.min(Math.max(this.player.x - enemy.baseX, -pull), pull)
        enemy.baseY += Math.min(Math.max(this.player.y - enemy.baseY, -pull), pull)
      }
      if (enemy.updateFire(dtSeconds) && enemy.z > CHASE.spawnZ + 2 && enemy.z < -1) {
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        const dz = this.player.z - enemy.z
        const length = Math.hypot(dx, dy, dz) || 1
        const speed = enemy.projectileSpeed
        this.enemyShots.fire({
          x: enemy.x,
          y: enemy.y,
          z: enemy.z + enemy.radius,
          velocityX: (dx / length) * speed,
          velocityY: (dy / length) * speed,
          velocityZ: (dz / length) * speed,
          damage: enemy.projectileDamage,
        })
      }
    }
  }

  private spawnBoss(zone: WorldBounds): void {
    const bossNumber = Math.floor(this.waves.wave / 3)
    const halfWidth = Math.max(1, (zone.maxX - zone.minX) / 2 - 1)
    this.boss.spawn(
      randomIn(-halfWidth, halfWidth),
      randomIn(0, 2),
      CHASE.bossEnterZ,
      CHASE.bossZ,
      BOSS.hpBase + BOSS.hpPerBoss * bossNumber,
    )
    this.waves.onBossSpawned()
    this.audio.bossWarn()
  }

  private updateBoss(dtSeconds: number, zone: WorldBounds): void {
    if (!this.boss.active) {
      return
    }
    this.boss.update(dtSeconds, this.elapsedSeconds, this.player.x, this.player.y, zone)
    if (this.boss.updateFireSalvo(dtSeconds)) {
      this.fireBossSalvo()
    }
    if (this.boss.updateFireFan(dtSeconds)) {
      this.fireBossFan()
    }
  }

  /** Arah tembakan 3D dari boss ke titik bidik di bidang kapal. */
  private bossShotVelocity(
    targetX: number,
    targetY: number,
    speed: number,
  ): { x: number; y: number; z: number } {
    const dx = targetX - this.boss.x
    const dy = targetY - this.boss.y
    const dz = this.player.z - this.boss.z
    const length = Math.hypot(dx, dy, dz) || 1
    return { x: (dx / length) * speed, y: (dy / length) * speed, z: (dz / length) * speed }
  }

  private bossMuzzle(): { x: number; y: number; z: number } {
    return { x: this.boss.x, y: this.boss.y, z: this.boss.z + this.boss.radius }
  }

  /** Pola 1: aimed salvo 3 tembakan ke posisi pemain. */
  private fireBossSalvo(): void {
    const muzzle = this.bossMuzzle()
    for (let i = 0; i < BOSS.salvoCount; i += 1) {
      const velocity = this.bossShotVelocity(
        this.player.x + (i - (BOSS.salvoCount - 1) / 2) * 0.7,
        this.player.y + (i - (BOSS.salvoCount - 1) / 2) * 0.4,
        BOSS.salvoSpeed,
      )
      this.enemyShots.fire({
        x: muzzle.x,
        y: muzzle.y,
        z: muzzle.z,
        velocityX: velocity.x,
        velocityY: velocity.y,
        velocityZ: velocity.z,
        damage: BOSS.salvoDamage,
      })
    }
  }

  /** Pola 2: kipas 5 tembakan menyebar horizontal. */
  private fireBossFan(): void {
    const muzzle = this.bossMuzzle()
    for (let i = 0; i < BOSS.fanCount; i += 1) {
      const velocity = this.bossShotVelocity(
        this.player.x + (i - (BOSS.fanCount - 1) / 2) * 1.2,
        this.player.y + (i - (BOSS.fanCount - 1) / 2) * 0.3,
        BOSS.fanSpeed,
      )
      this.enemyShots.fire({
        x: muzzle.x,
        y: muzzle.y,
        z: muzzle.z,
        velocityX: velocity.x,
        velocityY: velocity.y,
        velocityZ: velocity.z,
        damage: BOSS.fanDamage,
      })
    }
  }

  private damageBossFrom(dealers: DamageDealer[]): void {
    if (!this.boss.active) {
      return
    }
    for (const dealer of dealers) {
      if (!dealer.active) {
        continue
      }
      if (
        sphereHit(
          dealer.x,
          dealer.y,
          dealer.z,
          dealer.radius,
          this.boss.x,
          this.boss.y,
          this.boss.z,
          this.boss.radius,
        )
      ) {
        dealer.deactivate()
        if (this.boss.damage(dealer.damage)) {
          this.handleBossDefeated()
          break
        }
      }
    }
  }

  private handleBossDefeated(): void {
    const wave = this.waves.wave
    this.score.addBoss(wave)
    this.audio.bossExploded()
    for (let i = 0; i < 3; i += 1) {
      this.rings.spawn(
        this.boss.x + randomIn(-1, 1),
        this.boss.y + randomIn(-1, 1),
        RING_KILL,
        FX.bossRingScale,
        this.boss.z,
      )
    }
    for (let i = 0; i < BOSS.dropPickups; i += 1) {
      this.pickups.spawn(this.boss.x, this.boss.y, this.boss.z, rollPickupKind())
    }
    if (Math.random() < BOSS.dropSecondChance) {
      this.pickups.spawn(this.boss.x + 1, this.boss.y, this.boss.z, rollPickupKind())
    }
    if (this.waves.registerBossDefeated()) {
      this.advanceWave()
    }
  }

  private handleEnemyDestroyed(enemy: Enemy): void {
    this.score.addKill(enemy.kind)
    this.audio.enemyDestroyed()
    this.rings.spawn(enemy.x, enemy.y, RING_KILL, FX.killRingScale, enemy.z)
    const chance = PICKUP.dropChance[enemy.kind] ?? 0
    if (Math.random() < chance) {
      this.pickups.spawn(enemy.x, enemy.y, enemy.z, rollPickupKind())
    }
    if (this.waves.registerKill()) {
      this.advanceWave()
    }
  }

  /** Transisi wave: bersihkan sisa ancaman, naik wave, spawn boss bila waktunya. */
  private advanceWave(): void {
    for (const enemy of this.enemies) {
      enemy.deactivate()
    }
    this.enemyShots.clear()
    this.waves.advance()
    if (this.waves.isBossWave()) {
      this.spawnBoss(computePlayerZone(this.cameraController.getBounds()))
    }
    this.syncEntityMeshes()
  }

  private updateMissiles(dtSeconds: number, bounds: WorldBounds): void {
    for (const missile of this.missiles.items) {
      if (!missile.active) {
        continue
      }
      missile.update(dtSeconds, this.findNearestTarget(missile.x, missile.y), bounds)
    }
  }

  private findNearestTarget(x: number, y: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null
    let bestDistance = Number.POSITIVE_INFINITY
    if (this.boss.active) {
      bestDistance = (this.boss.x - x) * (this.boss.x - x) + (this.boss.y - y) * (this.boss.y - y)
      best = { x: this.boss.x, y: this.boss.y }
    }
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue
      }
      const distance = (enemy.x - x) * (enemy.x - x) + (enemy.y - y) * (enemy.y - y)
      if (distance < bestDistance) {
        bestDistance = distance
        best = { x: enemy.x, y: enemy.y }
      }
    }
    return best
  }

  private applyDamageToPlayer(amount: number, x: number, y: number, z: number): void {
    const result = this.player.health.applyDamage(amount)
    if (result.ignored) {
      return
    }
    const shielded = result.shieldDamage > 0
    this.rings.spawn(x, y, shielded ? RING_SHIELD : RING_HULL, 1, z)
    this.audio.playerHit(shielded)
    this.shake()
    if (result.died && !this.dying) {
      this.dying = true
      this.deathTimer = DEATH_DELAY_SECONDS
      this.input.clear()
    }
  }

  private applyPickup(kind: 'hull' | 'shield' | 'weapon'): void {
    if (kind === 'hull') {
      this.player.health.healHull(PICKUP.hullAmount)
    } else if (kind === 'shield') {
      this.player.health.rechargeShield(PICKUP.shieldAmount)
    } else {
      this.combat.reduceSpecial()
    }
    this.audio.pickup()
    this.rings.spawn(this.player.x, this.player.y, RING_SHIELD, 1, this.player.z)
  }

  private syncShipMesh(): void {
    const health = this.player.health
    if (!health.isAlive() || this.dying) {
      this.ship.visible = false
      return
    }
    // Blink selama invulnerability window (PRD §8.1).
    this.ship.visible =
      health.invulnRemaining <= 0 || Math.floor(this.elapsedSeconds * 12) % 2 === 0
    const deltaX = this.player.x - this.lastShipX
    const deltaY = this.player.y - this.lastShipY
    this.lastShipX = this.player.x
    this.lastShipY = this.player.y
    if (!this.reduceMotion) {
      this.ship.position.set(
        this.player.x,
        this.player.y + Math.sin(this.elapsedSeconds * 2) * 0.12,
        0,
      )
      // Chase-cam: yaw masuk belokan + roll + pitch ikuti gerak.
      this.ship.rotation.y = THREE.MathUtils.clamp(deltaX * 1.2, -0.4, 0.4)
      this.ship.rotation.z = THREE.MathUtils.clamp(-deltaX * 1.5, -0.5, 0.5)
      this.ship.rotation.x = THREE.MathUtils.clamp(deltaY * 0.8, -0.3, 0.3)
    } else {
      this.ship.position.set(this.player.x, this.player.y, 0)
      this.ship.rotation.set(0, 0, 0)
    }
  }

  /** Pasang model GLB async; gagal → placeholder tetap (PRD §10.3). */
  private async attachShipModel(url: string): Promise<void> {
    const model = await loadPlayerShipModel(url)
    if (this.disposed) {
      if (model !== null) {
        disposeObject3D(model)
      }
      return
    }
    if (model === null) {
      return
    }
    for (const child of [...this.ship.children]) {
      if (child.name === 'player-ship-model') {
        continue
      }
      child.visible = false
    }
    model.name = 'player-ship-model'
    this.ship.add(model)
    this.shipModelLoaded = true
  }

  /**
   * Pasang model GLB musuh/hazard ke semua slot pool. Anak placeholder
   * `kind-X` yang tergantikan dibuang (kontrak sync by-name tetap utuh;
   * kind tanpa URL, mis. mine, tetap placeholder).
   */
  private async attachEntityModels(
    urls: NonNullable<GameEngineOptions['entityModelUrls']>,
  ): Promise<void> {
    const kinds = Object.keys(urls) as Array<
      keyof NonNullable<GameEngineOptions['entityModelUrls']>
    >
    const templates = new Map<string, THREE.Group>()
    for (const kind of kinds) {
      const url = urls[kind]
      if (url === undefined || url === '') {
        continue
      }
      const config = ENTITY_MODEL[kind]
      const scene = await loadModel(url)
      if (scene !== null) {
        templates.set(
          kind,
          normalizeModel(scene, {
            targetLength: config.targetLength,
            yawRadians: config.yawRadians,
            pitchRadians: config.pitchRadians,
            rollRadians: config.rollRadians,
            name: `kind-${kind}`,
            forwardX: -1,
          }),
        )
      }
    }
    if (this.disposed) {
      for (const template of templates.values()) {
        disposeObject3D(template)
      }
      return
    }
    for (const [kind, template] of templates) {
      for (const slot of this.enemyMeshes) {
        const old = slot.getObjectByName(`kind-${kind}`)
        if (old !== undefined) {
          slot.remove(old)
          disposeObject3D(old)
        }
        const clone = template.clone(true)
        clone.name = `kind-${kind}`
        slot.add(clone)
      }
      disposeObject3D(template)
      this.loadedModels.push(kind)
    }
  }

  /** Pasang model GLB boss; gagal → placeholder tetap. */
  private async attachBossModel(url: string): Promise<void> {
    const scene = await loadModel(url)
    if (this.disposed) {
      if (scene !== null) {
        disposeObject3D(scene)
      }
      return
    }
    if (scene === null) {
      return
    }
    const model = normalizeModel(scene, {
      targetLength: ENTITY_MODEL.boss.targetLength,
      yawRadians: ENTITY_MODEL.boss.yawRadians,
      pitchRadians: ENTITY_MODEL.boss.pitchRadians,
      rollRadians: ENTITY_MODEL.boss.rollRadians,
      name: 'boss-model',
      forwardX: -1,
    })
    for (const child of [...this.bossMesh.children]) {
      child.visible = false
    }
    this.bossMesh.add(model)
    this.loadedModels.push('boss')
  }

  private syncEntityMeshes(): void {
    this.projectiles.items.forEach((projectile, index) => {
      const mesh = this.projectileMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = projectile.active
      if (projectile.active) {
        mesh.position.set(projectile.x, projectile.y, projectile.z)
      }
    })
    this.missiles.items.forEach((missile, index) => {
      const mesh = this.missileMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = missile.active
      if (missile.active) {
        mesh.position.set(missile.x, missile.y, missile.z)
      }
    })
    this.enemyShots.items.forEach((shot, index) => {
      const mesh = this.enemyShotMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = shot.active
      if (shot.active) {
        mesh.position.set(shot.x, shot.y, shot.z)
      }
    })
    this.enemies.forEach((enemy, index) => {
      const slot = this.enemyMeshes[index]
      if (slot === undefined) {
        return
      }
      slot.visible = enemy.active
      if (!enemy.active) {
        return
      }
      slot.position.set(enemy.x, enemy.y, enemy.z)
      for (const child of slot.children) {
        child.visible = child.name === `kind-${enemy.kind}`
        if (child.name === 'kind-asteroid' && child.visible) {
          child.rotation.x = enemy.spinAngle
        }
        if (child.name === 'kind-mine' && child.visible && !this.reduceMotion) {
          const pulse = 1 + Math.sin(this.elapsedSeconds * 4 + enemy.phase) * 0.15
          child.scale.set(pulse, pulse, pulse)
        }
      }
    })
    this.bossMesh.visible = this.boss.active
    if (this.boss.active) {
      this.bossMesh.position.set(this.boss.x, this.boss.y, this.boss.z)
      if (this.boss.isTelegraphing && !this.reduceMotion) {
        const pulse = 1 + Math.sin(this.elapsedSeconds * 10) * 0.05
        this.bossMesh.scale.set(pulse, pulse, pulse)
      } else {
        this.bossMesh.scale.set(1, 1, 1)
      }
    }
    this.pickups.items.forEach((pickup, index) => {
      const slot = this.pickupMeshes[index]
      if (slot === undefined) {
        return
      }
      slot.visible = pickup.active
      if (!pickup.active) {
        return
      }
      slot.position.set(pickup.x, pickup.y, pickup.z)
      if (!this.reduceMotion) {
        slot.rotation.y = this.elapsedSeconds * 1.8
      }
      for (const child of slot.children) {
        child.visible = child.name === `kind-${pickup.kind}`
      }
    })
  }

  private setStatus(status: EngineStatus): void {
    this.status = status
    this.statusEvents.emit(status)
  }
}
