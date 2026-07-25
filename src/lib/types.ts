// Tipe data inti game "Juragan Terkaya".
// Nama field sengaja memakai Bahasa Indonesia agar selaras dengan PRD & skema database.

export type Efek = 'masuk' | 'keluar' | 'netral'

/** Label opsi jawaban. Satu soal boleh punya 2 sampai 6 opsi. */
export type Pilihan = 'A' | 'B' | 'C' | 'D' | 'E' | 'F'

/**
 * Wadah pengelompokan soal yang dibuat fasilitator, misal "Literasi Keuangan
 * UMKM" atau "Pencatatan Kas Harian". Satu sesi permainan memakai satu tema.
 */
export interface Tema {
  id: number
  nama: string
  deskripsi: string
  created_at: string
}

/**
 * Fase permainan (disimpan di baris tunggal `game_state`).
 * - menunggu : game belum dimulai
 * - soal     : soal aktif, seluruh peserta menjawab (30 detik)
 * - reveal   : jawaban benar sudah dibuka fasilitator
 * - skor     : papan pemenang putaran + peringkat kumulatif, sebelum lanjut
 * - selesai  : game berakhir, tampilkan papan skor final
 */
export type Fase = 'menunggu' | 'soal' | 'reveal' | 'skor' | 'selesai'

export interface Soal {
  id: number
  tema_id: number
  /** Soal nonaktif tetap tersimpan tapi tidak ikut diundi ke peserta. */
  aktif: boolean
  teks: string
  /** 2 sampai 6 opsi, ditampilkan berlabel A, B, C, dan seterusnya. */
  opsi: string[]
  /** Boleh lebih dari satu, misal ['A', 'C']. Peserta harus memilih tepat semuanya. */
  jawaban_benar: Pilihan[]
  nominal: number
  efek: Efek
  insight: string
}

export interface GameState {
  id: number
  berjalan: boolean
  fase: Fase
  putaran: number
  /** Tema yang sedang dimainkan — soal diundi hanya dari tema ini. */
  tema_id: number | null
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

export interface JawabanPeserta {
  id: number
  peserta_id: string
  putaran: number
  soal_id: number
  /** null = tidak menjawab sampai waktu habis (timeout). */
  pilihan_ganda: Pilihan[] | null
  benar: boolean
  /**
   * Sisa dari mekanik warna lama. Seluruh peserta kini menjawab setiap soal,
   * jadi nilainya selalu true. Kolomnya dipertahankan agar data sesi lama
   * tetap terbaca tanpa perlu migrasi.
   */
  wajib: boolean
  /** Bonus jawaban benar atau denda jawaban salah. Nominal soal tidak lagi terlibat. */
  delta_saldo: number
  /** Lama menjawab (ms) sejak soal tampil. null untuk timeout. Penentu pemenang tercepat. */
  waktu_jawab_ms: number | null
  /** true jika delta_saldo sudah dibukukan ke saldo peserta (terjadi saat reveal). */
  diterapkan: boolean
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
