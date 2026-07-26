# 💰 Games Literasi Keuangan

Game edukasi literasi keuangan UMKM untuk dimainkan serentak oleh banyak peserta
(50+) dari HP masing-masing, dikendalikan satu fasilitator dari layar besar.

Dua pesan utama yang ditanamkan: **pisahkan uang pribadi dan usaha**, serta
**catat setiap transaksi usaha**.

Spesifikasi awal ada di [prd_juragan_terkaya.md](prd_juragan_terkaya.md) — dokumen itu memakai nama lama "Juragan Terkaya" dan sebagian aturannya sudah berubah.

---

## Teknologi

| Bagian | Pilihan |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Database & realtime | Supabase (Postgres + Realtime) |
| Hosting | Vercel |

---

## Setup pertama kali

### 1. Install dependency

```bash
npm install
```

### 2. Buat project Supabase

1. Daftar gratis di [supabase.com/dashboard](https://supabase.com/dashboard), buat project baru
2. Buka menu **SQL Editor → New query**
3. Copy-paste seluruh isi [`supabase/schema.sql`](supabase/schema.sql), klik **Run**

Skrip itu membuat semua tabel, mengaktifkan realtime, dan menyiapkan fungsi reset.
Aman dijalankan berulang kali.

> Untuk database yang **sudah terlanjur dibuat** dengan skema lama, jalankan juga
> migrasi berikut secara berurutan:
> [`migrasi-02-kecepatan.sql`](supabase/migrasi-02-kecepatan.sql),
> [`migrasi-03-tema.sql`](supabase/migrasi-03-tema.sql), lalu
> [`migrasi-04-opsi-fleksibel.sql`](supabase/migrasi-04-opsi-fleksibel.sql).
> Database baru tidak perlu — `schema.sql` sudah mencakup semuanya.

### 3. Isi kredensial

Salin `.env.example` menjadi `.env`, lalu isi dari **Project Settings → Data API**:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_FASILITATOR_PIN=2024
```

### 4. Jalankan

```bash
npm run dev
```

Buka http://localhost:5173. Bank soal terisi otomatis (30 soal default) saat
halaman fasilitator pertama kali dibuka.

> Untuk mencoba dari HP di Wi-Fi yang sama, pakai alamat **Network** yang muncul
> di terminal (contoh `http://192.168.1.5:5173`).

---

## Cara main

| Halaman | Alamat | Keterangan |
|---|---|---|
| Peserta | `/peserta` | Cukup isi nama, tanpa login |
| Fasilitator | `/fasilitator` | Dilindungi PIN |

Alur satu putaran:

0. Fasilitator memilih **tema soal** untuk sesi itu (lihat Bank Soal di bawah)
1. Fasilitator klik **Mulai Game** → sistem mengambil 1 soal acak dari tema
   tersebut dan langsung menampilkannya ke seluruh peserta
2. Semua peserta punya 30 detik untuk menjawab — tidak ada pembagian giliran,
   semua bermain di setiap soal
3. Fasilitator memantau progress: siapa sudah menjawab dan berapa detik.
   Benar/salah masih tersembunyi — aman kalau layar di-share
4. Fasilitator klik **Reveal Jawaban** → saat inilah saldo seluruh peserta
   dibukukan serentak, dan peserta baru tahu benar/salah
5. Fasilitator klik **Tampilkan Insight** untuk membahas pelajarannya
6. Peserta yang menjawab benar mengisi **form catatan transaksi** sebagai latihan
   mencatat (tidak mempengaruhi saldo)
7. Fasilitator klik **Lihat Papan Skor** → muncul **podium tercepat** putaran itu
   dan **peringkat kumulatif**, di layar fasilitator maupun HP peserta
8. Klik **Soal Berikutnya**, atau **Akhiri Game** untuk menutup sesi

Jumlah putaran tidak dibatasi — fasilitator yang menentukan kapan berhenti.

> **Penting:** menekan **Reveal Jawaban** tidak boleh dilewat. Saldo peserta baru
> dibukukan pada langkah itu — kalau dilewati, papan skor tidak bergerak.

### Perhitungan saldo

```
delta = benar ? +Rp1.000.000 : −Rp500.000
```

| Hasil jawaban | Perubahan saldo |
|---|---|
| Benar | `+Rp1.000.000` |
| Salah atau tidak menjawab | `−Rp500.000` |

**Nominal dan jenis efek soal tidak mempengaruhi saldo.** Keduanya tetap ada di
bank soal sebagai bahan pembelajaran — ditampilkan setelah reveal dan mengisi form
catatan transaksi — tapi tidak menggerakkan angka. Akibatnya saldo menjadi
cerminan langsung dari jumlah jawaban benar, sehingga peringkat mudah dijelaskan
ke peserta.

### Penentuan pemenang

- **Podium putaran** — di antara peserta yang sama-sama menjawab **benar**, yang
  **tercepat** menang.
- **Peringkat akhir** — saldo tertinggi. Bila saldo **seri**, yang **rata-rata waktu
  menjawabnya lebih cepat** berada di atas. Kecepatan tidak pernah menambah uang.

---

## Pengaturan yang bisa diubah

Semua ada di [`src/lib/config.ts`](src/lib/config.ts):

| Konstanta | Default | Arti |
|---|---|---|
| `MODAL_AWAL` | `10.000.000` | Saldo awal tiap peserta |
| `DENDA` | `500.000` | Potongan untuk jawaban salah / telat |
| `BONUS_BENAR` | `1.000.000` | Bonus untuk jawaban benar |
| `DURASI_SOAL` | `30` detik | Waktu menjawab soal |
| `RIWAYAT_SOAL_MAX` | `20` | Berapa soal terakhir dihindari agar tidak berulang |

PIN fasilitator diatur lewat `VITE_FASILITATOR_PIN` di `.env`.

## Bank Soal & Tema

Soal dikelompokkan ke dalam **tema** yang dibuat sendiri oleh fasilitator —
misalnya "Literasi Keuangan UMKM", "Pencatatan Kas Harian", atau materi khusus
untuk audiens tertentu. **Satu sesi permainan memakai satu tema**, sehingga materi
bisa disesuaikan tanpa mengubah bank soal yang lain.

Semuanya dikelola dari menu **📚 Bank Soal** di panel fasilitator:

- Buat, ubah nama, dan hapus tema
- Di dalam tema: tambah, ubah, duplikat, hapus soal, dengan pencarian
- **Centang soal mana saja yang ikut dimainkan** — soal yang tidak dicentang tetap
  tersimpan tapi tidak akan diundi ke peserta
- Setiap perubahan langsung tersimpan ke database saat tombol Simpan ditekan

### Bentuk soal

- **2 sampai 6 pilihan jawaban** (A–F), ditambah atau dikurangi per soal
- **Jawaban benar boleh lebih dari satu**, misal "A & C". Peserta harus memilih
  **persis semuanya** — kurang satu atau lebih satu tetap dihitung salah, dan
  mereka diberi tahu ada berapa jawaban benar sebelum menjawab

Tema dipilih di tab **🎮 Kendali** sebelum menekan Mulai Game, dan **terkunci
selama game berjalan** supaya materi tidak berganti di tengah sesi — peringkat
peserta jadi tidak sebanding kalau soalnya berpindah tema.

Bank soal **tidak ikut terhapus** saat Reset, dan tema yang sedang dipilih tetap
tersimpan supaya kelompok berikutnya bisa langsung mulai.

---

## Reset antar sesi

Tombol **♻️ Reset** di dashboard fasilitator menghapus seluruh peserta, jawaban,
catatan transaksi, dan riwayat putaran — siap untuk kelompok presentasi berikutnya.
Bank soal **tidak** ikut terhapus.

---

## Deploy ke Vercel

1. Buka [vercel.com/new](https://vercel.com/new), import repository ini dari GitHub
2. Vercel otomatis mendeteksi Vite — biarkan pengaturan build apa adanya
3. Di bagian **Environment Variables**, isi ketiga nilai dari `.env`
   (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_FASILITATOR_PIN`)
4. Klik **Deploy**

Setelah itu setiap `git push` ke branch `main` akan otomatis ter-deploy ulang.

---

## Catatan keamanan

Game ini tidak memakai sistem login — peserta cukup mengisi nama, dan semua akses
database memakai **anon key** dengan kebijakan RLS yang permisif. PIN fasilitator
melindungi **tampilan** dashboard, bukan database.

Artinya siapa pun yang punya link dan membuka kode sumber halaman secara teknis
bisa menulis ke database. Ini dapat diterima untuk game presentasi internal —
tapi **jangan simpan data sensitif** di project Supabase yang sama.
