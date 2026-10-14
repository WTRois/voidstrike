<template>
  <div class="hud" data-testid="game-hud">
    <div class="hud-score" role="status" aria-label="Skor dan wave">
      <span>SCORE {{ scoreText }}</span>
      <span>WAVE {{ snapshot?.wave ?? 1 }}</span>
    </div>

    <div class="hud-vitals" role="status" aria-label="Hull dan shield">
      <div class="vital">
        <span class="vital-label">HULL</span>
        <span class="vital-track vital-track--hull">
          <span class="vital-fill" :style="{ width: `${hullPercent}%` }" />
        </span>
        <span class="vital-value">{{ snapshot?.hull ?? 0 }}</span>
      </div>
      <div class="vital">
        <span class="vital-label">SHIELD</span>
        <span class="vital-track vital-track--shield">
          <span class="vital-fill" :style="{ width: `${shieldPercent}%` }" />
        </span>
        <span class="vital-value">{{ snapshot?.shield ?? 0 }}</span>
      </div>
    </div>

    <div v-if="snapshot?.bossActive" class="hud-boss" role="status" :aria-label="bossAria">
      <span class="boss-name">{{ snapshot?.bossName }}</span>
      <span class="boss-track">
        <span class="boss-fill" :style="{ width: `${bossPercent}%` }" />
      </span>
    </div>
    <div v-if="snapshot?.bossTelegraph" class="hud-warning" role="alert">
      <p>⚠ BOSS APPROACHING ⚠</p>
    </div>

    <button type="button" class="hud-pause" aria-label="Pause atau lanjutkan" @click="handlePause">
      {{ gameState === 'paused' ? '▶' : '⏸' }}
    </button>

    <button
      type="button"
      class="hud-special"
      :class="{ 'hud-special--ready': specialReady }"
      :aria-label="specialReady ? 'Tembakkan special weapon' : 'Special weapon cooldown'"
      @pointerdown.prevent="handleSpecial"
    >
      <span class="hud-special-fill" :style="{ height: `${specialPercent}%` }" />
      <span class="hud-special-text">{{ specialReady ? 'SP' : specialSeconds }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useGameSession } from '~/composables/useGameSession'

const { gameState, snapshot, pauseGame, resumeGame, fireSpecialWeapon, playUiClick } =
  useGameSession()

const scoreText = computed(() => (snapshot.value?.score ?? 0).toLocaleString('en-US'))

function percent(value: number, max: number): number {
  if (max <= 0) {
    return 0
  }
  return Math.round((Math.min(Math.max(value, 0), max) / max) * 100)
}

const hullPercent = computed(() => percent(snapshot.value?.hull ?? 0, snapshot.value?.maxHull ?? 1))
const shieldPercent = computed(() =>
  percent(snapshot.value?.shield ?? 0, snapshot.value?.maxShield ?? 1),
)

const specialPercent = computed(() => {
  const current = snapshot.value
  if (current === null || current.specialCooldown <= 0) {
    return 100
  }
  const remaining = Math.min(current.specialRemaining, current.specialCooldown)
  return Math.round((1 - remaining / current.specialCooldown) * 100)
})

const specialReady = computed(() => (snapshot.value?.specialRemaining ?? 1) <= 0)
const specialSeconds = computed(() => Math.ceil(snapshot.value?.specialRemaining ?? 0).toString())

const bossPercent = computed(() => {
  const current = snapshot.value
  if (current === null || current.bossMax <= 0) {
    return 0
  }
  return Math.round((Math.max(0, current.bossHp) / current.bossMax) * 100)
})

const bossAria = computed(() => {
  const current = snapshot.value
  return `Boss ${current?.bossName ?? ''} HP ${current?.bossHp ?? 0} dari ${current?.bossMax ?? 0}`
})

function handlePause(): void {
  playUiClick()
  if (gameState.value === 'playing') {
    pauseGame()
  } else if (gameState.value === 'paused') {
    resumeGame()
  }
}

function handleSpecial(): void {
  fireSpecialWeapon()
}
</script>

<style scoped>
.hud {
  position: absolute;
  inset: 0;
  pointer-events: none;
  font-size: 0.75rem;
}

.hud-score {
  position: absolute;
  top: 10px;
  left: 12px;
  display: flex;
  gap: 12px;
  padding: 6px 12px;
  letter-spacing: 0.12em;
  color: var(--vs-text);
  background: rgba(5, 7, 13, 0.65);
  border: 1px solid rgba(70, 230, 255, 0.3);
  border-radius: 8px;
}

.hud-vitals {
  position: absolute;
  left: 12px;
  bottom: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 10px;
  background: rgba(5, 7, 13, 0.65);
  border: 1px solid rgba(70, 230, 255, 0.3);
  border-radius: 8px;
}

.vital {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vital-label {
  width: 52px;
  letter-spacing: 0.12em;
  color: var(--vs-muted);
  font-size: 0.65rem;
}

.vital-track {
  width: 110px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
}

.vital-track--hull .vital-fill {
  display: block;
  height: 100%;
  background: #3dff8a;
}

.vital-track--shield .vital-fill {
  display: block;
  height: 100%;
  background: var(--vs-cyan);
}

.vital-value {
  min-width: 28px;
  text-align: right;
  color: var(--vs-text);
}

.hud-boss {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 12px;
  letter-spacing: 0.14em;
  color: #ffb3c8;
  background: rgba(20, 5, 12, 0.7);
  border: 1px solid rgba(255, 61, 110, 0.5);
  border-radius: 8px;
}

.boss-track {
  display: inline-block;
  width: min(140px, 24vw);
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 61, 110, 0.2);
  overflow: hidden;
}

.boss-fill {
  display: block;
  height: 100%;
  background: #ff3d6e;
}

.hud-warning {
  position: absolute;
  top: 52px;
  left: 50%;
  transform: translateX(-50%);
  padding: 6px 16px;
  font-weight: 700;
  letter-spacing: 0.18em;
  color: #ffd23d;
  background: rgba(20, 12, 5, 0.75);
  border: 1px solid rgba(255, 210, 61, 0.6);
  border-radius: 8px;
  white-space: nowrap;
}

.hud-pause {
  position: absolute;
  top: 48px;
  right: 12px;
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(5, 7, 13, 0.7);
  color: var(--vs-text);
  font-size: 1.1rem;
  cursor: pointer;
  pointer-events: auto;
}

.hud-special {
  position: absolute;
  right: max(12px, env(safe-area-inset-right));
  bottom: max(12px, env(safe-area-inset-bottom));
  width: 72px;
  height: 72px;
  border-radius: 50%;
  border: 2px solid rgba(70, 230, 255, 0.4);
  background: rgba(5, 7, 13, 0.7);
  color: var(--vs-cyan);
  font-weight: 700;
  overflow: hidden;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
}

.hud-special--ready {
  border-color: var(--vs-cyan);
  box-shadow: 0 0 12px rgba(70, 230, 255, 0.45);
}

.hud-special-fill {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  background: rgba(70, 230, 255, 0.25);
}

.hud-special-text {
  position: relative;
  font-size: 0.9rem;
  letter-spacing: 0.08em;
}

@media (max-width: 640px) {
  .hud-vitals {
    padding: 6px 8px;
  }

  .vital-track {
    width: 80px;
  }

  .hud-score {
    font-size: 0.65rem;
  }

  .hud-boss {
    top: 48px;
    left: 12px;
    transform: none;
    max-width: calc(100% - 132px);
  }

  .boss-track {
    width: 22vw;
  }
}
</style>
