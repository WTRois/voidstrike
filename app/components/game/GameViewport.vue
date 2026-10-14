<template>
  <div class="viewport" data-testid="game-viewport">
    <canvas
      ref="canvasRef"
      class="viewport-canvas"
      aria-label="Area permainan Voidstrike. Drag untuk menggerakkan kapal pada perangkat sentuh."
      role="img"
    />
    <GameHud v-if="status === 'ready' && (gameState === 'playing' || gameState === 'paused')" />
    <PauseOverlay
      v-if="status === 'ready' && gameState === 'paused'"
      @open-settings="emit('open-settings')"
    />
    <GameOverOverlay v-if="status === 'ready' && gameState === 'gameOver'" />
    <div v-if="status === 'loading'" class="viewport-overlay">
      <p>Menyiapkan sistem…</p>
    </div>
    <div
      v-else-if="status === 'error'"
      class="viewport-overlay viewport-overlay--error"
      role="alert"
    >
      <p><strong>Viewport 3D tidak dapat dimulai.</strong></p>
      <p>{{ errorMessage }}</p>
      <button type="button" class="retry-button" @click="handleRetry">Coba lagi</button>
    </div>
    <div v-else-if="showLiveBadge" class="viewport-badge" aria-hidden="true">
      <span class="badge-dot" />
      <span>LIVE RENDER</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import GameHud from '~/components/game/GameHud.vue'
import GameOverOverlay from '~/components/game/GameOverOverlay.vue'
import PauseOverlay from '~/components/game/PauseOverlay.vue'
import { useGameSession } from '~/composables/useGameSession'

const emit = defineEmits<{
  (event: 'open-settings'): void
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
const { status, gameState, errorMessage, restart } = useGameSession(canvasRef)

// Badge hanya saat HUD tidak aktif agar tidak menutupi panel vitals.
const showLiveBadge = computed(
  () => status.value === 'ready' && gameState.value !== 'playing' && gameState.value !== 'paused',
)

async function handleRetry(): Promise<void> {
  await restart()
}
</script>

<style scoped>
.viewport {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  max-height: 70vh;
  background: #05070d;
  border: 1px solid rgba(70, 230, 255, 0.25);
  border-radius: 12px;
  overflow: hidden;
}

.viewport-canvas {
  display: block;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.viewport-overlay {
  position: absolute;
  inset: auto 0 0 0;
  padding: 12px 16px;
  text-align: center;
  font-size: 0.9rem;
  color: var(--vs-text);
  background: var(--vs-panel);
}

.viewport-overlay--error {
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid var(--vs-danger);
}

.retry-button {
  padding: 10px 22px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.12);
  color: var(--vs-text);
  cursor: pointer;
}

.viewport-badge {
  position: absolute;
  left: 12px;
  bottom: 10px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  color: var(--vs-cyan);
  background: rgba(5, 7, 13, 0.6);
  border: 1px solid rgba(70, 230, 255, 0.3);
  border-radius: 999px;
}

.badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--vs-cyan);
}

@media (max-width: 640px) {
  .viewport {
    aspect-ratio: 4 / 3;
    max-height: 62vh;
  }
}
</style>
