# 💰 Juragan Terkaya

Game edukasi literasi keuangan UMKM untuk dimainkan serentak oleh banyak peserta
(50+) dari HP masing-masing, dikendalikan satu fasilitator dari layar besar.

Dua pesan utama yang ditanamkan: **pisahkan uang pribadi dan usaha**, serta
**catat setiap transaksi usaha**.

Spesifikasi lengkap ada di [prd_juragan_terkaya.md](prd_juragan_terkaya.md).

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

1. Fasilitator klik **Mulai Game** → peserta punya 10 detik memilih 1 dari 4 warna
   (yang tidak sempat memilih akan dipilihkan sistem secara acak)
2. Fasilitator klik **Putar Roda** → roda berhenti di satu warna
3. Sistem mengambil 1 soal acak berwarna itu. Peserta yang warnanya cocok **wajib**
   menjawab dalam 30 detik; peserta lain **boleh ikut** menjawab
4. Jawaban benar mengubah saldo sesuai efek soal; salah atau telat kena denda
5. Peserta wajib yang menjawab benar mengisi **form catatan transaksi**
6. Fasilitator klik **Reveal Jawaban** lalu **Tampilkan Insight**
7. Klik **Putaran Berikutnya**, atau **Akhiri Game** untuk menutup sesi

Jumlah putaran tidak dibatasi — fasilitator yang menentukan kapan berhenti.

---

## Pengaturan yang bisa diubah

Semua ada di [`src/lib/config.ts`](src/lib/config.ts):

| Konstanta | Default | Arti |
|---|---|---|
| `MODAL_AWAL` | `10.000.000` | Saldo awal tiap peserta |
| `DENDA` | `500.000` | Potongan untuk jawaban salah / telat |
| `DURASI_PILIH_WARNA` | `10` detik | Waktu memilih warna |
| `DURASI_SOAL` | `30` detik | Waktu menjawab soal |
| `RIWAYAT_SOAL_MAX` | `20` | Berapa soal terakhir dihindari agar tidak berulang |
| `SUKARELA_MEMPENGARUHI_SALDO` | `true` | Apakah jawaban sukarela ikut mengubah saldo |

PIN fasilitator diatur lewat `VITE_FASILITATOR_PIN` di `.env`.

**Bank soal** tidak perlu diubah lewat kode — fasilitator dapat mengedit,
menambah, dan menyimpannya langsung dari tombol **✏️ Edit Soal** di dashboard.
Perubahan tersimpan permanen di database dan tidak ikut terhapus saat Reset.

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
