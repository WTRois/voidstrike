<template>
  <div class="overlay" role="dialog" aria-label="Pause">
    <div class="panel">
      <h2>PAUSED</h2>
      <button type="button" @click="handleResume">Resume</button>
      <button type="button" @click="handleRestart">Restart</button>
      <button type="button" @click="handleSettings">Settings</button>
      <button type="button" @click="handleMenu">Back to Menu</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameSession } from '~/composables/useGameSession'

const emit = defineEmits<{
  (event: 'open-settings'): void
}>()

const { resumeGame, restartRun, quitToMenu, playUiClick } = useGameSession()

function handleResume(): void {
  playUiClick()
  resumeGame()
}

function handleRestart(): void {
  playUiClick()
  restartRun()
}

function handleSettings(): void {
  playUiClick()
  emit('open-settings')
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
  background: rgba(5, 7, 13, 0.72);
}

.panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: min(280px, 80%);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(70, 230, 255, 0.35);
  background: var(--vs-panel);
  text-align: center;
}

.panel h2 {
  margin: 0 0 8px;
  letter-spacing: 0.2em;
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
</style>
