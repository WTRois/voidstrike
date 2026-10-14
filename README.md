# VOIDSTRIKE: STARFALL

3D side-scrolling arcade shooter — single-player, tanpa login.
Stack wajib (PRD §3): **Nuxt 4 + Vue 3 + TypeScript strict + Three.js + Bun**.

Status: **Tahap 7 — fully-3D + semua model GLB** (pemain, 3 musuh, asteroid, boss; SFX MP3 + fallback synth, parallax 3 lapis + nebula, kamera perspektif, 126 unit test, E2E + profiling terverifikasi, build + static OK).

## Prasyarat

- Bun ≥ 1.x (`bun --version`)
- Browser modern dengan WebGL

## Perintah

```bash
bun install        # install dependency
bun run dev        # dev server (http://localhost:3000)
bun run build      # build produksi (node-server preset)
bun run preview    # preview hasil build
bunx nuxt generate # alternatif: export statis ke .output/public
bun run typecheck  # typecheck Nuxt (vue-tsc)
bun run lint       # eslint (0 error; 3 warning void-element: konflik prettier, non-blocking)
bun run format     # prettier --write
bun run test       # unit tests (Vitest, 116 test)
```

Urutan verifikasi minimum (PRD §20): `bun install` → `bun run typecheck` → `bun run test` → `bun run build`.

## Testing

- **Unit (Vitest, node):** 27 file / 126 test — state machine, input (keyboard + pointer via fake target), movement, projectile/enemy/missile/pickup pools, combat + special, health, collision, score, wave (+alur headless wave 1→4), boss, starfield (+nebula/fokus-Y), kamera perspektif, scene, placeholder visual, normalisasi + merge GLB, ring, muzzle, audio hibrida (no-op aman + fallback synth), storage (valid/corrupt/penuh/nonaktif/reset).
- **Tidak diuji di node (butuh WebGL/DOM):** konstruksi/dispose `GameEngine`, sync mesh, audio nyata. Diganti smoke browser Playwright: menu → main → pause → mati → best → reload → restart 9×, boss wave via `?wave=3`, portrait + landscape, FPS/draw calls (menu 60/16, combat 60/29, boss 60/46), 0 console error.
- **Hook playtesting:** `?wave=N` (1–99) untuk melompat ke wave boss tanpa main 10 menit.

Urutan verifikasi minimum (PRD §20): `bun install` → `bun run typecheck` → `bun run test` → `bun run build`.

## Struktur (Tahap 0)

```text
app/
  app.vue                    # shell Nuxt
  pages/index.vue            # halaman utama + ClientOnly viewport + modal
  components/game/           # GameViewport, GameHud, MainMenu, PauseOverlay,
                             # GameOverOverlay, SettingsPanel, ControlsHelp
  composables/
    useGameSession.ts        # lifecycle engine, state, snapshot 5Hz, storage
  assets/css/main.css
game/
  core/                      # GameEngine, GameLoop, CameraController,
                             # GameStateMachine, SceneFactory, EventEmitter
  config/gameBalance.ts      # semua angka balancing (satu sumber kebenaran)
  types/game.ts              # EngineStatus, GameSnapshot, WorldBounds, …
  utils/                     # bounds (murni), dispose
  input/InputManager.ts      # keyboard + pointer drag, teruji tanpa DOM
  entities/                  # PlayerShip, Enemy (5 kind), Boss, Projectile,
                             # EnemyProjectile, Missile, Pickup
  systems/                   # Combat, Health, Collision, Score, Wave
  assets/                    # placeholder prosedural (+X), slot per-kind
  effects/                   # Starfield, HitRing, MuzzleFlash, AudioManager
  storage/                   # schema berversi + localProfile best-effort
tests/unit/                  # 26 file, 116 test
docs/
  PRD.md · DECISIONS.md · ASSET_CREDITS.md
```

## Aturan PRD yang dijaga sejak Tahap 0

- Three.js / WebGL / `window` / `localStorage` hanya di client (`onMounted`, `<ClientOnly>`) — §3.3.
- Gambar referensi bukan model 3D; GLB diperlakukan belum tersedia + fallback wajib — §10.
- Vue = menu/HUD/overlay; engine TS = simulasi (belum masuk Tahap 0) — §11.
- Scope MVP saja; multiplayer/backend/leaderboard global di luar MVP — §4.3.
