// Tipe data inti game "Juragan Terkaya".
// Nama field sengaja memakai Bahasa Indonesia agar selaras dengan PRD & skema database.

export type Warna = 'merah' | 'kuning' | 'hijau' | 'biru'
export type Efek = 'masuk' | 'keluar' | 'netral'
export type Pilihan = 'A' | 'B' | 'C'

/**
 * Fase permainan (disimpan di baris tunggal `game_state`).
 * - menunggu    : game belum dimulai / antar putaran
 * - pilih_warna : peserta memilih 1 dari 4 warna (10 detik)
 * - spin        : fasilitator memutar roda, peserta menunggu
 * - soal        : soal aktif, peserta menjawab (30 detik)
 * - reveal      : jawaban benar sudah dibuka fasilitator
 * - selesai     : game berakhir, tampilkan papan skor final
 */
export type Fase = 'menunggu' | 'pilih_warna' | 'spin' | 'soal' | 'reveal' | 'selesai'

export interface Soal {
  id: number
  warna: Warna
  teks: string
  opsi: string[]
  jawaban: Pilihan
  nominal: number
  efek: Efek
  insight: string
}

export interface GameState {
  id: number
  berjalan: boolean
  fase: Fase
  putaran: number
  warna_spin: Warna | null
  soal_id: number | null
  /** ISO timestamp saat fase dimulai — dipakai semua klien untuk menghitung sisa timer yang sama. */
  fase_mulai: string | null
  reveal: boolean
  show_insight: boolean
  /** ID soal yang baru saja dipakai, untuk menghindari repetisi. */
  riwayat_soal: number[]
}

export interface Peserta {
  id: string
  nama: string
  saldo: number
  created_at: string
}

export interface PilihanWarna {
  id: number
  peserta_id: string
  putaran: number
  warna: Warna
  /** true jika warna dipilihkan otomatis oleh sistem karena peserta tidak sempat memilih. */
  otomatis: boolean
}

export interface JawabanPeserta {
  id: number
  peserta_id: string
  putaran: number
  soal_id: number
  /** null = tidak menjawab sampai waktu habis (timeout). */
  pilihan: Pilihan | null
  benar: boolean
  /** true = warna peserta cocok dengan hasil spin (wajib jawab); false = ikut sukarela. */
  wajib: boolean
  delta_saldo: number
  created_at: string
}

export interface Transaksi {
  id: number
  peserta_id: string
  putaran: number
  keterangan: string
  jumlah: number
  arah: 'masuk' | 'keluar'
  created_at: string
}
