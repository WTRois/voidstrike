<template>
  <main class="page">
    <header class="hero">
      <p class="eyebrow">VOIDSTRIKE: STARFALL</p>
      <h1>VOIDSTRIKE: STARFALL</h1>
      <p class="subtitle">
        3D side-scrolling arcade shooter. Single-player, tanpa login. Endless wave, boss VOIDWARDEN,
        skor tersimpan lokal — mainkan langsung di browser.
      </p>
    </header>

    <section aria-label="Viewport game">
      <ClientOnly fallback-tag="div" fallback="Memuat viewport game…">
        <GameViewport @open-settings="showSettings = true" />
      </ClientOnly>
    </section>

    <MainMenu
      v-if="gameState === 'menu'"
      @open-controls="showControls = true"
      @open-settings="showSettings = true"
    />
    <p v-else class="run-note">
      Status: {{ gameState }} · Best Score:
      {{ bestScore > 0 ? bestScore.toLocaleString('en-US') : '—' }}
    </p>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
    <ControlsHelp v-if="showControls" @close="showControls = false" />
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'

import ControlsHelp from '~/components/game/ControlsHelp.vue'
import GameViewport from '~/components/game/GameViewport.vue'
import MainMenu from '~/components/game/MainMenu.vue'
import SettingsPanel from '~/components/game/SettingsPanel.vue'
import { useGameSession } from '~/composables/useGameSession'

const { gameState, bestScore } = useGameSession()
const showSettings = ref(false)
const showControls = ref(false)
</script>

<style scoped>
.page {
  margin: 0 auto;
  max-width: 1080px;
  padding: 24px 16px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.hero h1 {
  margin: 4px 0 8px;
  letter-spacing: 0.08em;
  font-size: clamp(1.6rem, 4vw, 2.6rem);
}

.eyebrow {
  margin: 0;
  color: var(--vs-cyan);
  font-size: 0.8rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
}

.subtitle {
  margin: 0;
  color: var(--vs-muted);
  max-width: 60ch;
}

.run-note {
  margin: 0;
  color: var(--vs-muted);
  font-size: 0.85rem;
}
</style>
