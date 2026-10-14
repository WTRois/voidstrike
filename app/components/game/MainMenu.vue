<template>
  <section class="main-menu" aria-label="Menu utama">
    <button type="button" class="play-button" @click="handlePlay">▶ Play</button>
    <div class="menu-row">
      <button type="button" @click="handleControls">Controls</button>
      <button type="button" @click="handleSettings">Settings</button>
    </div>
    <p class="best">Best Score: {{ bestText }}</p>
    <p class="hint">
      WASD/panah gerak · tembakan otomatis · Space special · landscape disarankan di ponsel
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { useGameSession } from '~/composables/useGameSession'

const emit = defineEmits<{
  (event: 'open-controls' | 'open-settings'): void
}>()

const { startGame, playUiClick, bestScore } = useGameSession()

const bestText = computed(() =>
  bestScore.value > 0 ? bestScore.value.toLocaleString('en-US') : '—',
)

function handlePlay(): void {
  playUiClick()
  startGame()
}

function handleControls(): void {
  playUiClick()
  emit('open-controls')
}

function handleSettings(): void {
  playUiClick()
  emit('open-settings')
}
</script>

<style scoped>
.main-menu {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 12px;
  max-width: 420px;
}

.play-button {
  padding: 14px 24px;
  min-height: 52px;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  border-radius: 10px;
  border: 1px solid var(--vs-cyan);
  background: rgba(70, 230, 255, 0.14);
  color: var(--vs-text);
  cursor: pointer;
}

.menu-row {
  display: flex;
  gap: 12px;
}

.menu-row button {
  flex: 1;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.08);
  color: var(--vs-text);
  cursor: pointer;
}

.best {
  margin: 0;
  color: var(--vs-cyan);
  letter-spacing: 0.1em;
  font-size: 0.85rem;
}

.hint {
  margin: 0;
  color: var(--vs-muted);
  font-size: 0.8rem;
}
</style>
