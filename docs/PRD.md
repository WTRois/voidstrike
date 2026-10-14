# PRD — VOIDSTRIKE: STARFALL

> **Jenis dokumen:** Product Requirements Document (PRD) + instruksi implementasi untuk coding agent  
> **Status:** Siap dijadikan baseline implementasi MVP  
> **Versi:** 1.0  
> **Bahasa:** Indonesia  
> **Target:** Game web 3D sci-fi chase-cam rail shooter (ala Vendetta Online)  
> **Stack wajib:** Nuxt 4, Vue 3, TypeScript, Three.js, Bun  
> **Nama kerja:** VOIDSTRIKE: STARFALL — nama dapat diganti sebelum rilis.

---

## 0. Instruksi utama untuk coding agent

Dokumen ini menjadi sumber kebenaran produk dan implementasi. Ikuti aturan berikut sebelum membuat perubahan kode.

1. **Audit repository lebih dahulu.** Periksa struktur folder, `package.json`, versi Nuxt, konfigurasi TypeScript, linter, test runner, dan konvensi yang sudah ada. Pertahankan setup yang sehat; jangan menginisialisasi ulang atau menimpa konfigurasi tanpa alasan yang jelas.
2. **Stack tidak boleh diganti.** Aplikasi wajib menggunakan Nuxt 4, Vue 3, TypeScript, Three.js, dan Bun. Jangan migrasikan ke React, Next.js, Babylon.js, Unity, atau engine/framework lain.
3. **Game adalah client-side.** Three.js, WebGL, input perangkat, `requestAnimationFrame`, serta `localStorage` hanya boleh diakses di browser. Lindungi kode tersebut dari SSR dengan inisialisasi client-side (`onMounted`, komponen client-only, atau pola Nuxt yang setara).
4. **Gambar referensi bukan model 3D.** Lampiran gambar pesawat hanya acuan bentuk, warna, dan suasana. Jangan memperlakukan PNG/JPG sebagai mesh 3D, jangan mengklaim model GLB telah tersedia, dan jangan membuat implementasi bergantung pada keberadaan model eksternal yang belum disediakan.
5. **Sediakan fallback visual.** Game harus tetap dapat dimainkan apabila `player-ship.glb`, model musuh, tekstur, atau audio belum tersedia/gagal dimuat. Gunakan model placeholder prosedural Three.js dan fallback material yang jelas.
6. **Pisahkan engine dan UI.** Vue mengurus menu, HUD, overlay, pengaturan dan layar hasil. Modul game TypeScript mengurus scene, simulasi, input gameplay, collision, spawn, projectiles, score, health, waves, dan boss. Jangan membuat Vue reactive state diperbarui pada setiap frame.
7. **Utamakan loop gameplay yang utuh.** Prioritas: start → bermain → menembak/menghindar → menerima damage/mengambil pickup → menghadapi boss → game over → skor tersimpan → bermain ulang. Efek dekoratif tidak boleh mendahului fungsi inti ini.
8. **Kerjakan bertahap dan verifikasi.** Setelah setiap tahap, jalankan pemeriksaan yang tersedia (`typecheck`, lint, unit tests, build). Perbaiki error baru sebelum lanjut. Jangan mengaku test lolos tanpa benar-benar menjalankannya.
9. **Jangan memperluas scope diam-diam.** Multiplayer, backend akun, leaderboard global, monetisasi, sistem inventori permanen, dan fitur live operations bukan bagian MVP.
10. **Dokumentasikan asumsi.** Jika keputusan teknis kecil belum ditentukan di dokumen ini, pilih opsi paling sederhana, maintainable, dan ringan; catat keputusan yang berpengaruh di `docs/DECISIONS.md` jika proyek menggunakannya.

### Kriteria selesai setiap perubahan

- Kode sesuai pola repository dan tipe TypeScript tidak sengaja dilemahkan dengan `any`.
- Event listener, timer, observer, audio, renderer, geometry, material, dan resource lain dibersihkan saat game di-dispose.
- Tidak ada exception yang tidak tertangani jika asset gagal dimuat atau storage tidak tersedia.
- Perubahan memiliki pengujian relevan atau alasan tertulis mengapa tidak dapat diuji otomatis.
- `bun run build` berhasil sebelum dinyatakan siap rilis.

---

## 1. Ringkasan produk

### 1.1 Visi

Membangun game browser 3D sci-fi yang terasa cepat, sinematik, dan mudah dimainkan: pemain mengendalikan pesawat tempur stealth futuristis di sisi kiri layar, menghancurkan armada musuh, menghindari asteroid dan proyektil, menjaga hull serta energy shield, dan bertahan menghadapi wave musuh serta boss berkala. Pengalaman harus bisa dimulai tanpa login, dimainkan dengan keyboard maupun sentuhan, dan diulang dengan cepat.

### 1.2 Konsep inti

- Genre: **3D chase-cam rail shooter dengan endless progression** (Tahap 8:
  kamera di belakang kapal ala Vendetta Online; sebelumnya side-view).
- Inspirasi gameplay: ritme sederhana ala game shooter side-scrolling klasik seperti Space Impact, diperluas dengan kedalaman 3D, health/shield, senjata utama otomatis, senjata khusus manual, pickup, wave, dan boss.
- Sudut pandang: **chase-cam mengikuti kapal dari belakang/atas**. Objek berupa model 3D, permainan bergerak di bidang layar (X/Y) sambil dunia mengalir ke arah kamera (terbang maju).
- Pesawat pemain: desain terinspirasi referensi pengguna — siluet stealth tajam, hull hitam/abu-abu metalik, panel mekanis kompleks, aksen cahaya cyan/biru dingin. Terlihat dari belakang (mesin) saat bermain.
- Mode: single-player, satu sesi berjalan di browser.
- Penyimpanan: best score, top scores lokal, statistik sesi, dan preferensi disimpan di browser.
- Orientasi tampilan: landscape disarankan di ponsel; desktop tetap didukung. Jangan memblokir permainan hanya karena perangkat portrait.

### 1.3 Tujuan produk

1. Pengguna dapat memulai bermain tanpa registrasi dan tanpa menunggu backend.
2. Kontrol terasa responsif; menghindar, menembak, dan menggunakan senjata khusus mudah dipahami.
3. Health/shield memberi feedback jelas sehingga damage terasa bermakna.
4. Kombinasi musuh, asteroid, pickup, dan boss menjaga variasi sesi.
5. Game tetap berjalan dengan placeholder asset dan pada perangkat yang tidak memiliki GPU kelas atas.
6. Kode game modular dan bisa dikembangkan coding agent tanpa menjadikan satu file sebagai monolit.

### 1.4 Bukan tujuan MVP

- Multiplayer real-time, PvP, co-op, matchmaking atau lobby online.
- Leaderboard lintas pengguna/server.
- Login, akun, backend Go, PostgreSQL, Redis, pembayaran, iklan, atau telemetry pihak ketiga.
- Open world 3D, simulasi penerbangan realistis, flight stick, atau fisika aerodinamika.
- Editor level, campaign bercabang, crafting, skill tree kompleks, atau inventory persisten.
- Dukungan VR/AR.

---

## 2. Target pengguna dan pengalaman

### 2.1 Target pengguna

- Pemain kasual yang menyukai arcade shooter sci-fi.
- Pengguna desktop/laptop dan ponsel modern yang menjalankan browser WebGL.
- Pengguna yang ingin bermain singkat tanpa membuat akun.

### 2.2 Prinsip pengalaman

- **Mulai cepat:** satu klik/tap untuk memulai.
- **Readable combat:** proyektil pemain, proyektil musuh, pickup, hazard, boss, dan indikator health harus berbeda secara visual.
- **Feedback instan:** saat terkena damage, shield pecah, musuh hancur, pickup diambil, atau boss dikalahkan, tampilkan efek visual/audio ringan dan feedback HUD.
- **Fairness:** telegraph serangan boss dan pola proyektil harus memberi waktu bereaksi; hindari spawn tepat di atas pesawat.
- **Retry cepat:** setelah game over, tombol main lagi langsung memulai sesi baru.
- **Tidak bergantung asset premium:** semua alur gameplay harus tetap berjalan dalam mode fallback.

---

## 3. Platform, teknologi, dan batasan

### 3.1 Stack wajib

| Lapisan                 | Teknologi                                                                                                         | Tanggung jawab                                                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Framework web           | Nuxt 4 + Vue 3                                                                                                    | Routing, app shell, menu, HUD, overlay, halaman informasi     |
| Bahasa                  | TypeScript strict                                                                                                 | Kontrak tipe untuk UI dan modul gameplay                      |
| 3D rendering            | Three.js                                                                                                          | Scene graph, camera, meshes, lights, materials, asset loading |
| Package manager/runtime | Bun                                                                                                               | Install dependency, scripts, development, test, build         |
| Physics                 | Collision arcade buatan sendiri untuk MVP; Rapier opsional di tahap berikutnya                                    | Hitbox dan interaksi gameplay sederhana                       |
| Asset 3D                | Blender sebagai authoring tool, ekspor GLB/GLTF                                                                   | Pesawat, musuh, boss, objek lingkungan                        |
| Persistensi MVP         | `localStorage` melalui storage service tervalidasi                                                                | Skor lokal, preferensi, statistik ringkas                     |
| Hosting                 | Static hosting yang mendukung hasil build Nuxt; Cloudflare Pages dapat digunakan setelah validasi mode deployment | Distribusi aplikasi dan asset                                 |

### 3.2 Kebijakan dependency

- Jangan menambahkan library besar tanpa kebutuhan konkret.
- Untuk MVP, implementasikan collision arcade sederhana dengan bentuk hitbox eksplisit; hindari memasang physics engine penuh bila tidak ada kebutuhan rigid body.
- Jika gameplay berikutnya membutuhkan rigid body, gravitasi, atau collision kompleks, evaluasi Rapier secara terpisah. Jangan memasukkannya otomatis ke MVP.
- Jika repository telah menggunakan Vitest atau Playwright, pertahankan konfigurasi tersebut. Jika belum ada, gunakan Vitest untuk logika murni dan Playwright untuk smoke test UI bila lingkungan mendukung.
- Jangan menambahkan global state library hanya untuk mengelola state game per-frame. `useState`/composable Nuxt cukup untuk state UI seperti menu, pause, dan hasil.

### 3.3 Rendering dan SSR

- Komponen yang membuat `THREE.WebGLRenderer` harus berjalan client-side saja.
- Inisialisasi renderer dan scene setelah elemen canvas tersedia di browser.
- Jangan mengakses `window`, `document`, `navigator`, `localStorage`, `ResizeObserver`, atau WebGL dari scope modul yang dievaluasi saat SSR.
- Gunakan lazy/dynamic import Three.js jika diperlukan untuk memastikan kode tidak dieksekusi dalam proses SSR.
- Pastikan halaman tetap menampilkan loading/fallback UI jika WebGL tidak tersedia atau inisialisasi gagal; tampilkan pesan yang dapat dimengerti, bukan stack trace.

---

## 4. Scope fitur

### 4.1 Wajib untuk polished MVP

**Game core**

- State machine: boot, loading, menu, playing, paused, game over.
- Scene 3D chase-cam yang responsif.
- Pesawat pemain berbasis GLB jika asset telah disediakan; placeholder 3D jika belum.
- Gerakan pemain horizontal/vertikal dalam batas area bermain.
- Primary weapon auto-fire.
- Special weapon manual dengan cooldown dan feedback cooldown.
- Sistem hull HP dan energy shield.
- Collision dan damage feedback dengan invulnerability window singkat setelah terkena hit.
- Minimal 3 kategori musuh: scout, interceptor, heavy.
- Minimal 2 kategori hazard: asteroid dan puing/energy mine sederhana.
- Proyektil musuh dengan pola yang terbaca.
- Pickup repair hull, shield recharge, dan special weapon recharge atau pengurangan cooldown.
- Wave progression dan satu archetype boss yang muncul setiap tiga wave.
- Score, wave counter, boss health bar, game over, restart.
- Difficulty scaling bertahap.

**UX dan aksesibilitas**

- Main menu dengan tombol Play, Controls, Settings, dan Best Score.
- HUD health, shield, score, wave, special weapon cooldown, dan status boss saat relevan.
- Pause/resume menggunakan Escape atau P.
- Mute audio dan preferensi kualitas grafis.
- Kontrol desktop dan mobile.
- Petunjuk kontrol sebelum permainan.
- Layout yang berfungsi di viewport sempit; minimalkan teks yang menutupi area bermain.

**Persistensi**

- Best score dan top 10 sesi terbaik lokal.
- Preferensi mute dan kualitas grafis.
- Validasi tipe/rentang data saat membaca storage.
- Fallback aman jika storage dinonaktifkan/penuh/menimbulkan exception.

**Polish**

- Background starfield/parallax.
- Efek muzzle flash, projectile trail sederhana, ledakan, hit flash, shield impact, dan pickup glow.
- Sound effect dasar dengan fallback jika audio gagal dimuat.
- State loading/error asset yang jelas.
- Cleanup resource pada restart, pergantian state, dan unmount komponen.

### 4.2 Opsional bila tidak mengganggu jadwal MVP

- Web Audio synthesizer ringan untuk efek dasar jika asset audio final belum tersedia.
- Toggle camera shake (default rendah atau nonaktif untuk mengurangi motion sickness).
- Pilihan kualitas visual Low/High.
- Tutorial singkat yang dapat dilewati.
- Statistik sesi tambahan: durasi, musuh dihancurkan, boss dikalahkan.

### 4.3 Di luar MVP

- Akun pengguna, backend, leaderboard global dan anti-cheat server-side.
- Multiplayer, cloud save, achievements online.
- Banyak pesawat playable dengan atribut berbeda.
- Upgrade tree permanen, shop, rarity loot, crafting.
- Campaign/story mode berlevel tetap.
- Boss dengan banyak fase kompleks atau banyak archetype boss.
- PWA/offline installation, kecuali diminta sebagai scope terpisah.
- Analytics eksternal, iklan, pembayaran, monetisasi.

---

## 5. Gameplay loop

1. **Boot/load:** validasi WebGL, siapkan renderer, load asset yang tersedia, dan siapkan fallback.
2. **Menu:** pengguna melihat judul, best score, kontrol, pengaturan, lalu memilih Play.
3. **Start run:** reset health/shield, score, cooldown, wave, spawn timers, enemy/projectile/pickup pools dan boss state.
4. **Combat:** pesawat bergerak di bidang layar, primary weapon menembak otomatis ke depan, musuh/hazard mendekat dari depan, pemain menghindar, dan special weapon digunakan pada momen tepat.
5. **Damage/recovery:** shield menyerap damage lebih dahulu, hull menjadi pertahanan terakhir, pickups membantu bertahan.
6. **Wave transition:** setelah jumlah unit wave selesai dan area ancaman dibersihkan, wave berikutnya dimulai. Pada wave 3, 6, 9, dan seterusnya, boss muncul.
7. **Boss encounter:** boss masuk dengan telegraph, memakai pola serangan, memiliki health bar, dan memberi bonus score ketika dikalahkan.
8. **Difficulty scaling:** wave dan boss berikutnya meningkatkan tekanan secara bertahap, tetapi tetap dibatasi agar tidak menghasilkan spam proyektil.
9. **Game over:** hull mencapai nol, simulasi berhenti, skor final dan statistik diperlihatkan.
10. **Persist score:** simpan jika termasuk top 10 lokal; tampilkan best score baru bila tercapai.
11. **Retry:** mulai sesi baru tanpa reload halaman penuh.

### 5.1 Target durasi

- Sesi awal yang bertahan beberapa wave: sekitar 3–8 menit bagi pemain pemula.
- Tidak ada kondisi kemenangan final pada mode endless; mengalahkan boss akan membuka wave berikutnya.
- Jika pengguna kalah, kembali bermain harus membutuhkan maksimal satu tindakan utama.

---

## 6. Kamera, dunia, dan koordinat game

### 6.1 Tampilan (chase-cam, Tahap 8 — menggantikan side-view)

- Gunakan kamera chase yang mengikuti kapal dari belakang/atas. **Tetap
  `PerspectiveCamera`**, kini menatap ke depan (−Z, masuk layar).
- Objek tetap berupa mesh 3D dengan pencahayaan, material metalik, glow/emissive, dan perbedaan kedalaman penuh.
- Kamera mengikuti posisi kapal dengan faktor < 1 (0,5 horizontal; vertikal
  di sekitar tinggi dasar) agar kapal selalu dalam bingkai dengan margin;
  bounds gameplay tetap kotak tetap pada bidang kapal (z=0).
- Sumbu `+X` berarti ke kanan layar; sumbu `+Y` ke atas layar; sumbu `−Z`
  berarti jauh ke depan (musuh datang dari depan, terbang ke arah kamera).
- Pesawat menghadap ke `−Z` (masuk layar, mesin terlihat). Model GLB yang
  berhidung +Z diputar 180° via wrapper `THREE.Group`; musuh berhidung +Y
  memakai pitch +90° agar menghadap kamera (+Z).
- Zona gerak pemain: seluruh layar dikurangi margin (bukan pita kiri).

### 6.2 Responsivitas dunia

- Tentukan world bounds dari frustum kamera pada bidang kapal (z=0).
- Jaga zona gerak pemain di seluruh layar dengan margin dalam yang cukup untuk menghindari serangan.
- Spawn musuh jauh di depan (z negatif) dalam koridor bidang kapal agar selalu terjadi perjumpaan; musuh cerdas melengkung (converge) ke arah kapal — nuansa dogfight.
- Spawn hazard, pickup, dan proyektil dengan margin yang cukup agar tidak tertutup HUD.
- Entity yang melewati kamera dibuang (cullZ); tembakan pemain dibuang di kedalaman killZ.
- Pada landscape mobile, pertahankan arena selebar mungkin. Pada portrait, skala kamera/arena dan zona pemain disesuaikan; jangan membuat hitbox berubah relatif terhadap visual secara ekstrem.

### 6.3 Latar belakang

- Minimal 2 lapis starfield/parallax dengan kecepatan berbeda.
- Nebula/planet dekoratif boleh ditambahkan dengan geometri atau tekstur ringan; jangan mengambil perhatian dari proyektil.
- Background tidak boleh memakai asset eksternal yang tidak tersedia tanpa fallback.

---

## 7. Kontrol

### 7.1 Desktop

| Input              | Aksi                                                    |
| ------------------ | ------------------------------------------------------- |
| `W` / `ArrowUp`    | Bergerak ke atas                                        |
| `S` / `ArrowDown`  | Bergerak ke bawah                                       |
| `A` / `ArrowLeft`  | Bergerak ke kiri dalam batas zona pemain                |
| `D` / `ArrowRight` | Bergerak ke kanan dalam batas zona pemain               |
| Primary fire       | Otomatis selama sesi berjalan                           |
| `Space`            | Menembakkan special weapon jika cooldown selesai        |
| `Escape` atau `P`  | Pause/resume                                            |
| `Enter`            | Start dari menu atau restart dari game over bila sesuai |
| `M`                | Toggle mute jika tidak sedang mengetik di input form    |

- Tahan input per frame melalui `InputManager`; hindari mengandalkan event `keydown` berulang untuk menggerakkan objek.
- Panggil `preventDefault()` hanya untuk key yang memang dipakai game dan hanya saat area game aktif, agar halaman tidak ikut scroll.

### 7.2 Mobile/touch

- Drag/follow touch di canvas untuk menggerakkan pesawat pada area yang diizinkan.
- Tambahkan tombol special weapon besar dan mudah disentuh di area kanan bawah, dengan cooldown ring/bar yang jelas.
- Tambahkan tombol pause yang tidak tertutup kontrol OS/browser.
- Target area sentuh utama minimal sekitar 44 × 44 CSS pixel.
- Gunakan Pointer Events agar mouse, pen, dan touch berbagi jalur input.
- Gunakan `touch-action: none` hanya pada area canvas/gameplay yang membutuhkannya, bukan seluruh halaman tanpa pertimbangan.
- Saat tab tersembunyi atau halaman kehilangan visibility, pause atau freeze simulasi secara aman; jangan biarkan simulasi meloncat saat pengguna kembali.

---

## 8. Mekanisme gameplay

Angka pada bagian ini adalah baseline balancing awal, bukan konstanta yang boleh tersebar di banyak file. Letakkan di `game/config/gameBalance.ts` dan sesuaikan melalui playtesting.

### 8.1 Pesawat pemain

- Memiliki `hull` dan `shield`, masing-masing maksimum 100.
- Nilai awal: hull 100, shield 100.
- Gerakan responsif dengan acceleration rendah atau kontrol langsung yang halus; hindari inertia berlebihan.
- Pesawat tidak boleh keluar arena.
- Setelah terkena serangan, aktifkan invulnerability window sekitar 0,75 detik, disertai blink/flash visual supaya satu burst tidak menghabiskan seluruh health dalam satu frame.
- Ketika hull mencapai 0, masuk `gameOver` setelah efek destruction singkat, bukan setelah simulasi melanjutkan permainan.

### 8.2 Damage dan regenerasi

- Damage selalu masuk ke shield terlebih dahulu. Jika shield tidak cukup, sisa damage diteruskan ke hull.
- Shield tidak boleh bernilai negatif. Hull tidak boleh bernilai negatif.
- Shield mulai regenerasi setelah 5 detik tanpa menerima damage, dengan baseline 12 poin/detik hingga maksimum 100.
- Hull **tidak** beregenerasi otomatis.
- Pickup hull memperbaiki maksimum 25 hull; pickup shield memulihkan maksimum 35 shield.
- Shield impact harus memiliki efek audio/visual berbeda dari hit hull.
- Jika invulnerability window aktif, damage baru ditolak kecuali perilaku serangan tertentu secara eksplisit didesain sebagai damage berkelanjutan di masa depan.

### 8.3 Primary weapon — auto-fire

- Menembak otomatis ke arah `−Z` (masuk layar) saat state `playing`.
- Baseline cooldown: 0,22 detik per shot.
- Projectile punya lifetime dan batas aktif; projectile yang lewat layar dibuang kembali ke pool.
- Hit enemy menyebabkan damage dan hit feedback.
- Primary weapon tidak boleh menembak saat pause, game over, atau menu.
- Tambahkan muzzle flash kecil; jangan membuat efek glow mahal pada setiap shot.

### 8.4 Special weapon — manual

- Tombol desktop: `Space`. Tombol mobile: tombol khusus di HUD.
- Baseline cooldown: 8 detik. UI menampilkan sisa cooldown secara jelas.
- Aksi: meluncurkan salvo 3 misil/energi ke depan dengan sedikit sebaran vertikal. Misil mengikuti arah target musuh terdekat dengan steering yang dibatasi, atau menggunakan lintasan menuju target saat ditembak bila homing dinilai terlalu kompleks. Pilih dan implementasikan satu metode konsisten.
- Special weapon memberi damage lebih tinggi daripada primary shot dan bisa melukai boss.
- Ketika cooldown aktif, input ditolak dan UI memberi feedback singkat; jangan menggunakan dialog modal.
- Cooldown di-reset saat sesi baru dimulai.
- Pickup special recharge mengurangi cooldown tersisa, misalnya 3 detik, tanpa membuat cooldown negatif.

### 8.5 Musuh

Minimal tiga archetype MVP. Masing-masing punya hit points, skor, kecepatan
mendekat (+Z ke arah kamera), warna/siluet pembeda, pola gerak, dan batas spawn.

| Archetype   | Perilaku                                                            |                 Baseline HP |    Nilai skor awal |
| ----------- | ------------------------------------------------------------------- | --------------------------: | -----------------: |
| Scout       | Cepat, mendekat lurus ke arah kamera                                |                           2 |                100 |
| Interceptor | Bergerak dengan pola vertikal ringan; dapat menembak sesekali       |                           4 |                200 |
| Heavy       | Lambat, HP lebih tinggi, peluru lebih jarang tetapi lebih berbahaya |                          10 |                400 |
| Boss        | Hover di depan kapal, memiliki health bar dan pola serangan         | Konfigurasi khusus per fase | 1.500 + bonus wave |

Angka damage projectile dan HP musuh harus tersentralisasi dalam konfigurasi. Difficulty scaling tidak boleh membuat seluruh musuh mendapat HP/kecepatan tak terbatas.

### 8.6 Hazard

- **Asteroid:** muncul jauh di depan dan mendekat ke kamera, dapat dihancurkan atau dihindari sesuai nilai HP yang dikonfigurasi.
- **Debris/energy mine:** hazard dengan siluet/indikator berbeda; bergerak lambat ke arah kamera.
- Semua hazard mempunyai hitbox yang sesuai dengan siluet visual dan dapat memberi damage ke pemain.
- Hindari spawn tepat di posisi pemain. Beri jarak reaksi minimum dan batas jumlah hazard serentak.

### 8.7 Proyektil musuh

- Minimal satu pola aimed shot yang diarahkan pada posisi pemain ketika ditembak.
- Proyektil memiliki warna, ukuran, dan trail yang jelas berbeda dari peluru pemain.
- Batasi jumlah proyektil aktif dan laju tembak musuh.
- Jangan terus-menerus membidik posisi pemain setiap frame; hitung arah saat ditembak, kecuali pola homing diumumkan dengan jelas sebagai mekanik khusus.
- Saat pause/game over, update dan collision proyektil berhenti.

### 8.8 Pickup

Minimal tiga jenis:

- **Hull repair:** memulihkan hingga 25 HP hull.
- **Shield cell:** memulihkan hingga 35 shield.
- **Weapon charge:** mengurangi special cooldown sebesar 3 detik atau langsung mengisi penuh jika kebijakan balancing dipilih; tetapkan satu perilaku final di `gameBalance.ts`.

Pickup harus tampil berbeda dan kontras dengan background. Pickup yang sudah diambil dihapus/dikembalikan ke pool dan tidak boleh diambil dua kali.

### 8.9 Wave dan boss

- Wave bernomor naik tanpa batas secara konseptual, tetapi difficulty dibatasi dengan kurva dan batas maksimum.
- Wave biasa memunculkan kombinasi musuh/hazard dalam kelompok kecil; hindari spawn berlebihan pada layar kecil.
- Boss muncul pada akhir setiap wave ketiga: wave 3, 6, 9, dan seterusnya.
- Boss muncul setelah telegraph singkat, hover di depan kapal, mempunyai health bar di UI, dan minimal dua pola serangan sederhana (misalnya aimed salvo dan spread pattern).
- Setelah boss kalah: beri bonus skor, efek destruction yang jelas, pickup dengan probabilitas konfigurasi, lalu mulai wave selanjutnya.
- Wave transition tidak boleh dimulai saat masih ada boss aktif.
- Pada kematian pemain, hentikan spawn dan simulasi gameplay segera; jalankan hanya animasi game-over singkat jika diperlukan.

### 8.10 Skor dan difficulty scaling

- Skor survival baseline: 10 poin per detik selama bermain.
- Poin tambahan diperoleh dari musuh, hazard yang dihancurkan bila berlaku, pickup (opsional), dan boss.
- Skor dibulatkan menjadi integer saat ditampilkan/disimpan.
- Meningkatkan difficulty melalui satu atau lebih faktor terkontrol: interval spawn turun, kecepatan bergerak naik, dan komposisi musuh meningkat.
- Gunakan cap supaya interval spawn, kecepatan, jumlah projectile, dan health musuh tidak menjadi tidak masuk akal.
- Kurva awal yang disarankan: spawn interval mulai sekitar 1,1 detik dan turun bertahap hingga minimum 0,45 detik; sesuaikan setelah uji gameplay.
- Hindari random spawn yang mustahil dihindari: setiap pola harus lolos pemeriksaan jarak, telegraph, dan safe corridor sederhana.

---

## 9. UI/UX dan visual direction

### 9.1 Art direction

- Tema: sci-fi militer/stealth, ruang angkasa dingin, material metal hitam dan abu-abu, aksen cyan/biru energi.
- Pesawat pemain mengacu pada gambar referensi: badan rendah dan tajam, hidung runcing, sayap/pod mekanis, panel armor bertumpuk, mesin belakang, aksen cahaya terbatas.
- Jangan berusaha menyalin setiap detail visual dari satu gambar sebagai geometri kompleks pada tahap awal. Utamakan siluet dari kamera chase dan keterbacaan saat objek kecil.
- UI memakai panel gelap semi-transparan, tipografi sans-serif yang jelas, indikator energi cyan, damage/hazard berwarna hangat, serta kontras tinggi.
- Efek partikel/glow harus hemat dan tidak mengaburkan bullet/hazard.

### 9.2 Layar

1. **Loading:** indikator progress atau label “Menyiapkan sistem”; tampilkan fallback jika asset gagal.
2. **Main menu:** judul, tombol Play, Controls, Settings, best score, visual pesawat/background.
3. **Gameplay HUD:** score, wave, hull bar, shield bar, special cooldown, pause.
4. **Boss HUD:** boss health bar dan nama/label boss, hanya saat boss aktif.
5. **Pause overlay:** Resume, Restart, Settings, Back to Menu.
6. **Game-over overlay:** final score, best score, wave tercapai, durasi, musuh dihancurkan, tombol Play Again dan Menu.
7. **Settings:** mute audio, kualitas grafik, camera shake bila disediakan.
8. **Controls help:** kontrol desktop dan mobile serta keterangan auto-fire/special weapon.

### 9.3 Prinsip HUD

- Health dan shield tidak hanya dibedakan dengan warna; beri label dan/atau ikon.
- Angka score/wave mudah dibaca pada layar kecil.
- Cooldown special dapat dipahami tanpa membuka menu.
- Jangan membiarkan overlay menu muncul di atas canvas saat sesi sedang berjalan kecuali pause/game over memang aktif.
- Gunakan semantik HTML yang sesuai, label tombol jelas, fokus keyboard terlihat, dan jangan menjadikan canvas satu-satunya cara memahami status game.
- Hormati `prefers-reduced-motion` untuk mengurangi shake dan efek gerak tambahan.

---

## 10. Asset pipeline dan spesifikasi model

### 10.1 Status asset saat ini

| Asset                    | Status                          | Penanganan MVP                                                                                            |
| ------------------------ | ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Gambar referensi pesawat | Ada sebagai lampiran percakapan | Visual reference saja; simpan ke `docs/references/spaceship-reference.png` saat memindahkan ke repository |
| Model GLB pesawat pemain | **Belum tersedia**              | Buat placeholder mesh prosedural; loader siap menerima GLB di masa depan                                  |
| Model GLB musuh          | Belum tersedia                  | Placeholder 3D dengan siluet/material berbeda                                                             |
| Model boss               | Belum tersedia                  | Placeholder dengan skala dan siluet besar                                                                 |
| Tekstur/PBR              | Belum tersedia                  | Material procedural atau warna/material sederhana                                                         |
| Audio                    | Belum tersedia                  | Audio opsional, sediakan fallback senyap atau Web Audio ringan                                            |

**Dilarang menganggap gambar referensi otomatis menjadi GLB.** Pembuatan model custom di Blender atau pengadaan model 3D berlisensi adalah pekerjaan asset terpisah. MVP harus bisa dimainkan sebelum model final selesai.

### 10.2 Fallback placeholder pesawat

Buat `createPlaceholderPlayerShip()` yang mengembalikan `THREE.Group` dengan beberapa bentuk geometris yang disusun sebagai satu siluet pesawat futuristis:

- badan pusat memanjang dan runcing ke kanan;
- sayap/pod samping berbentuk panel miring;
- dua bagian mesin di belakang dengan emissive cyan;
- detail panel seperlunya, tanpa terlalu banyak objek draw-call;
- material utama charcoal/metal grey dan aksen cyan;
- orientasi akhir menghadap `+X`.

Placeholder harus terlihat sengaja didesain, bukan hanya satu kubus. Simpan implementasi di modul asset/factory; jangan menulis seluruh geometri di file halaman Vue.

### 10.3 Kontrak GLB/GLTF

Nama/path yang disarankan:

- `public/assets/models/player-ship.glb`
- `public/assets/models/enemy-scout.glb`
- `public/assets/models/enemy-interceptor.glb`
- `public/assets/models/enemy-heavy.glb`
- `public/assets/models/boss-01.glb`
- `public/assets/models/asteroid-01.glb`

Kontrak asset:

- GLB harus dapat dimuat oleh `GLTFLoader`.
- Tetapkan skala normalisasi sehingga bounding box model dapat dipetakan ke ukuran gameplay.
- Pastikan orientasi forward diketahui; adapter asset boleh menerapkan rotasi pada wrapper group.
- Pisahkan transform visual dari posisi gameplay/hitbox agar ukuran visual tidak menentukan collision secara tidak sengaja.
- Siapkan file manifest/konfigurasi yang menyatakan path, skala, orientasi, serta status asset.
- Asset load gagal harus menghasilkan warning yang aman dan memakai fallback, bukan menghentikan game.
- Jangan mengasumsikan Draco/KTX2/Meshopt tersedia sebelum konfigurasi loader dan pipeline build benar-benar ditambahkan.
- Semua model/tekstur/audio eksternal harus punya lisensi penggunaan yang sesuai; simpan sumber dan atribusi di `docs/ASSET_CREDITS.md`.

### 10.4 Optimasi asset

- Utamakan low/mid-poly mesh yang terbaca dari ukuran kecil.
- Batasi material unik dan draw calls; gabungkan bagian statis bila masuk akal.
- Gunakan texture atlases bila manfaatnya jelas.
- Kompres model/tekstur hanya dengan pipeline yang telah diuji pada target deployment.
- Jangan gunakan tekstur resolusi besar atau shadow maps dinamis tanpa mengukur manfaatnya.
- Efek glow MVP menggunakan emissive material dan geometri sederhana; post-processing bloom bukan persyaratan awal.

---

## 11. Arsitektur aplikasi

### 11.1 Prinsip arsitektur

- **Nuxt/Vue = application shell dan UI.**
- **Game core TypeScript = simulasi dan gameplay.**
- **Three.js = rendering/scene graph.**
- **Storage service = validasi dan persistensi lokal.**
- Data yang berubah per frame tetap internal di engine; Vue hanya menerima snapshot ringkas pada interval tertentu atau ketika event penting terjadi.
- Modul game harus dapat diuji sebisa mungkin tanpa membuat WebGL renderer.

### 11.2 Alur dependency

```text
Nuxt page / Vue components
        |
        v
GameSession adapter (start/pause/resume/restart/dispose)
        |
        v
Game Engine / Game State Machine
   |        |          |            |
   v        v          v            v
Input    Systems     Asset       Event/Snapshot
Manager  & Entities  Manager         |
   |        |          |             v
   |        v          |       Vue HUD / Overlays
   |    Game Rules     |
   |        |          |
   v        v          v
          Three.js Scene / Renderer
                    |
                    v
              WebGL Canvas
```

### 11.3 Game state machine

State minimal:

- `boot`: aplikasi memeriksa kemampuan browser dan menyiapkan game.
- `loading`: asset yang tersedia dimuat dan fallback dibuat.
- `menu`: tidak ada simulasi gameplay aktif.
- `playing`: world simulation, spawn, input, projectile, damage dan score aktif.
- `paused`: tidak ada pergerakan gameplay atau cooldown berjalan; UI pause tetap aktif.
- `gameOver`: simulasi gameplay berhenti, hasil tersedia, skor dapat disimpan.
- `error`: hanya bila engine tidak dapat berjalan, misalnya WebGL tidak tersedia; sediakan pesan dan tombol kembali bila memungkinkan.

Aturan:

- Transisi harus eksplisit dan divalidasi; hindari boolean yang saling bertentangan seperti `isPlaying`, `isPaused`, `isDead` pada banyak modul.
- `startRun()` hanya memulai sesi baru dan me-reset semua state sesi.
- `pause()` dan `resume()` tidak mereset score/health.
- `restartRun()` membersihkan semua entity lama sebelum menginisialisasi run baru.
- `dispose()` menghentikan loop, melepas listener, observer, WebGL renderer, audio nodes dan resource yang dimiliki engine.

### 11.4 Game loop dan waktu

- Gunakan `renderer.setAnimationLoop()` atau `requestAnimationFrame()` dengan satu pemilik loop yang jelas.
- Hitung delta time, batasi delta maksimum (misalnya 0,05 detik) untuk mencegah lompatan besar setelah tab lag.
- Bila perlu untuk kestabilan collision, gunakan simulation step tetap sekitar 1/60 detik dengan accumulator dan batas jumlah substep per frame; rendering tetap boleh mengikuti refresh rate.
- Pause simulasi saat tab tidak terlihat agar karakter tidak langsung terkena banyak damage ketika pengguna kembali.
- Jangan memakai `setInterval()` sebagai clock utama game.
- Semua waktu cooldown, shield regeneration, movement dan spawn harus menggunakan game time delta, bukan jumlah frame.

### 11.5 Collision

- MVP memakai hitbox arcade sederhana: bola 3D (jarak Euclidean + jumlah radius) karena gameplay chase-cam bergerak di ruang XYZ.
- Pisahkan `visual transform` dari `collision bounds`.
- Hitbox pemain dibuat sedikit lebih kecil daripada siluet model agar terasa adil.
- Semua entity yang collision-capable harus mengimplementasikan kontrak sejenis: posisi, radius/bounds, team/category, damage/health bila relevan, status aktif.
- Hindari menghitung collision untuk entity yang tidak aktif atau sudah keluar layar.
- Uji collision pada posisi batas viewport dan skenario beberapa projectile pada frame yang sama.

---

## 12. Struktur direktori yang direkomendasikan

Gunakan struktur ini jika repository belum mempunyai konvensi yang lebih baik. Jika folder berbeda karena template Nuxt 4 yang digunakan, sesuaikan tanpa mengubah pemisahan tanggung jawab.

```text
.
├── app/
│   ├── assets/
│   │   └── css/
│   │       └── main.css
│   ├── components/
│   │   └── game/
│   │       ├── GameViewport.vue
│   │       ├── GameHud.vue
│   │       ├── MainMenu.vue
│   │       ├── PauseOverlay.vue
│   │       ├── GameOverOverlay.vue
│   │       ├── SettingsPanel.vue
│   │       └── ControlsHelp.vue
│   ├── composables/
│   │   └── useGameSession.ts
│   ├── pages/
│   │   └── index.vue
│   └── app.vue
├── game/
│   ├── core/
│   │   ├── GameEngine.ts
│   │   ├── GameStateMachine.ts
│   │   ├── GameLoop.ts
│   │   ├── SceneFactory.ts
│   │   └── CameraController.ts
│   ├── config/
│   │   ├── gameBalance.ts
│   │   └── assetManifest.ts
│   ├── input/
│   │   └── InputManager.ts
│   ├── entities/
│   │   ├── PlayerShip.ts
│   │   ├── Enemy.ts
│   │   ├── Boss.ts
│   │   ├── Projectile.ts
│   │   ├── Hazard.ts
│   │   └── Pickup.ts
│   ├── systems/
│   │   ├── SpawnSystem.ts
│   │   ├── CollisionSystem.ts
│   │   ├── CombatSystem.ts
│   │   ├── HealthSystem.ts
│   │   ├── WaveSystem.ts
│   │   ├── ScoreSystem.ts
│   │   └── DifficultySystem.ts
│   ├── assets/
│   │   ├── AssetManager.ts
│   │   ├── createPlaceholderPlayerShip.ts
│   │   └── createPlaceholderEntities.ts
│   ├── effects/
│   │   ├── EffectPool.ts
│   │   └── AudioManager.ts
│   ├── storage/
│   │   ├── localProfile.ts
│   │   └── storageSchema.ts
│   ├── types/
│   │   └── game.ts
│   └── utils/
│       ├── random.ts
│       └── bounds.ts
├── public/
│   └── assets/
│       ├── models/
│       ├── textures/
│       └── audio/
├── tests/
│   ├── unit/
│   └── e2e/
├── docs/
│   ├── ASSET_CREDITS.md
│   └── DECISIONS.md
├── nuxt.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

**Jangan membuat semua file kosong sekaligus.** Buat modul saat benar-benar digunakan agar struktur tidak menjadi boilerplate tanpa fungsi. Untuk MVP, `GameEngine`, state machine, `PlayerShip`, `Projectile`, `Enemy`, `Boss`, `CollisionSystem`, `CombatSystem`, `HealthSystem`, `WaveSystem`, `ScoreSystem`, `AssetManager`, `InputManager` dan storage service adalah unit tanggung jawab utama.

---

## 13. Kontrak modul dan event

### 13.1 `GameEngine`

Tanggung jawab:

- Inisialisasi scene, camera, renderer, lighting, background, entity systems.
- Mengatur loop dan urutan update.
- Menyediakan method `startRun()`, `pause()`, `resume()`, `restartRun()`, `getSnapshot()`, dan `dispose()`.
- Menerbitkan event semantik seperti `healthChanged`, `scoreChanged`, `waveChanged`, `bossSpawned`, `bossDefeated`, `runEnded`, `assetFallbackUsed`.
- Tidak mengambil alih tampilan menu Vue.

### 13.2 `InputManager`

- Mengubah keyboard/touch/pointer menjadi input netral perangkat, misalnya axis X/Y dan aksi `special`, `pause`.
- Tidak mengubah DOM HUD.
- Mendukung clear semua input saat blur, pause, atau tab menjadi hidden.
- Melepas semua listener pada `dispose()`.

### 13.3 `HealthSystem` / `CombatSystem`

- Mengatur urutan damage shield → hull, invulnerability, pickup, fire cooldown, hit resolution, enemy death.
- Fungsi perhitungan murni sedapat mungkin, agar dapat diuji dengan unit tests.
- Tidak bergantung pada Vue atau DOM.

### 13.4 `WaveSystem` / `SpawnSystem`

- Mengelola jadwal wave, komposisi spawn, boss milestone, jeda transisi, dan batas jumlah entity.
- Randomness sebaiknya melalui utility yang mudah di-seed pada test.
- Spawn tidak boleh menghasilkan pola yang tidak dapat dihindari atau spawn di atas pemain.

### 13.5 `AssetManager`

- Memuat GLB/GLTF dan asset pendukung berdasarkan manifest.
- Mengembalikan placeholder ketika asset tak tersedia atau error.
- Menjaga ownership resource yang perlu di-dispose.
- Tidak menyimpan object Three.js ke localStorage.

### 13.6 Vue UI bridge

- Sediakan composable/adapter `useGameSession` untuk lifecycle engine dan snapshot HUD.
- Update HUD berbasis event atau throttle sekitar 5–10 kali/detik, bukan 60 kali/detik bila nilainya tidak perlu diperbarui setiap frame.
- Pastikan saat route/component unmount, `engine.dispose()` dipanggil.
- Vue tidak boleh memodifikasi posisi mesh secara langsung; kontrol gameplay harus melewati API/input engine.

---

## 14. Data model dan persistensi lokal

Tidak dibutuhkan database/backend pada MVP. Simpan data kecil yang dapat diregenerasi; jangan simpan state world lengkap.

### 14.1 Key storage

Gunakan key berversi, misalnya:

- `voidstrike.profile.v1`

Jangan gunakan satu key generik seperti `data` yang berpotensi bentrok dengan aplikasi lain.

### 14.2 Skema profile

Contoh kontrak TypeScript konseptual:

```ts
interface LocalProfileV1 {
  version: 1
  bestScore: number
  topScores: Array<{
    score: number
    wave: number
    durationMs: number
    enemiesDestroyed: number
    bossDefeated: number
    playedAt: string // ISO date string
  }>
  settings: {
    muted: boolean
    quality: 'low' | 'high' | 'auto'
    cameraShake: boolean
  }
  totalRuns: number
  updatedAt: string
}
```

### 14.3 Aturan persistensi

- Validasi JSON setelah parse: bentuk object, versi, tipe dan rentang angka harus diperiksa.
- `score`, `wave`, `durationMs`, dan counter harus berupa finite non-negative number; skor yang ditampilkan/disimpan dibulatkan ke integer.
- Batasi `topScores` hingga 10 item, diurutkan score tertinggi dulu.
- Jangan menyimpan identifier sensitif, token, credential, atau data pribadi.
- Jika JSON corrupt, abaikan data invalid dan buat profile default; jangan membuat aplikasi crash.
- Tangani `JSON.parse`, `localStorage.getItem`, dan `localStorage.setItem` dengan `try/catch`.
- Jika storage tidak tersedia, game tetap bisa dimainkan; persistensi menjadi fitur best-effort.
- `bestScore` harus konsisten dengan skor tertinggi lokal setelah penyimpanan.
- Sediakan fungsi `resetLocalProfile()` untuk reset data dalam Settings atau debug.
- Data dari localStorage tidak boleh dipercaya untuk anti-cheat. Leaderboard ini lokal dan dapat diedit oleh pemilik perangkat.

### 14.4 Model sesi runtime

Sesi berjalan disimpan dalam memori, misalnya:

- `runId` lokal untuk membedakan run;
- `startedAt`/`durationMs`;
- `score`, `wave`, `enemiesDestroyed`, `bossesDefeated`;
- `player.hull`, `player.shield`;
- active cooldowns dan entity references.

Object Three.js, referensi DOM, timer, dan instance engine tidak boleh dipersistenkan.

---

## 15. Persyaratan nonfungsional

### 15.1 Performa

Target awal (ukur pada perangkat yang disebutkan ketika pengujian):

- Desktop modern: target 60 FPS pada resolusi viewport umum.
- Ponsel menengah: target sekitar 30 FPS atau lebih pada mode kualitas rendah; target 60 FPS jika perangkat mampu.
- Hindari frame stutter berkepanjangan saat wave/boss dimulai.
- Batasi device pixel ratio renderer (misalnya maksimum 1,5 di mobile dan 2 pada desktop; dapat diturunkan sesuai preset).
- Batasi entity aktif, projectile, particle, dan efek. Tentukan cap eksplisit dan uji skenario terpadat.
- Gunakan object pooling untuk projectile dan efek berfrekuensi tinggi jika profiling menunjukkan churn/GC berarti.
- Hindari membuat `new Geometry` atau `new Material` setiap frame.
- Hindari shadow maps dinamis/post-processing berat dalam baseline.
- Bersihkan geometry/material/texture yang dimiliki saat scene atau engine berakhir; jangan `dispose()` resource bersama sebelum pemiliknya selesai.

Budget baseline yang disarankan untuk MVP:

- Maksimum awal sekitar 40 musuh/hazard gabungan dan 100 projectile yang aktif, disesuaikan melalui pengukuran.
- Particle aktif dibatasi dan objek particle di-pool jika memungkinkan.
- Tidak ada pertumbuhan terus-menerus jumlah entity setelah restart berulang.
- Ukuran total GLB, tekstur, dan audio perlu dicatat; targetkan initial asset transfer sekecil mungkin dan lazy-load konten yang belum digunakan.

Angka budget adalah guardrail awal, bukan klaim performa lintas semua perangkat. Ubah hanya setelah profiling dan dokumentasikan hasilnya.

### 15.2 Responsivitas

- Berfungsi pada desktop dan mobile browser modern dengan WebGL.
- Resize viewport tidak mendistorsi kamera atau meninggalkan canvas dengan ukuran lama.
- Input mobile tidak men-trigger scroll/zoom browser pada area gameplay yang aktif.
- HUD tidak bertumpuk dengan tombol khusus pada lebar layar kecil.
- Orientation change harus menghitung ulang viewport dan batas arena.

### 15.3 Reliabilitas

- Asset gagal load tidak membuat game blank.
- Restart berulang tidak menggandakan event listener, render loop, audio, atau entity lama.
- Pause/resume tidak menggandakan loop maupun mempercepat game.
- Storage rusak/tidak tersedia tidak menghambat sesi.
- Error kritis ditampilkan dengan pesan ramah dan opsi kembali/menu; detail teknis masuk console hanya untuk debugging.

### 15.4 Aksesibilitas

- Kontras teks dan indikator memadai.
- Jangan membedakan hazard hanya berdasarkan warna.
- Kontrol menu dapat dijalankan dengan keyboard.
- Tombol memiliki label accessible dan focus indicator.
- Efek shake berkepanjangan harus dapat dikurangi/dimatikan.
- Jangan mem-flash layar dengan intensitas tinggi atau pola berkedip cepat.

---

## 16. Keamanan dan privasi

- MVP tidak mengumpulkan data pengguna atau mengirim skor ke server.
- Jangan menambahkan telemetry, analytics, atau SDK pihak ketiga tanpa keputusan produk eksplisit.
- Jangan menggunakan `v-html` dengan konten tak tepercaya.
- Jangan mengevaluasi kode dari asset, konfigurasi remote, atau localStorage.
- Validasi setiap nilai yang dibaca dari localStorage.
- Asset harus berasal dari sumber yang berizin dan dicatat dalam `docs/ASSET_CREDITS.md`.
- Jika game kelak memakai leaderboard online, perlakukan skor dari client sebagai input tidak tepercaya. Validasi di server, terapkan rate limit, dan jangan memberikan otoritas skor kepada client. Fitur ini berada di luar MVP.
- Hindari menghosting file asset dari URL tidak dikenal secara runtime; gunakan asset lokal atau host yang dikendalikan proyek.
- Jika menggunakan Content Security Policy di platform hosting, uji kebijakan tersebut agar Three.js/WebGL dan asset lokal tetap berjalan tanpa memberi izin berlebihan.

---

## 17. Pengujian dan verifikasi

### 17.1 Unit tests

Minimal cover:

1. Damage dikurangi dari shield lebih dulu, kemudian hull.
2. Health/shield tidak turun di bawah 0 atau melebihi maksimum.
3. Shield regen baru dimulai setelah delay tanpa damage.
4. Invulnerability window menolak damage tambahan.
5. Cooldown primary/special berjalan berdasarkan delta time, bukan jumlah frame.
6. Score bertambah berdasarkan survival time dan kill reward yang benar.
7. Wave 3, 6, 9, dan kelipatannya memicu boss sesuai aturan.
8. Wave transition tidak memulai wave baru saat boss masih hidup.
9. Difficulty scaling mengikuti cap minimum/maksimum.
10. Collision menyelesaikan hit satu kali dan entity yang sudah nonaktif tidak dihitung lagi.
11. Storage menerima profile valid, menolak/memperbaiki profile corrupt, dan membatasi top scores ke 10.
12. State machine tidak mengizinkan transisi invalid yang merusak sesi.

### 17.2 Integration tests

- Engine bisa dibuat dan di-dispose tanpa meninggalkan listener/loop.
- Gagal load `player-ship.glb` tetap menghasilkan placeholder yang bisa dimainkan.
- Pause membekukan movement/spawn/cooldown; resume melanjutkan tanpa time jump.
- Restart membersihkan seluruh enemy, projectile, pickup, dan boss dari run sebelumnya.
- Game over menghentikan spawning dan penyimpanan skor dilakukan satu kali.
- Mengubah viewport menghitung ulang kamera dan bounds.

### 17.3 E2E/manual smoke test

- Halaman Nuxt terbuka tanpa SSR error.
- Menu dapat dinavigasi dan Play memulai game.
- Keyboard movement, touch drag, dan special weapon berfungsi.
- Health/shield HUD berubah saat damage/pickup.
- Boss muncul pada wave yang ditentukan, health bar berfungsi, boss bisa dikalahkan.
- Game over menampilkan hasil yang konsisten; restart mulai bersih.
- Best score tetap tersedia setelah reload browser.
- Mute dan kualitas grafis tersimpan.
- Game dapat dimainkan dengan asset final yang tersedia maupun dengan asset placeholder.
- Uji sekurangnya viewport desktop 16:9, viewport mobile portrait, dan mobile landscape.

### 17.4 Kriteria rilis QA

- Tidak ada error TypeScript/build yang diketahui.
- Tidak ada error runtime yang berulang dalam alur utama.
- Tes unit lulus.
- E2E/smoke test lulus atau kendala lingkungan dijelaskan secara eksplisit.
- Restart minimal 10 kali tanpa entity/listener/resource yang terus bertambah.
- Uji sesi minimal 5 menit pada desktop dan perangkat mobile representatif.
- Ukur FPS/frame pacing, penggunaan CPU/GPU secara praktis, serta jumlah entity pada wave padat.

---

## 18. Acceptance criteria (definition of done)

### A. Aplikasi dan rendering

- [ ] Nuxt 4 berjalan menggunakan Bun dengan scripts yang terdokumentasi.
- [ ] Halaman tidak memicu SSR exception terkait `window`, `document`, WebGL, atau `localStorage`.
- [ ] Canvas Three.js mengisi area game dan merespons resize/orientation change.
- [ ] Saat WebGL tidak tersedia, pengguna melihat fallback error yang ramah.

### B. Gameplay inti

- [ ] Pesawat bergerak ke empat arah dalam batas area yang telah ditentukan.
- [ ] Primary weapon menembak otomatis hanya ketika playing.
- [ ] Special weapon dapat dipicu manual dengan Space pada desktop dan tombol pada mobile.
- [ ] Special weapon cooldown terlihat dan benar-benar membatasi penggunaan.
- [ ] Musuh/hazard mendekat dari depan dan dapat dihancurkan/dihindari.
- [ ] Proyektil musuh dapat mengenai pemain dengan collision yang konsisten.
- [ ] Shield menyerap damage sebelum hull; shield regen mengikuti delay dan laju konfigurasi.
- [ ] Pickup yang diambil hanya memberi efek satu kali.
- [ ] Pemain kalah ketika hull mencapai 0; tidak ada spawn gameplay setelah game over.

### C. Progression

- [ ] Wave counter meningkat menurut aturan yang terdokumentasi.
- [ ] Boss muncul pada wave 3, 6, 9, dan kelipatannya.
- [ ] Boss mempunyai health bar, minimal dua pola serangan, dan reward saat dikalahkan.
- [ ] Difficulty meningkat bertahap tetapi tidak melampaui cap konfigurasi.
- [ ] Score survival dan score reward dihitung benar.

### D. UI dan data

- [ ] Menu, controls help, settings, pause, game over dan restart tersedia.
- [ ] HUD menunjukkan score, wave, hull, shield dan special cooldown.
- [ ] Best score/top scores disimpan lokal dan tetap bertahan setelah reload.
- [ ] Storage invalid/disabled tidak merusak game.
- [ ] Mute dan quality preference bekerja serta disimpan jika storage tersedia.

### E. Asset dan performa

- [ ] Gambar referensi tidak diperlakukan sebagai model 3D.
- [ ] Jika GLB tidak tersedia, placeholder pesawat/musuh tetap ditampilkan.
- [ ] Asset load error tidak menghentikan sesi.
- [ ] Restart/unmount melepas resource dan tidak menggandakan game loop.
- [ ] Frame rate dan jumlah entity dievaluasi pada desktop serta perangkat mobile representatif.

---

## 19. Roadmap implementasi

Kerjakan secara berurutan. Jangan melompati tahap core hanya untuk mengejar visual.

### Tahap 0 — Repository audit dan skeleton

**Hasil:** proyek dapat dijalankan, konvensi jelas, halaman awal tersedia.

- Audit repo dan catat versi Bun/Nuxt/Three.js serta script yang ada.
- Pastikan TypeScript strict dan lint/test/build command jelas.
- Buat halaman index, GameViewport client-only, dan placeholder canvas.
- Tambahkan fallback jika WebGL tidak tersedia.

**Exit criteria:** `bun run dev` dan `bun run build` berjalan; tidak ada SSR error.

### Tahap 1 — Rendering 3D dan lifecycle

**Hasil:** scene side-view stabil dengan background, camera, lighting dan placeholder pesawat.

- Implementasikan `GameEngine`, `GameLoop`, `SceneFactory`, camera bounds dan resize handling.
- Buat placeholder pesawat terinspirasi referensi dengan mesh modular sederhana.
- Tambahkan parallax starfield.
- Implementasikan `dispose()` dan test restart/mount-unmount.

**Exit criteria:** canvas responsif, placeholder tampak dari samping dan menghadap kanan, lifecycle tidak membuat loop ganda.

### Tahap 2 — Kontrol dan gameplay dasar

**Hasil:** pemain bisa bergerak dan menembak target sederhana.

- Implementasikan state machine dan InputManager.
- Tambahkan movement bounds dan primary auto-fire.
- Tambahkan projectile/player-hitbox dan collision system.
- Pisahkan konfigurasi balancing dari kode entity.

**Exit criteria:** movement, auto-fire dan collision dapat diuji serta tidak bergantung pada Vue state per frame.

### Tahap 3 — Combat, health, enemy dan pickup

**Hasil:** combat loop lengkap dengan resource pemain.

- Implementasikan shield/hull, shield regen, invulnerability window, damage feedback.
- Tambahkan special weapon manual dan cooldown UI.
- Tambahkan tiga archetype musuh, dua hazard, enemy projectiles dan tiga pickup.
- Tambahkan object pooling jika profiling/volume entity membutuhkannya.

**Exit criteria:** pemain bisa menyerang, menghindar, mengambil pickup, menerima damage, dan kalah secara konsisten.

### Tahap 4 — Wave, boss dan scoring

**Hasil:** progression endless dapat dimainkan.

- Implementasikan wave spawn director, difficulty scaling dan batas entity.
- Tambahkan boss placeholder, dua attack patterns dan health bar.
- Implementasikan score, kill reward, boss reward, game over dan restart.

**Exit criteria:** boss hadir pada wave 3 dan kelipatannya; kill/game over/restart tidak meninggalkan entity lama.

### Tahap 5 — UI/UX, mobile dan polish

**Hasil:** alur produk lengkap dan visual feedback layak MVP.

- Lengkapi main menu, controls help, settings, pause, game over, HUD.
- Tambahkan input touch/Pointer Events dan special weapon button mobile.
- Tambahkan audio dasar atau Web Audio fallback, hit flash, muzzle flash, explosion, pickup effects.
- Tambahkan mute, quality preset, reduced-motion handling.

**Exit criteria:** game dapat dimainkan nyaman di desktop dan mobile; UI tidak menutupi area permainan secara berlebihan.

### Tahap 6 — Storage, testing, profiling dan rilis

**Hasil:** MVP dapat dibangun, diuji dan dipublikasikan.

- Implementasikan storage schema berversi, validasi dan top 10 lokal.
- Tambahkan unit tests, integration tests dan smoke/E2E tests.
- Uji asset failure, storage failure, resize, pause/resume, restart berulang dan sesi panjang.
- Profiling target desktop/mobile, sesuaikan DPR, entity caps, draw calls dan particle.
- Dokumentasikan source asset/lisensi; verifikasi deployment static sesuai konfigurasi Nuxt aktual.

**Exit criteria:** semua acceptance criteria prioritas MVP terpenuhi atau gap yang tersisa tercatat secara eksplisit.

### Tahap 7 — Integrasi model final (dapat berjalan paralel bila asset tersedia)

- Siapkan `player-ship.glb` dari Blender atau sumber berlisensi yang sesuai.
- Verifikasi orientasi, skala, pivot, material, jumlah mesh/draw calls dan ukuran file.
- Tambahkan asset ke manifest dan uji loader dengan fallback dimatikan hanya pada lingkungan test asset.
- Bandingkan silhouette dari kamera gameplay; prioritaskan keterbacaan dibanding detail yang tak terlihat.

**Exit criteria:** model final muncul dalam game, arah dan skala benar, dan fallback tetap tersedia.

---

## 20. Instruksi menjalankan dan memverifikasi proyek

Coding agent harus mempertahankan scripts yang ada bila telah dikonfigurasi dengan benar. Jika membuat setup baru, sediakan scripts dengan fungsi setara berikut:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "typecheck": "nuxt typecheck",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Catatan:

- Pastikan command `nuxt typecheck` tersedia pada setup Nuxt yang dipakai; jika tidak, tambahkan/konfigurasikan type-checker yang kompatibel dan dokumentasikan.
- Jangan menimpa seluruh `package.json` untuk menambahkan satu script.
- Untuk repo baru, install dependency sesuai versi kompatibel yang terverifikasi menggunakan Bun.
- Playwright boleh ditambahkan untuk E2E jika runtime browser tersedia di CI; jika tidak, jalankan smoke test manual dan jelaskan batasannya.

Urutan verifikasi minimum sebelum selesai:

```bash
bun install
bun run typecheck
bun run test
bun run build
```

Jika salah satu script memang tidak ada, coding agent harus membuatnya atau mencatat alasan dan menggantinya dengan pemeriksaan yang setara. Jangan menandai build/test berhasil jika command tidak dijalankan.

---

## 21. Risiko dan mitigasi

| Risiko                                    | Dampak                                            | Mitigasi                                                                       |
| ----------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Model GLB belum tersedia                  | Pesawat tidak tampil atau visual terasa sementara | Implementasikan placeholder berkualitas dasar dan asset fallback sejak tahap 1 |
| Three.js dieksekusi saat SSR              | Build/runtime Nuxt gagal                          | Inisialisasi di client lifecycle; lakukan smoke test SSR/build                 |
| Terlalu banyak fitur sebelum core selesai | MVP terlambat dan bug meningkat                   | Ikuti roadmap; multiplayer/backend/upgrade tree tetap di luar MVP              |
| Performa mobile buruk                     | Game patah-patah dan kontrol sulit                | DPR cap, kualitas rendah, entity cap, pooling, hindari post-processing mahal   |
| Gameplay sulit/tidak adil                 | Pemain mendapat damage yang tak terhindarkan      | Telegraph, safe corridor, spawn margin, difficulty cap, playtest               |
| Restart menimbulkan memory/listener leak  | Frame rate turun dan input ganda                  | Centralized lifecycle/dispose; tes restart berulang                            |
| localStorage corrupt/tidak tersedia       | Skor/pengaturan rusak atau aplikasi crash         | Validasi schema, fallback defaults, storage best-effort                        |
| Asset tidak jelas lisensinya              | Risiko hak cipta saat publikasi                   | Gunakan asset orisinal/berlisensi dan simpan atribusi                          |
| Scope berubah ke backend terlalu dini     | Kompleksitas operasional tanpa manfaat MVP        | Backend dan leaderboard global menjadi fase terpisah                           |

---

## 22. Fitur lanjutan setelah MVP

Pertimbangkan hanya berdasarkan feedback dan metrik penggunaan yang benar-benar tersedia:

1. Model pesawat dan boss final dengan animasi/mesin yang lebih detail.
2. Pilihan pesawat, senjata, upgrade run dan variasi boss.
3. Seeded daily challenge dan objective harian lokal.
4. PWA/offline caching dengan pengujian cache/versioning tersendiri.
5. API leaderboard global dan validasi skor server-side.
6. Backend Go + PostgreSQL/Redis hanya bila membutuhkan identitas pemain, sinkronisasi lintas perangkat, atau fitur online dengan alasan produk yang jelas.
7. Analitik privacy-conscious setelah keputusan privasi dan deployment ditetapkan.

---

## 23. Keputusan produk yang dianggap final untuk MVP

Agar coding agent tidak mengulang pertanyaan yang sudah dijawab, anggap keputusan ini final kecuali pengguna secara eksplisit mengubah PRD:

- **Genre:** 3D chase-cam rail shooter ala Vendetta Online, terinspirasi gameplay Space Impact.
- **Visual pesawat:** stealth sci-fi hitam/abu metalik dengan aksen cyan, terinspirasi gambar lampiran.
- **Model aktual:** belum ada; placeholder wajib berfungsi.
- **Primary weapon:** auto-fire.
- **Special weapon:** input manual, cooldown, salvo 3 misil/energi.
- **Durability:** hull HP + energy shield; shield menyerap damage dahulu dan regenerasi setelah delay.
- **Musuh/hazard:** scout, interceptor, heavy, asteroid/debris, enemy projectiles 3D, pickups; musuh mendekat dari depan (+Z).
- **Progression:** endless waves; boss di wave 3, 6, 9, dan seterusnya.
- **Platform:** desktop dan mobile web.
- **Backend:** tidak ada untuk MVP; skor dan settings lokal.
- **Release target:** polished MVP dengan UI, efek, audio dasar/fallback, testing, dan optimasi terukur.
- **Stack:** Nuxt 4 + Vue 3 + TypeScript + Three.js + Bun; tidak diganti.

---

## 24. Sumber visual dan langkah pertama untuk tim

Simpan referensi lampiran ke repository sebagai:

```text
docs/references/spaceship-reference.png
```

Gunakan gambar hanya untuk art direction dan brief pembuatan model. Jika coding agent tidak menerima file gambar dalam workspace, ia harus melanjutkan menggunakan deskripsi visual di PRD ini dan tidak boleh berhenti menunggu gambar.

**Tugas pertama coding agent:** audit repository, ringkas kondisi awalnya, identifikasi scripts dan testing yang tersedia, lalu implementasikan Tahap 0 dan Tahap 1. Jangan langsung membuat semua fitur sekaligus. Setelah tiap tahap, laporkan file yang berubah, keputusan penting, hasil command yang benar-benar dijalankan, serta blocker yang tersisa.

---

**Akhir dokumen PRD.**
