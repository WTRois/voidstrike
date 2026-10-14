<template>
  <div class="modal-backdrop" @click.self="handleClose">
    <div class="modal" role="dialog" aria-label="Settings">
      <h2>SETTINGS</h2>
      <label class="row">
        <input type="checkbox" :checked="muted" @change="handleMute" />
        <span>Mute audio</span>
      </label>
      <fieldset class="quality">
        <legend>Graphics quality</legend>
        <label v-for="option in qualities" :key="option.value">
          <input
            type="radio"
            name="quality"
            :value="option.value"
            :checked="quality === option.value"
            @change="handleQuality(option.value)"
          />
          <span>{{ option.label }}</span>
        </label>
      </fieldset>
      <p class="note">Ganti kualitas membangun ulang renderer dan kembali ke menu.</p>
      <label class="row">
        <input type="checkbox" :checked="shakeEnabled" @change="handleShake" />
        <span>Camera shake (mati bila reduced-motion)</span>
      </label>
      <button type="button" class="close-button" @click="handleClose">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { useGameSession } from '~/composables/useGameSession'
import type { QualityPreset } from '../../../game/types/game'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { quality, muted, shakeEnabled, setMuted, setShakeEnabled, applyQuality, playUiClick } =
  useGameSession()

const qualities: Array<{ value: QualityPreset; label: string }> = [
  { value: 'auto', label: 'Auto' },
  { value: 'high', label: 'High' },
  { value: 'low', label: 'Low' },
]

function handleMute(event: Event): void {
  setMuted((event.target as HTMLInputElement).checked)
}

function handleShake(event: Event): void {
  setShakeEnabled((event.target as HTMLInputElement).checked)
}

async function handleQuality(value: QualityPreset): Promise<void> {
  playUiClick()
  await applyQuality(value)
}

function handleClose(): void {
  playUiClick()
  emit('close')
}

function handleEscape(event: KeyboardEvent): void {
  if (event.code === 'Escape') {
    emit('close')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(5, 7, 13, 0.7);
  padding: 16px;
}

.modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(360px, 100%);
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(70, 230, 255, 0.35);
  background: var(--vs-panel);
}

.modal h2 {
  margin: 0;
  letter-spacing: 0.2em;
  font-size: 1rem;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  cursor: pointer;
}

.row input {
  width: 20px;
  height: 20px;
}

.quality {
  display: flex;
  gap: 12px;
  border: 1px solid rgba(70, 230, 255, 0.25);
  border-radius: 8px;
  padding: 10px 12px;
}

.quality legend {
  padding: 0 6px;
  font-size: 0.7rem;
  letter-spacing: 0.14em;
  color: var(--vs-muted);
}

.quality label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  cursor: pointer;
}

.note {
  margin: 0;
  font-size: 0.75rem;
  color: var(--vs-muted);
}

.close-button {
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.08);
  color: var(--vs-text);
  cursor: pointer;
}
</style>
