<template>
  <div class="modal-backdrop" @click.self="handleClose">
    <div class="modal" role="dialog" aria-label="Controls help">
      <h2>CONTROLS</h2>
      <h3>Desktop</h3>
      <ul>
        <li><kbd>W A S D</kbd> / <kbd>← ↑ ↓ →</kbd> — gerak</li>
        <li>Tembakan primer — otomatis</li>
        <li><kbd>Space</kbd> — special weapon (salvo 3 misil)</li>
        <li><kbd>Esc</kbd> / <kbd>P</kbd> — pause / lanjut</li>
        <li><kbd>Enter</kbd> — mulai / main lagi</li>
        <li><kbd>M</kbd> — mute</li>
      </ul>
      <h3>Mobile / sentuh</h3>
      <ul>
        <li>Drag di area game — gerakkan kapal</li>
        <li>Tombol bundar kanan bawah — special weapon</li>
        <li>Tombol ⏸ kanan atas — pause</li>
        <li>Landscape disarankan; portrait tetap bisa dimainkan</li>
      </ul>
      <button type="button" class="close-button" @click="handleClose">Close</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

import { useGameSession } from '~/composables/useGameSession'

const emit = defineEmits<{
  (event: 'close'): void
}>()

const { playUiClick } = useGameSession()

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
  gap: 10px;
  width: min(420px, 100%);
  max-height: 85vh;
  overflow-y: auto;
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

.modal h3 {
  margin: 8px 0 0;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  color: var(--vs-cyan);
}

.modal ul {
  margin: 0;
  padding-left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

kbd {
  padding: 1px 7px;
  border-radius: 5px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.1);
  font-family: inherit;
  font-size: 0.78rem;
}

.close-button {
  margin-top: 8px;
  padding: 10px 16px;
  min-height: 44px;
  border-radius: 8px;
  border: 1px solid rgba(70, 230, 255, 0.4);
  background: rgba(70, 230, 255, 0.08);
  color: var(--vs-text);
  cursor: pointer;
}
</style>
