import { describe, expect, it } from 'vitest'

import type { GameState } from '../../game/core/GameStateMachine'
import { GameStateMachine } from '../../game/core/GameStateMachine'

function bootToMenu(): GameStateMachine {
  const machine = new GameStateMachine()
  expect(machine.transition('loading')).toBe(true)
  expect(machine.transition('menu')).toBe(true)
  return machine
}

describe('GameStateMachine', () => {
  it('mulai dari boot dan mengikuti alur boot → loading → menu', () => {
    const machine = new GameStateMachine()
    expect(machine.getState()).toBe('boot')
    expect(machine.transition('loading')).toBe(true)
    expect(machine.transition('menu')).toBe(true)
  })

  it('startRun hanya dari menu atau gameOver', () => {
    const fresh = new GameStateMachine()
    expect(fresh.startRun()).toBe(false)
    const machine = bootToMenu()
    expect(machine.startRun()).toBe(true)
    expect(machine.getState()).toBe('playing')
    expect(machine.startRun()).toBe(false)
  })

  it('pause/resume berpasangan dan tidak mereset state', () => {
    const machine = bootToMenu()
    machine.startRun()
    expect(machine.pause()).toBe(true)
    expect(machine.getState()).toBe('paused')
    expect(machine.pause()).toBe(false)
    expect(machine.resume()).toBe(true)
    expect(machine.getState()).toBe('playing')
    expect(machine.resume()).toBe(false)
  })

  it('menolak transisi invalid tanpa mengubah state', () => {
    const machine = bootToMenu()
    expect(machine.transition('paused')).toBe(false)
    expect(machine.transition('gameOver')).toBe(false)
    expect(machine.getState()).toBe('menu')
    expect(machine.pause()).toBe(false)
    expect(machine.resume()).toBe(false)
    expect(machine.endRun()).toBe(false)
    expect(machine.quitToMenu()).toBe(false)
  })

  it('alur kalah → main lagi → menu', () => {
    const machine = bootToMenu()
    machine.startRun()
    expect(machine.endRun()).toBe(true)
    expect(machine.getState()).toBe('gameOver')
    expect(machine.pause()).toBe(false)
    expect(machine.startRun()).toBe(true)
    expect(machine.quitToMenu()).toBe(true)
    expect(machine.getState()).toBe('menu')
  })

  it('error hanya dari state aktif dan kembali via menu', () => {
    const machine = bootToMenu()
    machine.startRun()
    expect(machine.fail()).toBe(true)
    expect(machine.getState()).toBe('error')
    expect(machine.transition('playing')).toBe(false)
    expect(machine.transition('menu')).toBe(true)
  })

  it('menerbitkan event setiap transisi valid', () => {
    const machine = bootToMenu()
    const seen: GameState[] = []
    machine.subscribe((state) => seen.push(state))
    machine.startRun()
    machine.pause()
    expect(seen).toEqual(['playing', 'paused'])
  })
})
