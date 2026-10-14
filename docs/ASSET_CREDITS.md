# ASSET_CREDITS

Seluruh model/tekstur/audio eksternal wajib dicatat sumber dan lisensinya (PRD §10.3, §16).

## Status Tahap 7

- `app/assets/3d/spaceship.glb` (±100 KB,含 3 tekstur) = model pesawat pemain.
  Sumber: disediakan pengguna untuk proyek ini. Lisensi pasti belum terverifikasi —
  pastikan hak pakai/redistribusi sebelum rilis publik.
- `app/assets/audio/sfx/shoot-sfx.mp3` (±27 KB) = tembakan utama.
- `app/assets/audio/sfx/explotion-scifi.mp3` (±237 KB) = ledakan musuh/boss.
- `app/assets/audio/sfx/intro-start.mp3` (±229 KB) = bunyi mulai run.
  Sumber: disediakan pengguna untuk proyek ini (catatan lisensi sama seperti GLB).
- Di-bundle Vite via `?url` (hash otomatis, ikut static export); diputar via
  HTMLAudio pool dengan fallback Web Audio synth bila gagal.
- `docs/references/spaceship-reference.png` = referensi visual saja, bukan model 3D.
- Placeholder prosedural + nebula/starfield prosedural + synth fallback adalah
  karya orisinal, tanpa atribusi pihak ketiga.
- Model GLB musuh/boss (`public/assets/models/*.glb`) belum tersedia —
  placeholder tetap dipakai untuk semua entity selain pemain.
