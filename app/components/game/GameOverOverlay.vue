<template>
  <div class="overlay" role="dialog" aria-label="Game over">
    <div class="panel">
      <h2>GAME OVER</h2>
      <p v-if="lastRunIsNewBest" class="new-best" role="status">★ NEW BEST SCORE ★</p>
      <dl class="stats">
        <div>
          <dt>Final Score</dt>
          <dd>{{ scoreText }}</dd>
        </div>
        <div>
          <dt>Best Score</dt>
          <dd>{{ bestText }}</dd>
        </div>
        <div>
          <dt>Wave</dt>
          <dd>{{ snapshot?.wave ?? 1 }}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>{{ durationText }}</dd>
        </div>
        <div>
          <dt>Enemies Destroyed</dt>
          <dd>{{ snapshot?.kills ?? 0 }}</dd>
        </div>
        <div>
          <dt>Bosses Defeated</dt>
          <dd>{{ snapshot?.bossesDefeated ?? 0 }}</dd>
        </div>
      </dl>
      <button type="button" class="primary" @click="handleAgain">Play Again</button>
      <button type="button" @click="handleMenu">Menu</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useGameSession } from '~/composables/useGameSession'

const { snapshot, bestScore, lastRunIsNewBest, startGame, quitToMenu, playUiClick } =
  useGameSession()

const bestText = computed(() =>
  bestScore.value > 0 ? bestScore.value.toLocaleString('en-US') : '—',
)
const scoreText = computed(() => (snapshot.value?.score ?? 0).toLocaleString('en-US'))

const durationText = computed(() => {
  const total = snapshot.value?.durationSeconds ?? 0
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
})

function handleAgain(): void {
  playUiClick()
  startGame()
}

function handleMenu(): void {
  playUiClick()
  quitToMenu()
}
</script>

<style scoped>
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 7, 13, 0.78);
  overflow-y: auto;
  padding: 16px;
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: min(320px, 90%);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(255, 107, 94, 0.45);
  background: var(--vs-panel);
  text-align: center;
}

.panel h2 {
  margin: 0 0 4px;
  letter-spacing: 0.2em;
  color: var(--vs-danger);
}

.new-best {
  margin: 0;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #ffd23d;
}

.stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px 16px;
  margin: 0 0 8px;
}

.stats div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stats dt {
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  color: var(--vs-muted);
}

.stats dd {
  margin: 0;
  font-size: 1.05rem;
  color: var(--vs-text);
}

.panel button {
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.08);
  color: var(--vs-text);
  cursor: pointer;
}

.panel button.primary {
  border-color: var(--vs-cyan);
  background: rgba(70, 230, 255, 0.14);
  font-weight: 700;
}
</style>
