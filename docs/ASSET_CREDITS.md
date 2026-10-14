# ASSET_CREDITS

Seluruh model/tekstur/audio eksternal wajib dicatat sumber dan lisensinya (PRD §10.3, §16).

## Status Tahap 7

- `app/assets/3d/spaceship.glb` (±100 KB) = model pesawat pemain.
- `app/assets/3d/enemy-scout.glb` (±117 KB, 80 mesh → ±9 draw call pasca-merge).
- `app/assets/3d/enemy-interceptor.glb` (±89 KB, 69 mesh → ±11 draw call).
- `app/assets/3d/enemy-heavy.glb` (±55 KB, 65 mesh → ±9 draw call).
- `app/assets/3d/asteroid-01.glb` (±1,6 MB, ±82K tri — terberat; 60 FPS terverifikasi).
- `app/assets/3d/boss-01.glb` (±169 KB, 140 mesh → ±7 draw call pasca-merge).
  Sumber keenam file: disediakan pengguna untuk proyek ini. Lisensi pasti belum
  terverifikasi — pastikan hak pakai/redistribusi sebelum rilis publik.
- `app/assets/audio/sfx/shoot-sfx.mp3` (±27 KB) = tembakan utama.
- `app/assets/audio/sfx/explotion-scifi.mp3` (±237 KB) = ledakan musuh/boss.
- `app/assets/audio/sfx/intro-start.mp3` (±229 KB) = bunyi mulai run.
  Sumber: disediakan pengguna untuk proyek ini (catatan lisensi sama seperti GLB).
- Di-bundle Vite via `?url` (hash otomatis, ikut static export); diputar via
  HTMLAudio pool dengan fallback Web Audio synth bila gagal.
- `docs/references/spaceship-reference.png` = referensi visual saja, bukan model 3D.
- Placeholder prosedural + nebula/starfield prosedural + synth fallback adalah
  karya orisinal, tanpa atribusi pihak ketiga.
- Mine, pickup, dan proyektil tetap prosedural (tanpa file eksternal).
