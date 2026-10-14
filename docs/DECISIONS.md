# DECISIONS

Catatan keputusan teknis kecil yang belum ditentukan PRD (PRD §0 poin 10).
Pilih opsi paling sederhana, maintainable, ringan.

## Tahap 8 — Konversi chase-cam ala Vendetta (2026-10-14)

- **Pengguna meminta game "beneran 3D" seperti Vendetta Online** (chase-cam belakang kapal, terbang masuk layar). PRD §1.2/§6/§8/§11/§23 diamendemen: side-view → chase-cam. Ini override eksplisit pengguna, bukan scope-creep.
- **Forward = −Z.** Kapal di bidang z=0 tengah-bawah; musuh spawn z=−20 mendekat +Z; cull z>7; tembakan pemain dibuang z<−34. Semua di `CHASE` (gameBalance).
- **Bidang gerak pemain tetap (tidak terbang bebas 3D):** dodge di X/Y layar. Alasan: terbaca arcade, sentuh tetap drag-2D, collision adil. Kedalaman hanya milik musuh/proyektil/pickup.
- **Spawn di koridor bidang kapal + converge 0,7 u/s** (bukan frustum jauh yang lebar): percobaan pertama spawn frustum-penuh membuat musuh lewat di tepi tanpa perjumpaan (0 kill/9 dtk). Pelajaran: di chase-cam, spawn harus menjamin engagement.
- **Tembakan boss 3D terarah** (offset XY di titik bidik, bukan sudut planar): salvo 3 + fan 5, dinormalisasi penuh XYZ.
- **Kamera follow faktor 0,5/0,35 + tatap depan**: kapal selalu dalam bingkai (matematika offset diverifikasi + smoke tepi zona). Bounds gameplay tetap kotak tetap — aproksimasi yang aman.
- **Starfield streaming +Z** (5/9/15 u/s per lapis) + nebula parallax XY ikut kapal. Sensasi terbang maju tanpa menggerakkan kapal.
- **Orientasi ulang model**: pemain yaw 180° (mesin terlihat), musuh/boss pitch +90° (menghadap kamera). Proyektil/misil geometri diputar ke sumbu Z. Spin asteroid → sumbu X (tumble ke kamera).
- **Side-view lama dihapus total** (tidak dipertahankan sebagai mode): `computeSpawnX`, `circleHit`, `muzzleOffsetX`, zona pita-kiri dibuang. Test ditulis ulang (129 test); tidak ada test dipertahankan dengan perilaku usang.
- **Bug kecil tertangkap smoke**: boss bar menutupi skor di portrait ≤640px → bar pindah ke bawah skor (khusus mobile).
- **Profiling (headless):** combat 60,3 FPS / 49 draw / ~197K tri (asteroid dekat); boss 60,3 FPS / 38 draw. Draw call tidak naik vs Tahap 7 (merge bertahan).
- **E2E chase-cam:** kill organik, shield 100→34→mati (damage 3D konsisten), mati wave-3 boss, NEW BEST persist, restart bersih, portrait layak, 0 console error.

## Tahap 7 (lanjutan) — Model musuh, hazard dan boss (2026-10-14)

- **5 GLB dipasang ke slot pool yang sama** (`scout/interceptor/heavy/asteroid` + `boss-01`): template dinormalisasi sekali, tiap slot memakai `clone(true)` berbagi geometri/material. Kontrak sync by-name (`kind-X`) tak berubah; mine tetap placeholder (tak ada file).
- **Orientasi asli model musuh = hidung +Y** (bukan +Z seperti kapal pemain): `rollRadians: +90°` merebahkannya menghadap −X. Diverifikasi via screenshot — musuh horizontal menghadap pemain, bukan vertikal.
- **Bug recenter tertangkap unit test baru**: center diukur pra-skala tapi shift diterapkan pasca-skala → visual meleset hingga 0,6 unit dari hitbox. Perbaikan: skala → ukur ulang → shift. Pelajaran: hitbox-vs-visual offset sekecil apa pun harus diuji, bukan diasumsikan.
- **Merge mesh per material saat load** (no-skin terkonfirmasi via parse JSON GLB): musuh 65–140 mesh → ±jumlah material. Draw call combat 394 → 56, geometri 164 → 37; tris tetap 205K (2 asteroid 82K-tri) — 60,3 FPS bahkan di SwiftShader, aman untuk GPU nyata.
- **`mergeStaticMeshes` murni + teruji node** (gabung sematerial, bake transform, atribut disamakan, skinned/morph dipertahankan). Node non-mesh GLB (light/kamera) sengaja dibuang — rig 3-light scene tetap satu-satunya pencahayaan.
- **Insiden dev-only (bukan bug kode)**: Vite HMR gagal resolve 1 import saat file GLB disalin bertahap mid-session; boot bersih = 0 error, `nuxt build` selalu hijau. Tidak ada perubahan kode; pelajaran: tambah aset besar saat dev server mati atau restart sesudahnya.

## Tahap 7 — Fully-3D, GLB, SFX dan parallax (2026-10-14)

- **Kamera: Orthographic → Perspective** (FOV diturunkan dari `WORLD.halfHeight` + `RENDER.cameraZ` sehingga batas dunia bidang z=0 identik — fairness collision, zona pemain, dan spawn tidak berubah; test kamera lama lolos tanpa ubah angka). Alasan: pengguna meminta fully-3D; layer parallax kini punya gerak-semu kedalaman nyata + model GLB terlihat volumetrik.
- **Model pemain = `app/assets/3d/spaceship.glb` via Vite `?url`** (bukan `public/`): satu sumber, ikut hash build + static export. URL diimpor di `useGameSession` (lapisan Nuxt) lalu dioper sebagai `GameEngineOptions.shipModelUrl` — modul `game/` tetap agnostik-asset dan teruji node.
- **GLB dipasang async ke wrapper `player-ship`** (placeholder disembunyikan, bukan dibuang): gagal load → placeholder tetap (PRD §10.3). Normalisasi murni teruji: bbox ke origin, skala uniform ke `SHIP_MODEL.targetLength` 3.2, yaw +90° (asumsi menghadap +Z; terverifikasi benar via screenshot — kapal menghadap +X).
- **Hitbox/gameplay tak berubah**: visual ≠ collision (PRD §10.3, §11.5). Musuh/boss/hazard tetap placeholder (hanya 1 GLB tersedia).
- **Banking kapal** (yaw/pitch dari delta posisi, di-reset saat reduced-motion) + tone mapping ACES 1.1 untuk PBR. Tanpa shadow map/post-processing (tetap dalam budget §15.1).
- **SFX hibrida**: `shoot-sfx.mp3` (pool 4, round-robin agar auto-fire 0,22 dtk tak terpotong), `explotion-scifi.mp3` (pool 3 untuk kill + boss), `intro-start.mp3` (`gameStart()` saat startRun). Synth lama = fallback bila file gagal/HTMLAudio tak ada. Mute mengatur volume pool + master gain. `unlock()` tetap dari gesture Play (autoplay policy).
- **Parallax 3 lapis bintang + 3 nebula sprite** (gradient canvas prosedural, additive, drift lambat + geser-Y mengikuti pemain). Nebula di grup `backdrop` terpisah agar kontrak test `group.children = Points` tak pecah; guard `document === undefined` agar test node tetap hijau.
- **Profiling (headless):** combat 60,3 FPS / 83 draw / 7746 tri / 3 tekstur; boss 60,3 FPS / 34 draw. Naik dari Tahap 6 (29 draw) tapi jauh dalam budget. 0 console error di semua smoke (landscape, portrait, boss).
- **Kredit aset**: GLB + 3 MP3 disediakan pengguna untuk proyek ini; lisensi pasti belum terverifikasi — catat di ASSET_CREDITS, pastikan hak pakai sebelum rilis publik.

## Tahap 6 — Storage, testing, profiling dan rilis (2026-10-14)

- **Storage di `game/storage/`** (schema berversi + service best-effort). Store dapat di-inject untuk menguji penuh/corrupt/nonaktif tanpa browser.
- **Rekam skor tepat sekali per run** (flag pada transisi gameOver, reset saat playing). Snapshot ≤200ms cukup akurat (sim beku saat mati).
- **Perubahan mute dari tombol M ikut persist** via sinkronisasi di poll snapshot (bug tertangkap smoke: jalur M langsung ke engine melewati persist).
- **gameState awal 'menu'** agar SSR/prerender langsung menampilkan Play (engine selalu boot ke menu; subscription mengoreksi bila perlu).
- **Handle debug `window.__voidstrike` hanya saat `import.meta.dev`** untuk profiling FPS/draw calls via browser. Tidak ada logika game di dalamnya.
- **Deploy: `nuxt build` (node-server) default + `nuxt generate` statis terverifikasi** (HTTP 200, main identik). Favicon.svg orisinal ditambahkan setelah smoke menemukan 404.
- **Aset eksternal: tidak ada.** Seluruh visual prosedural + audio synth orisinal; tidak ada atribusi pihak ketiga. EngineInitError (WebGL) adalah satu-satunya fallback error; tidak dapat disimulasikan headless — gap dicatat.
- **Warning lint void-element dibiarkan** (exit 0) — lihat Tahap 5.
- **Profiling (Chromium headless, DPR 1):** menu 60,2 FPS/16 draw/388 tri; combat wave-1 60,2 FPS/29 draw/820 tri; boss 60,2 FPS/46 draw/2372 tri; 0 tekstur. Jauh dalam budget (§15.1: ~40 entity, 100 proyektil) — tanpa perubahan. Headless memakai SwiftShader; angka perangkat nyata akan lebih baik.
- **E2E organik penuh:** wave 1→2→3, boss, mati saat boss, NEW BEST 3.169, reload → best persisten, mute persist dua arah, restart 9× bersih (0 error), portrait + landscape layak.

## Tahap 5 — UI/UX, mobile dan polish (2026-10-14)

- **HUD di dalam viewport** (GameHud: skor/wave, hull/shield, boss bar, tombol pause 48px, tombol special 72px); menu habis di halaman. Overlay pause/game-over menutupi area game sesuai PRD §9.3.
- **Drag relatif, bukan follow-the-finger** (menghindari jari menutupi kapal + lompatan posisi). Piksel → world via lebar frustum/lebar canvas.
- **Audio = Web Audio synth, best-effort** (tanpa asset). Context dibuka saat gesture Play; semua method no-op aman pre-unlock (teruji node). Tembakan musuh tak dibunyikan agar mix tidak ramai.
- **Mute hidup di engine + snapshot** (tanpa event tambahan); persistensi ikut Tahap 6. Tombol M dan checkbox terverifikasi dua arah via smoke browser.
- **Ganti quality = recreate engine → kembali ke menu** (renderer tak bisa ganti DPR/antialias hidup). Tertulis eksplisit di panel Settings.
- **Shake default mati**, nonaktif paksa saat reduced-motion; dipicu hanya saat damage diterima.
- **Pause barrel: `document.hidden` → pause otomatis** (PRD §7.2). Listener dilepas saat dispose.
- **Modal menutup via Escape dan klik backdrop.** Ditemukan saat smoke (backdrop menghalangi tombol); diperbaiki + terverifikasi.
- **Warning lint `vue/html-self-closing` (void) dibiarkan** (0 error, exit 0): prettier menulis `<input />`, rule ingin `<input>`. Mengubah rule justru memecahkan 6 lokasi lain; diselaraskan saat setup prettier+eslint masih diputuskan.
- **Best score tampil "—"** hingga storage Tahap 6. Batas scope dijaga.
- **Smoke test browser:** menu, Controls, Settings, HUD (bar hull/shield, skor, tombol SP/pause), drag pointer (kapal pindah), tombol special (cooldown "7"), M + checkbox dua arah, portrait 390px layak, 0 console error. Satu anomali semu (mute tampak gagal) terbukti artefak urutan uji, bukan bug. Screenshot artefak dihapus.

## Tahap 4 — Wave, boss dan scoring (2026-10-14)

- **Kuota kill per wave (6+2×wave, max 20); transisi membersihkan sisa normal + tembakan musuh.** Mencegah akumulasi entity lintas wave; boss wave butuh boss kill (kill normal diabaikan).
- **Reward hazard (asteroid/mine 50)** karena PRD §8.10 menghitung hazard "bila berlaku"; boss 1500+100×wave.
- **Boss satu fase, dua pola** (aimed salvo 3 + fan 5). Telegraph 1,5 dtk: boss tak menembak, pemain boleh mencicil.
- **Pemain boleh menembak boss saat telegraph.** Disengaja: telegraph = boss belum agresif, bukan invulnerabilitas.
- **`restartRun` via quitToMenu→startRun** (dua transisi tervalidasi) karena tidak ada transisi playing→playing. Tombol Restart Tahap 2 yang no-op saat playing ikut sembuh.
- **Hook playtesting `?wave=N`** (opsi engine `startWave`, clamp 1–99) agar boss wave dapat diverifikasi tanpa main 10 menit. Bukan cheat (skor tetap lokal, tanpa backend).
- **Smoke test browser (?wave=3):** VOIDWARDEN masuk + bar HP + banner, pola salvo/fan terlihat (orb merah), skor jalan (31→283), mati saat boss → gameOver, Restart → run bersih (SCORE 25, boss full). 0 console error. Screenshot artefak dihapus.

## Tahap 3 — Combat, health, enemy dan pickup (2026-10-14)

- **Special weapon = homing dengan steering dibatasi** (bukan lintasan aim murni). Satu metode konsisten sesuai PRD §8.4; target diakuisisi ulang tiap tick, tanpa target → lurus.
- **Weapon charge = kurangi sisa cooldown 3 dtk** (bukan full refill). Perilaku final tunggal sesuai PRD §8.8.
- **Slot mesh musuh/pickup memuat semua varian kind sebagai anak** (toggle visibilitas). Tanpa alokasi per-frame; mesh tersembunyi di-skip renderer sehingga dalam budget MVP.
- **Semua kosmetik memakai game time** (rotasi asteroid via `spinAngle += spin*dt`, putaran pickup via `elapsed`). Tidak ada `+= konstanta` per-frame.
- **Kematian = 0,8 dtk efek (kapal disembunyikan + ring) lalu gameOver.** Simulasi dibekukan selama dying; spawn berhenti setelah game over.
- **Smoke test browser:** combat 5 dtk (proyektil + ring shield + drop hull + SPECIAL READY), Space → salvo + bar cooldown berjalan, soak 15 dtk di aliran musuh → `gameOver` + Play Again. 0 console error. Screenshot artefak dihapus.

## Tahap 2 — Kontrol dan gameplay dasar (2026-10-14)

- **Enemy Tahap 2 = perilaku scout saja** (gerak lurus, HP 2, tanpa tembakan). Interceptor/heavy + tembakan musuh masuk Tahap 3; fondasi `Enemy`/`CollisionSystem` dipakai ulang, bukan dibuang.
- **Director scout sementara di engine** (jaga 4 aktif, respawn 0,9 dtk). Dipromosikan ke `SpawnSystem`/`WaveSystem` di Tahap 4.
- **Kontak pemain–musuh menghancurkan musuh tanpa damage.** Damage + `HealthSystem` masuk Tahap 3; callback `handlePlayerContact` sudah disiapkan.
- **Pause membekukan seluruh simulasi** (starfield + bob ikut berhenti), render jalan terus. Memenuhi "pause membekukan movement/spawn/cooldown" secara ketat dan deterministik.
- **Cooldown auto-fire reset saat tidak firing.** Perilaku Prediktabel saat pause/resume.
- **Pointer/touch drag ditunda ke Tahap 5.** `InputManager` sudah netral (axis/action) dan teruji via fake target tanpa DOM.
- **Sesi Vue berbagi satu engine** via `useState` (status/gameState serializable) + instance module-level. Mutasi hanya client-side pasca-mount sehingga aman dari SSR leak.
- **Gerak diagonal dinormalisasi** (1/√2) agar kecepatan konsisten.
- **Smoke test browser menemukan alur menu → playing → paused berjalan** (tombol Play, hold-D via event, tombol P, overlay paused, 0 console error, proyektil + scout ter-render). Screenshot artefak dihapus.

## Tahap 1 — Rendering 3D dan lifecycle (2026-10-14)

- **GameLoop memakai `requestAnimationFrame`, bukan `renderer.setAnimationLoop`.** Alasan: satu pemilik loop yang jelas dan mudah diuji dengan clock/raf injeksi; XR tidak dibutuhkan MVP.
- **Fixed-step accumulator ditunda ke Tahap 2.** Alasan: Tahap 1 belum ada simulasi gameplay/collision; clamp delta 0,05 dtk cukup mencegah lompatan. Dievaluasi lagi saat `CollisionSystem` ada.
- **Pause saat tab hidden ditunda ke Tahap 2 (state machine).** Alasan: clamp delta sudah mencegah time-jump; pause semantik milik state `paused`, bukan renderer.
- **Import statis `three` di modul `game/` aman dari SSR** karena satu-satunya pintu masuk dari Vue adalah dynamic `import()` di `useGameSession` setelah `onMounted` (PRD §3.3). Test node Vitest membuktikan modul game berjalan tanpa WebGL/renderer.
- **`vite.optimizeDeps.include: ['three']`.** Alasan: rekomendasi Vite saat dev — three dimuat via dynamic import sehingga perlu pre-bundle agar tidak reload ganda.
- **Bob idle kapal nonaktif saat `prefers-reduced-motion`.** Alasan: aksesibilitas PRD §15.4.
- **`EngineInitError` dikenali via `error.name`, bukan `instanceof` lintas dynamic import.** Alasan: binding `const` di blok `try` tidak terlihat di blok `catch` (nyata: lint error); name-check sederhana dan andal.
- **Starfield menyimpan `material` di struktur layer.** Alasan: tipe `THREE.Points.material` adalah `Material | Material[]` sehingga `.dispose()` langsung gagal typecheck.
- **Method gameplay (`startRun`/`pause`/`resume`) belum dibuat.** Alasan: PRD §12 — buat modul saat benar-benar digunakan; masuk Tahap 2 bersama state machine.
- **Bug urutan konstruktor `GameEngine` tertangkap smoke test browser (2026-10-14).** `resizeToElement()` dipanggil sebelum `shipBasePosition` diinisialisasi → `TypeError: Cannot read properties of undefined (reading 'setX')`, viewport jatuh ke state error. Perbaikan: inisialisasi `shipBasePosition` sebelum resize pertama, reposisi via `.set()` setelah zona dihitung. Unit test node tidak menangkapnya karena konstruksi engine butuh WebGL — celah integration test konstruksi/dispose engine dicatat untuk Tahap 6.
- **Verifikasi visual Tahap 1 memakai Chromium headless + screenshot.** Hasil: badge LIVE RENDER, 0 console error, starfield 2 lapis dan placeholder kapal (kiri, menghadap +X, strip cyan) ter-render. Screenshot artefak dihapus dari repo.

## Tahap 0 — Skeleton (2026-10-14)

- **Scaffold manual, bukan `nuxi init` overwrite.** Alasan: repo sudah berisi `docs/`; scaffold manual menghindari menimpa dokumen. Struktur mengikuti rekomendasi PRD §12 (`app/` Nuxt 4).
- **Three.js diinstal sebagai dependency sejak Tahap 0, tapi belum diimpor.** Alasan: kunci versi lebih awal; impor aktual + engine masuk Tahap 1 agar Tahap 0 fokus SSR-safety dan build hijau.
- **`nuxt typecheck` via `vue-tsc`.** Alasan: perintah verifikasi PRD §20 memakai `nuxt typecheck`; `vue-tsc` ditambahkan sebagai devDependency.
- **Vitest environment `node`, include `tests/unit/**/*.test.ts`.** Alasan: logika murni MVP harus teruji tanpa WebGL (PRD §11.1); test browser/E2E ditunda hingga Tahap 6.
- **Deteksi WebGL di `onMounted` dengan `canvas.getContext('webgl2' ?? 'webgl')` + try/catch.** Alasan: SSR-safe, tanpa menyentuh `window`/`document` di scope modul (PRD §3.3).
- **`compatibilityDate: '2025-07-15'`** pada `nuxt.config.ts`. Alasan: tanggal kompatibel Nuxt 4 yang stabil saat scaffold.
- **Hapus dependency eksplisit `vue-router`.** Alasan: `nuxt typecheck` (vue-tsc 2.2.x + `@vue/language-core` v2) gagal memuat plugin `vue-router/volar/sfc-route-blocks` (`plugin is not a function`) saat `vue-router@4.6` dipasang eksplisit. Nuxt 4 sudah membawa vue-router sendiri; setelah `bun remove vue-router`, `bun run typecheck` exit 0.
