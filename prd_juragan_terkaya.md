# PRD — Juragan Terkaya
### Game Edukasi Literasi Keuangan UMKM (Interactive Multiplayer Game)

**Versi dokumen:** 1.0
**Dibuat untuk:** Sanggabiz — materi presentasi/training UMKM
**Target implementasi:** Claude Code (rebuild dari prototype React/Artifact)

---

## 1. Latar Belakang & Tujuan

Game ini digunakan sebagai alat bantu presentasi tentang keuangan UMKM, dengan fokus pada dua pesan utama:
1. Pentingnya **memisahkan transaksi pribadi dan usaha**
2. Pentingnya **pencatatan keuangan usaha** yang konsisten

Peserta bermain sebagai "juragan" yang mengelola modal usaha, menjawab soal kasus keuangan sehari-hari, dan mencatat transaksinya. Pemenang adalah peserta dengan saldo akhir tertinggi.

Game dimainkan **serentak oleh banyak peserta** (bisa 50+) menggunakan HP masing-masing, dikendalikan oleh satu **fasilitator** di layar besar/proyektor.

---

## 2. Peran Pengguna (User Roles)

### 2.1 Peserta (Participant)
- Mengakses via link yang sama, dari HP masing-masing
- Mendaftar dengan **nama asli**
- Memilih **1 dari 4 warna kartu** (merah, kuning, hijau, biru) di setiap putaran
- Menjawab soal pilihan ganda
- Mencatat transaksi (khusus peserta yang warnanya cocok dengan hasil spin)

### 2.2 Fasilitator
- Akses dikunci dengan **PIN** (agar tidak sembarang orang bisa jadi fasilitator saat game di-publish)
- Mengontrol jalannya game: membuka putaran, memutar spin wheel, reveal jawaban & insight
- Melihat dashboard lengkap seluruh peserta
- Dapat **mengedit bank soal** langsung dari UI (tanpa mengubah kode)

---

## 3. Konsep Inti Permainan

### 3.1 Modal Awal
- Setiap peserta mulai dengan saldo **Rp10.000.000**

### 3.2 Alur per Putaran (Round)
Putaran **tidak dibatasi jumlahnya** — fasilitator yang menentukan kapan game berakhir (manual stop).

1. **Fase Pilih Warna** (durasi 10 detik, ditampilkan sebagai timer visual/ring countdown)
   - Fasilitator membuka putaran baru
   - Semua peserta diminta memilih 1 dari 4 warna (merah/kuning/hijau/biru)
   - Warna **dipilih ulang setiap putaran** (bukan sekali di awal game)
   - Begitu dipilih, warna langsung **terkunci** untuk putaran tersebut (tidak bisa diganti)
   - Jika peserta tidak memilih dalam 10 detik → sistem **otomatis memilihkan warna secara acak**

2. **Fase Spin**
   - Fasilitator memutar roda spin (4 warna)
   - Roda berhenti di salah satu warna secara acak
   - Sistem mengambil 1 soal secara acak dari bank soal sesuai warna yang keluar

3. **Fase Soal** (durasi 30 detik, timer visual per peserta)
   - Soal + 3 opsi jawaban (A/B/C) tampil **di halaman peserta** (bukan hanya di layar fasilitator)
   - **Peserta dengan warna yang cocok** dengan hasil spin → **wajib** menjawab
   - **Peserta dengan warna berbeda** → **boleh ikut menjawab** (sukarela/opsional), datanya dicatat terpisah dari yang wajib
   - Jika waktu habis tanpa menjawab → otomatis dianggap **salah**, saldo dikurangi denda

4. **Efek Jawaban terhadap Saldo**
   - **Jawaban benar**: saldo berubah sesuai efek soal:
     - `masuk` → saldo bertambah sejumlah nominal soal (contoh: penjualan tunai)
     - `keluar` → saldo berkurang sejumlah nominal soal (contoh: pembelian bahan baku)
     - `netral` → saldo tidak berubah (contoh: piutang belum dibayar, hutang, soal diskusi)
   - **Jawaban salah ATAU tidak menjawab (timeout)**: saldo dikurangi **denda tetap Rp500.000**

5. **Fase Catat Transaksi** (hanya untuk peserta yang **wajib** & menjawab **benar** & soal berefek `masuk`/`keluar`)
   - Setelah menjawab benar, muncul form pencatatan sederhana:
     - Keterangan (bebas diisi peserta, ada placeholder dari teks soal)
     - Nominal pemasukan/pengeluaran (readonly, otomatis terisi sesuai soal & jawaban — tidak bisa diedit manual agar konsisten dengan sistem penilaian)
   - Peserta menekan "Simpan Catatan"
   - Soal dengan efek `netral` tidak menampilkan form ini (langsung lanjut)

6. **Reveal Jawaban & Insight (oleh Fasilitator)**
   - Fasilitator klik "Reveal Jawaban" → jawaban benar ditampilkan ke layar fasilitator
   - Fasilitator klik "Tampilkan Insight" → insight/pembahasan edukatif ditampilkan
   - Fasilitator melihat rekap jawaban real-time: siapa saja yang **wajib** vs **sukarela**, jawaban masing-masing, benar/salah

7. Fasilitator lanjut ke **putaran berikutnya** (kembali ke langkah 1) atau **akhiri game**

### 3.3 Akhir Game
- Fasilitator dapat mengakhiri game kapan saja
- Peserta & fasilitator melihat papan skor final (ranking berdasarkan saldo akhir)

---

## 4. Bank Soal

### 4.1 Struktur Data Soal
Setiap soal terdiri dari:
| Field | Tipe | Keterangan |
|---|---|---|
| `id` | number | ID unik soal |
| `warna` | enum | merah / kuning / hijau / biru — menentukan kapan soal ini muncul (sesuai hasil spin) |
| `teks` | string | Isi pertanyaan/kasus |
| `opsi` | array[3] | 3 pilihan jawaban (tanpa label A/B/C di dalam teks, label ditambahkan otomatis oleh UI) |
| `jawaban` | enum(A/B/C) | Jawaban yang benar |
| `nominal` | number | Nilai rupiah yang mempengaruhi saldo jika jawaban benar |
| `efek` | enum | `masuk` (nominal menambah saldo) / `keluar` (nominal mengurangi saldo) / `netral` (tidak ada perubahan saldo) |
| `insight` | string | Penjelasan edukatif yang ditampilkan fasilitator setelah reveal jawaban |

### 4.2 Isi Bank Soal (30 soal)
Bank soal berisi 30 kasus keuangan UMKM sehari-hari, dengan distribusi merata di 4 warna (masing-masing warna dapat beberapa soal). Tema yang dicakup:
- Penjualan tunai (efek masuk)
- Pembelian bahan baku, sewa, gaji, listrik, dll (efek keluar)
- Piutang, hutang, titipan, barter (efek netral — soal jebakan edukasi paling penting)
- Prive/pengambilan pribadi (efek keluar, insight menekankan pemisahan pribadi & usaha)
- Soal kalkulasi sederhana (profit = pemasukan − pengeluaran, DP 50%, dll)

> **Catatan implementasi:** Isi lengkap 30 soal (teks, opsi, jawaban, insight) sudah difinalisasi bersama user dalam sesi sebelumnya dan harus di-hardcode sebagai **data default/seed**, namun harus tetap **bisa diedit penuh** melalui fitur Editor Soal (lihat bagian 5).

### 4.3 Aturan Pengambilan Soal
- Saat spin berhenti di warna tertentu, sistem memilih **1 soal secara acak** dari soal-soal berwarna tersebut
- Sistem menghindari **repetisi soal** dalam rentang waktu dekat (tracking ID soal yang baru dipakai, misal 15-25 soal terakhir)
- Jika seluruh soal warna tersebut sudah terpakai dalam batas rentang, sistem boleh mengambil ulang dari awal (fallback ke seluruh soal warna itu)

---

## 5. Fitur Editor Soal (Fasilitator)

- Tombol "✏️ Edit Soal" selalu terlihat di dashboard fasilitator
- Membuka modal/panel berisi **daftar seluruh soal** (list view ringkas: warna, efek, nominal, jawaban benar, cuplikan teks)
- Klik salah satu soal → masuk mode edit dengan form lengkap:
  - Pilih warna (dropdown)
  - Pilih efek saldo (dropdown: ➕ Menambah saldo / ➖ Mengurangi saldo / ⬜ Tidak ada perubahan)
  - Textarea pertanyaan
  - 3 input teks untuk opsi jawaban, dengan indikator visual opsi mana yang berstatus "jawaban benar"
  - Dropdown pilih jawaban benar (A/B/C)
  - Input nominal (disabled/dim jika efek = netral)
  - Textarea insight
- Tombol "Simpan Perubahan Soal Ini" → kembali ke list, perubahan tersimpan di state sementara
- Tombol "💾 Simpan Semua ke Sistem" di halaman list → menyimpan seluruh bank soal (termasuk semua perubahan) ke storage persisten, lalu menutup modal
- **Perubahan soal harus tersimpan secara persisten** (bertahan meski browser di-refresh/sesi baru), agar fasilitator tidak perlu mengedit ulang setiap kali membuka game
- Perubahan pada bank soal berlaku untuk **sesi berikutnya** (tidak perlu mengubah soal yang sudah tampil di sesi berjalan)

---

## 6. Kontrol Akses Fasilitator

- Saat halaman fasilitator dibuka, tampil **PIN Gate**: input PIN dengan tampilan angka tersamar (password field)
- PIN dikonfigurasi oleh pemilik game (constant/config value yang mudah diganti oleh developer, tidak perlu dinamis dari UI)
- PIN salah → pesan error muncul sebentar (auto-hilang), input dikosongkan
- PIN benar → lanjut ke dashboard fasilitator penuh
- Peserta **tidak memerlukan PIN**, cukup daftar nama

---

## 7. Dashboard Fasilitator

Dashboard punya 2 tab utama: **🎰 Spin & Soal** dan **📊 Dashboard**

### 7.1 Tab Spin & Soal
- Tombol mulai game / buka putaran berikutnya
- Roda spin visual (SVG, 4 segmen warna, animasi berputar ~3.5 detik lalu berhenti di warna acak)
- Status fase saat ini (menunggu peserta pilih warna / siap spin / soal aktif)
- Setelah spin: info warna hasil + **daftar nama peserta yang wajib menjawab** (sesuai pilihan warna mereka putaran ini)
- Tampilan soal aktif (teks + 3 opsi, dengan badge efek: pemasukan/pengeluaran/diskusi)
- Tombol reveal jawaban
- Tombol tampilkan insight
- **Rekap jawaban real-time** setelah reveal: dikelompokkan **Wajib** vs **Sukarela**, tiap kelompok menampilkan nama peserta + jawaban + benar/salah, serta skor agregat (X/Y benar)
- Tombol lanjut ke putaran berikutnya, akhiri game, dan reset total

### 7.2 Tab Dashboard (4 sub-tab)
1. **🏆 Papan Skor**
   - Top 3 dengan medali (🥇🥈🥉), menampilkan warna terakhir dipilih, saldo, selisih dari modal awal
   - Tabel lengkap seluruh peserta terurut berdasarkan saldo tertinggi
2. **📋 Warna per Putaran**
   - Tabel matriks: baris = peserta, kolom = putaran (P1, P2, ...), isi sel = emoji warna yang dipilih peserta pada putaran tsb
   - Kolom saldo di akhir tabel
3. **📒 Catatan Transaksi**
   - Tabel gabungan **seluruh catatan transaksi semua peserta** (bukan per-peserta terpisah): putaran, nama, keterangan, jumlah (pemasukan/pengeluaran)
   - Urut dari putaran terbaru
4. **💬 Rekap Jawaban**
   - Per putaran: breakdown Wajib vs Sukarela, daftar nama + jawaban + benar/salah, persentase benar keseluruhan

- Semua data di dashboard **auto-refresh** (polling berkala, misal tiap 2–3 detik) agar fasilitator melihat data real-time tanpa reload manual

---

## 8. Halaman Peserta

### 8.1 Pendaftaran
- Form input nama lengkap
- Info modal awal ditampilkan
- Tombol "Bergabung"

### 8.2 Badge Status (selalu tampil di atas selama game)
- Nama peserta
- Warna yang sedang dipilih (jika sudah pilih di putaran berjalan) + indikator terkunci
- **Saldo saat ini** (real-time, berubah warna hijau/merah tergantung di atas/bawah modal awal)

### 8.3 Fase Menunggu
- Saat fasilitator belum mulai game: pesan "Menunggu fasilitator memulai game..."
- Saat game sudah berakhir: pesan "Game selesai, lihat papan skor di layar fasilitator"

### 8.4 Fase Pilih Warna
- 4 tombol warna besar dengan emoji
- Timer ring countdown 10 detik
- Setelah dipilih (manual atau auto oleh sistem): warna terkunci, tombol lain disable/pudar, badge "🔒"

### 8.5 Fase Soal
- Banner status: **"🎯 Giliran kamu! Wajib jawab"** (jika warna cocok) ATAU **"Spin di [warna] — Boleh ikut jawab!"** (jika warna beda, nada lebih santai/opsional)
- Timer ring countdown 30 detik (berhenti begitu peserta submit jawaban)
- Kartu soal (teks pertanyaan + badge tipe efek)
- 3 tombol pilihan jawaban (A/B/C)
- Setelah menjawab (atau timeout):
  - Opsi yang dipilih & opsi yang benar ditandai visual (✅/❌)
  - Pesan hasil: benar (dengan detail efek saldo) atau salah/timeout (dengan info denda)
- **Jika peserta wajib + jawaban benar + soal punya efek finansial**: form catat transaksi muncul (keterangan bebas diisi, nominal readonly sesuai soal, tombol simpan)
- Riwayat transaksi peserta (list ringkas, terbaru di atas): putaran, keterangan, jumlah +/-

---

## 9. Model Data & Sinkronisasi Multi-Device

Karena game dimainkan lintas banyak perangkat secara real-time, dibutuhkan **penyimpanan bersama (shared state)** yang bisa dibaca-tulis dari halaman peserta maupun fasilitator secara simultan.

### 9.1 Entitas Data
- **Peserta** (per individu): id, nama, saldo saat ini, riwayat catatan transaksi, riwayat warna per putaran, riwayat jawaban per putaran
- **Daftar Peserta** (global): list ringkas seluruh peserta yang sudah bergabung (id + nama), untuk keperluan enumerasi
- **Status Game** (global, singleton): status berjalan/tidak, fase saat ini (pilih-warna/soal), nomor putaran aktif, soal aktif, warna hasil spin aktif, status selesai/belum
- **Bank Soal** (global, singleton): array seluruh soal (default 30, bisa berubah lewat editor)

### 9.2 Pola Sinkronisasi
- Peserta menulis data dirinya sendiri (saldo, catatan, pilihan warna, jawaban) ke record miliknya
- Fasilitator **membaca** seluruh record peserta secara agregat untuk dashboard
- Fasilitator **menulis** status game global (fase, putaran, soal aktif, warna spin) — dibaca oleh seluruh halaman peserta via polling
- Peserta mendeteksi perubahan fase/putaran dengan **polling berkala** (± 2 detik) dan bereaksi (pindah fase UI, reset timer, dsb)
- Perubahan bank soal oleh fasilitator disimpan persisten dan dimuat ulang saat halaman fasilitator dibuka

> **Catatan implementasi:** Pada prototype, sinkronisasi ini menggunakan `window.storage` (key-value storage bawaan Claude Artifact) dengan mode "shared" agar semua device saling melihat data yang sama. Saat rebuild di Claude Code (aplikasi mandiri), bagian ini perlu diganti dengan backend/database sungguhan (misal: Firebase Realtime Database, Supabase Realtime, WebSocket server, atau REST API + polling) yang mendukung banyak client membaca-tulis data yang sama secara real-time.

---

## 10. Non-Functional Requirements

- **Skalabilitas peserta**: harus mendukung **50+ peserta bersamaan** tanpa lag berarti pada dashboard fasilitator maupun sinkronisasi status game
- **Device**: peserta mengakses dari HP (mobile-first responsive), fasilitator bisa dari laptop/proyektor (layar lebih lebar, tabel dashboard perlu scroll horizontal jika sempit)
- **Resiliensi jaringan**: jika koneksi peserta lambat/terputus sesaat, polling berikutnya harus tetap bisa menyusul state terbaru tanpa merusak data (last-write-wins dapat diterima)
- **Tidak ada login rumit untuk peserta** — cukup nama, tanpa akun/password
- **Fasilitator harus dilindungi PIN** agar publish/share link tidak membuat sembarang orang bisa mengontrol game
- **Bahasa UI**: Bahasa Indonesia sepenuhnya
- **Format mata uang**: Rupiah dengan pemisah ribuan (format "Rp10.000.000")

---

## 11. Alur Reset & Multi-Sesi

- Fasilitator dapat melakukan **Reset** kapan saja: menghapus seluruh data peserta, status game, dan riwayat putaran — mengembalikan ke kondisi awal untuk sesi/kelompok presentasi berikutnya
- Bank soal **tidak ikut ter-reset** (perubahan dari editor soal bersifat permanen lintas sesi, kecuali diedit ulang)

---

## 12. Ringkasan Perjalanan Keputusan Produk (Konteks Tambahan)

Untuk membantu proses build ulang di Claude Code, berikut ringkasan keputusan yang sudah difinalisasi bersama pemilik produk:

1. Game berbasis presentasi fisik/offline dengan device masing-masing peserta, bukan game online terpisah waktu
2. Warna kartu **tidak eksklusif** — banyak peserta boleh memilih warna yang sama
3. Warna dipilih **ulang setiap putaran**, bukan sekali di awal
4. Jumlah putaran **tidak dibatasi sistem** — kendali penuh di tangan fasilitator
5. Soal pilihan ganda menggunakan **3 opsi (A/B/C)**
6. Peserta dengan warna cocok = **wajib jawab + wajib catat transaksi**; peserta warna beda = **boleh ikut jawab (sukarela)** untuk keperluan engagement, tapi tidak mencatat transaksi
7. **Sanksi keterlambatan/kesalahan**: jawaban salah atau tidak menjawab dalam 30 detik = potong saldo Rp500.000 (nominal ini adalah konstanta yang bisa disesuaikan developer)
8. Pencatatan transaksi **otomatis mengikuti hasil jawaban** (bukan input bebas oleh peserta) — nominal dikunci sesuai definisi soal untuk menjaga integritas data leaderboard
9. Fasilitator wajib memiliki **kontrol akses (PIN)** karena game akan di-publish sebagai link yang bisa diakses siapa saja
10. Bank soal harus **fully editable dari UI** oleh fasilitator, tanpa perlu menyentuh kode — ini adalah kebutuhan operasional penting karena soal akan terus disesuaikan untuk audiens berbeda

---

## 13. Saran Arsitektur Teknis untuk Claude Code (Opsional, sebagai referensi)

- **Frontend**: React (atau framework pilihan tim), dengan 2 route/halaman terpisah: `/peserta` dan `/fasilitator`
- **Realtime sync**: Firebase Realtime Database / Firestore, atau Supabase Realtime — keduanya mendukung multi-client read/write dengan listener otomatis (lebih baik dari polling manual untuk skala 50+ peserta)
- **State global game** disimpan di satu dokumen/singleton (`game_state`), di-subscribe oleh semua klien
- **State per peserta** disimpan di collection terpisah (`peserta/{id}`), fasilitator melakukan query/listener atas seluruh collection untuk dashboard
- **Bank soal** disimpan di collection/dokumen terpisah (`questions`), bisa diedit via UI fasilitator dan langsung tersimpan ke database
- **Autentikasi fasilitator**: cukup PIN sederhana yang dicocokkan client-side terhadap config, TIDAK perlu sistem auth penuh (kecuali tim ingin upgrade ke akun asli di masa depan)
- Pertimbangkan **rate limiting/optimistic UI** pada submit jawaban agar responsif meski koneksi peserta lambat

---

*Dokumen ini merangkum seluruh requirement yang telah didiskusikan dan diiterasi bersama pemilik produk melalui beberapa siklus revisi prototype. Gunakan sebagai spesifikasi utama saat membangun ulang aplikasi secara mandiri (bukan sebagai Claude Artifact) di Claude Code.*
