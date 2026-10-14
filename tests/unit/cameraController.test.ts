import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { CHASE, RENDER, WORLD } from '../../game/config/gameBalance'
import { CameraController } from '../../game/core/CameraController'

describe('CameraController chase-cam', () => {
  it('perspective side-view dengan batas identik fairness lama', () => {
    const controller = new CameraController()
    expect(controller.camera).toBeInstanceOf(THREE.PerspectiveCamera)
    controller.resize(1600, 900)
    const bounds = controller.getBounds()
    expect(bounds.maxX).toBeCloseTo(WORLD.halfHeight * (16 / 9), 10)
    expect(bounds.minX).toBe(-bounds.maxX)
    expect(bounds.maxY).toBe(WORLD.halfHeight)
  })

  it('viewport portrait menghasilkan arena lebih sempit', () => {
    const controller = new CameraController()
    controller.resize(600, 900)
    const bounds = controller.getBounds()
    expect(bounds.maxX - bounds.minX).toBeLessThan(bounds.maxY - bounds.minY)
  })

  it('mengabaikan ukuran invalid tanpa merusak frustum', () => {
    const controller = new CameraController()
    controller.resize(1280, 720)
    const before = controller.getBounds()
    controller.resize(0, 0)
    controller.resize(Number.NaN, 720)
    expect(controller.getBounds()).toEqual(before)
  })

  it('snap menempatkan kamera di belakang kapal menatap depan', () => {
    const controller = new CameraController()
    controller.snap(2, -1)
    expect(controller.camera.position.x).toBeCloseTo(2 * CHASE.followX, 10)
    expect(controller.camera.position.y).toBeCloseTo(CHASE.camHeight - CHASE.followY, 10)
    expect(controller.camera.position.z).toBe(RENDER.cameraZ)
  })

  it('follow mendekati target secara smoothing', () => {
    const controller = new CameraController()
    controller.snap(0, -2)
    const beforeX = controller.camera.position.x
    controller.follow(0.016, 8, -2)
    const afterX = controller.camera.position.x
    expect(afterX).toBeGreaterThan(beforeX)
    expect(afterX).toBeLessThan(8 * CHASE.followX)
    controller.follow(10, 8, -2)
    expect(controller.camera.position.x).toBeCloseTo(8 * CHASE.followX, 2)
  })

  it('setShake menggeser dan mengembalikan posisi kamera', () => {
    const controller = new CameraController()
    controller.snap(0, -2)
    controller.setShake(0.2, -0.1)
    expect(controller.camera.position.x).toBeCloseTo(0.2, 10)
    expect(controller.camera.position.y).toBeCloseTo(CHASE.camHeight - 2 * CHASE.followY - 0.1, 10)
    expect(controller.camera.position.z).toBe(RENDER.cameraZ)
    controller.setShake(0, 0)
    expect(controller.camera.position.x).toBe(0)
  })
})
