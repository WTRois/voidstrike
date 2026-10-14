import * as THREE from 'three'

import { BOSS, FX, PICKUP, PLAYER, POOLS, PRIMARY, RENDER, SPECIAL } from '../config/gameBalance'
import type { EngineStatus, GameSnapshot, QualityPreset, WorldBounds } from '../types/game'
import { createPlaceholderPlayerShip } from '../assets/createPlaceholderPlayerShip'
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
import { computePlayerZone, computeSpawnX } from '../utils/bounds'
import { disposeObject3D } from '../utils/dispose'
import { CameraController } from './CameraController'
import { EventEmitter } from './EventEmitter'
import { GameLoop } from './GameLoop'
import type { GameState } from './GameStateMachine'
import { GameStateMachine } from './GameStateMachine'
import { createLights, createScene } from './SceneFactory'
import { CollisionSystem, circleHit, type DamageDealer } from '../systems/CollisionSystem'
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
    this.player.reset(zone.minX + 2.2, 0)
    this.lastShipX = this.player.x
    this.lastShipY = this.player.y
    this.ship.position.set(this.player.x, this.player.y, 0)
    this.scene.add(this.ship)
    if (options.shipModelUrl !== undefined && options.shipModelUrl !== '') {
      void this.attachShipModel(options.shipModelUrl)
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
      x: this.player.x + PLAYER.muzzleOffsetX,
      y: this.player.y,
      launch: (x, y, velocityX, velocityY) => {
        this.missiles.launch(x, y, velocityX, velocityY)
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
    this.player.reset(zone.minX + 2.2, 0)
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
      this.spawnBoss(bounds)
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
    this.starfield.update(dtSeconds, bounds, this.player.y)
    this.score.addSurvival(dtSeconds)

    const zone = computePlayerZone(bounds)
    const axis = this.input.getAxis()
    this.player.update(dtSeconds, axis.x, axis.y, zone)
    this.applyDragDelta(zone)
    this.player.health.update(dtSeconds)

    this.combat.update(dtSeconds, true, {
      x: this.player.x + PLAYER.muzzleOffsetX,
      y: this.player.y,
      fire: (x, y) => {
        this.projectiles.fire({ x, y, velocityX: PRIMARY.projectileSpeed, damage: PRIMARY.damage })
        this.muzzle.spawn(x, y)
        this.audio.shoot()
      },
    })
    this.combat.updateSpecial(dtSeconds)

    this.updateDirector(dtSeconds, bounds)
    this.updateEnemies(dtSeconds, bounds)
    this.updateBoss(dtSeconds, bounds)
    this.projectiles.update(dtSeconds, bounds)
    this.updateMissiles(dtSeconds, bounds)
    this.enemyShots.update(dtSeconds, bounds)
    this.pickups.update(dtSeconds, bounds)
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
      this.applyDamageToPlayer(damage, this.player.x, this.player.y),
    )
    this.collisions.resolvePlayerContact(this.player, this.enemies, (enemy) =>
      this.applyDamageToPlayer(enemy.contactDamage, enemy.x, enemy.y),
    )
    if (
      this.boss.active &&
      circleHit(
        this.player.x,
        this.player.y,
        this.player.radius,
        this.boss.x,
        this.boss.y,
        this.boss.radius,
      )
    ) {
      this.applyDamageToPlayer(BOSS.contactDamage, this.boss.x, this.boss.y)
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
          enemy.spawn(computeSpawnX(bounds), randomIn(bounds.minY + 1, bounds.maxY - 1), rule.kind)
          enemy.speedScale = this.waves.speedMultiplier()
          enemy.intervalScale = this.waves.fireIntervalScale()
          break
        }
      }
    }
  }

  private updateEnemies(dtSeconds: number, bounds: WorldBounds): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) {
        continue
      }
      enemy.update(dtSeconds, this.elapsedSeconds)
      enemy.spinAngle += enemy.spin * dtSeconds
      if (enemy.x < bounds.minX - 2) {
        enemy.deactivate()
        continue
      }
      if (enemy.updateFire(dtSeconds) && enemy.x < bounds.maxX) {
        const dx = this.player.x - enemy.x
        const dy = this.player.y - enemy.y
        const length = Math.hypot(dx, dy) || 1
        const speed = enemy.projectileSpeed
        this.enemyShots.fire({
          x: enemy.x - enemy.radius,
          y: enemy.y,
          velocityX: (dx / length) * speed,
          velocityY: (dy / length) * speed,
          damage: enemy.projectileDamage,
        })
      }
    }
  }

  private spawnBoss(bounds: WorldBounds): void {
    const bossNumber = Math.floor(this.waves.wave / 3)
    this.boss.spawn(
      bounds.maxX + 4,
      bounds.maxX - BOSS.anchorMargin,
      0,
      BOSS.hpBase + BOSS.hpPerBoss * bossNumber,
    )
    this.waves.onBossSpawned()
    this.audio.bossWarn()
  }

  private updateBoss(dtSeconds: number, bounds: WorldBounds): void {
    if (!this.boss.active) {
      return
    }
    this.boss.update(dtSeconds, this.elapsedSeconds, this.player.y, bounds.minY, bounds.maxY)
    if (this.boss.updateFireSalvo(dtSeconds)) {
      this.fireBossSalvo()
    }
    if (this.boss.updateFireFan(dtSeconds)) {
      this.fireBossFan()
    }
  }

  /** Pola 1: aimed salvo 3 tembakan ke posisi pemain. */
  private fireBossSalvo(): void {
    const base = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x)
    for (let i = 0; i < BOSS.salvoCount; i += 1) {
      const angle = base + (i - (BOSS.salvoCount - 1) / 2) * BOSS.salvoSpread
      this.enemyShots.fire({
        x: this.boss.x - this.boss.radius,
        y: this.boss.y,
        velocityX: Math.cos(angle) * BOSS.salvoSpeed,
        velocityY: Math.sin(angle) * BOSS.salvoSpeed,
        damage: BOSS.salvoDamage,
      })
    }
  }

  /** Pola 2: kipas 5 tembakan menyebar. */
  private fireBossFan(): void {
    const center = Math.atan2(this.player.y - this.boss.y, this.player.x - this.boss.x)
    for (let i = 0; i < BOSS.fanCount; i += 1) {
      const angle = center + (i - (BOSS.fanCount - 1) / 2) * (BOSS.fanSpread / (BOSS.fanCount - 1))
      this.enemyShots.fire({
        x: this.boss.x - this.boss.radius,
        y: this.boss.y,
        velocityX: Math.cos(angle) * BOSS.fanSpeed,
        velocityY: Math.sin(angle) * BOSS.fanSpeed,
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
        circleHit(dealer.x, dealer.y, dealer.radius, this.boss.x, this.boss.y, this.boss.radius)
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
      )
    }
    for (let i = 0; i < BOSS.dropPickups; i += 1) {
      this.pickups.spawn(this.boss.x, this.boss.y, rollPickupKind())
    }
    if (Math.random() < BOSS.dropSecondChance) {
      this.pickups.spawn(this.boss.x + 1, this.boss.y, rollPickupKind())
    }
    if (this.waves.registerBossDefeated()) {
      this.advanceWave()
    }
  }

  private handleEnemyDestroyed(enemy: Enemy): void {
    this.score.addKill(enemy.kind)
    this.audio.enemyDestroyed()
    this.rings.spawn(enemy.x, enemy.y, RING_KILL, FX.killRingScale)
    const chance = PICKUP.dropChance[enemy.kind] ?? 0
    if (Math.random() < chance) {
      this.pickups.spawn(enemy.x, enemy.y, rollPickupKind())
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
      this.spawnBoss(this.cameraController.getBounds())
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

  private applyDamageToPlayer(amount: number, x: number, y: number): void {
    const result = this.player.health.applyDamage(amount)
    if (result.ignored) {
      return
    }
    const shielded = result.shieldDamage > 0
    this.rings.spawn(x, y, shielded ? RING_SHIELD : RING_HULL)
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
    this.rings.spawn(this.player.x, this.player.y, RING_SHIELD)
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
      this.ship.rotation.z =
        Math.sin(this.elapsedSeconds * 1.3) * 0.02 + THREE.MathUtils.clamp(deltaY * 0.6, -0.3, 0.3)
      // Banking fully-3D: yaw mengikuti gerak horizontal, pitch mengikuti vertikal.
      this.ship.rotation.y = THREE.MathUtils.clamp(deltaX * 1.2, -0.4, 0.4)
      this.ship.rotation.x = THREE.MathUtils.clamp(-deltaY * 0.8, -0.3, 0.3)
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

  private syncEntityMeshes(): void {
    this.projectiles.items.forEach((projectile, index) => {
      const mesh = this.projectileMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = projectile.active
      if (projectile.active) {
        mesh.position.set(projectile.x, projectile.y, 0)
      }
    })
    this.missiles.items.forEach((missile, index) => {
      const mesh = this.missileMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = missile.active
      if (missile.active) {
        mesh.position.set(missile.x, missile.y, 0)
      }
    })
    this.enemyShots.items.forEach((shot, index) => {
      const mesh = this.enemyShotMeshes[index]
      if (mesh === undefined) {
        return
      }
      mesh.visible = shot.active
      if (shot.active) {
        mesh.position.set(shot.x, shot.y, 0)
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
      slot.position.set(enemy.x, enemy.y, 0)
      for (const child of slot.children) {
        child.visible = child.name === `kind-${enemy.kind}`
        if (child.name === 'kind-asteroid' && child.visible) {
          child.rotation.z = enemy.spinAngle
        }
        if (child.name === 'kind-mine' && child.visible && !this.reduceMotion) {
          const pulse = 1 + Math.sin(this.elapsedSeconds * 4 + enemy.phase) * 0.15
          child.scale.set(pulse, pulse, pulse)
        }
      }
    })
    this.bossMesh.visible = this.boss.active
    if (this.boss.active) {
      this.bossMesh.position.set(this.boss.x, this.boss.y, 0)
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
      slot.position.set(pickup.x, pickup.y, 0)
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
