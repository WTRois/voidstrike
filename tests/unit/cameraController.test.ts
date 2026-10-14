import * as THREE from 'three'
import { describe, expect, it } from 'vitest'

import { CameraController } from '../../game/core/CameraController'
import { WORLD } from '../../game/config/gameBalance'

describe('CameraController', () => {
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

  it('setShake menggeser dan mengembalikan posisi kamera', () => {
    const controller = new CameraController()
    controller.setShake(0.2, -0.1)
    expect(controller.camera.position.x).toBeCloseTo(0.2, 10)
    expect(controller.camera.position.y).toBeCloseTo(-0.1, 10)
    expect(controller.camera.position.z).toBe(10)
    controller.setShake(0, 0)
    expect(controller.camera.position.x).toBe(0)
    expect(controller.camera.position.y).toBe(0)
  })
})
