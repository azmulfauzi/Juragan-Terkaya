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
4. Fasilitator klik **Reveal Jawaban** → saat inilah poin seluruh peserta
   dihitung serentak, dan peserta baru tahu benar/salah
5. Fasilitator klik **Tampilkan Insight** untuk membahas pelajarannya
6. Fasilitator klik **Lihat Papan Skor** → muncul **podium tercepat** putaran itu
   dan **peringkat poin kumulatif**, di layar fasilitator maupun HP peserta
7. Klik **Soal Berikutnya**, atau **Akhiri Game** untuk menutup sesi lebih awal

> **Penting:** menekan **Reveal Jawaban** tidak boleh dilewat. Poin peserta baru
> dihitung pada langkah itu — kalau dilewati, papan skor tidak bergerak.

### Perhitungan poin

Jawaban **benar** bernilai **500–1000 poin** tergantung kecepatan; menjawab di
detik pertama mendekati 1000, di detik terakhir tepat 500. Jawaban **salah atau
tidak menjawab** bernilai **0**.

Poin dijumlahkan dari seluruh putaran. Batas bawah sengaja tidak nol supaya
peserta yang berpikir lama tapi tetap benar masih dihargai — yang dibedakan
kecepatannya, bukan diabaikan.

> **Konsekuensi yang perlu disadari:** peserta cepat dengan 8 jawaban benar bisa
> mengalahkan peserta lambat dengan 9 jawaban benar. Itu memang disengaja — game
> ini menilai ketepatan dan kecepatan sekaligus.

Nominal dan jenis efek soal **tidak mempengaruhi poin**. Keduanya tetap ada di
bank soal sebagai bahan pembelajaran dan hanya ditampilkan setelah reveal.

### Penentuan pemenang

- **Podium putaran** — di antara peserta yang sama-sama menjawab **benar**, yang
  **tercepat** menang.
- **Peringkat akhir** — poin tertinggi. Bila poin seri: jumlah benar terbanyak,
  lalu rata-rata waktu tercepat.

### Kapan permainan berakhir

Permainan berhenti **setelah seluruh soal yang dicentang habis dimainkan** — soal
tidak diulang dari awal. Kalau kamu mencentang 10 soal, sesi memang selesai
setelah soal ke-10, dan papan skor final langsung tampil.

Panel Kendali menampilkan progres **"Soal dimainkan 4 / 10"** supaya kamu tahu
tinggal berapa.

---

## Pengaturan yang bisa diubah

Semua ada di [`src/lib/config.ts`](src/lib/config.ts):

| Konstanta | Default | Arti |
|---|---|---|
| `DURASI_SOAL` | `30` detik | Waktu menjawab soal |
| `POIN_MAKS` | `1000` | Poin jawaban benar tercepat |
| `POIN_MIN` | `500` | Poin jawaban benar paling lambat |

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
dan riwayat soal yang sudah keluar — siap untuk kelompok presentasi berikutnya.
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
