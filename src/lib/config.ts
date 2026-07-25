/** Modal awal setiap peserta. */
export const MODAL_AWAL = 10_000_000

/** Denda untuk jawaban salah atau tidak menjawab sampai waktu habis. */
export const DENDA = 500_000

/** Bonus untuk jawaban benar. */
export const BONUS_BENAR = 1_000_000

/**
 * Rumus perubahan saldo — berlaku sama untuk seluruh peserta:
 *
 *     delta = benar ? +BONUS_BENAR : −DENDA
 *
 * Nominal dan jenis efek soal TIDAK mempengaruhi saldo. Keduanya tetap ada di
 * bank soal sebagai bahan pembelajaran (ditampilkan setelah reveal dan mengisi
 * form catatan transaksi), tapi tidak lagi menggerakkan angka.
 *
 * Konsekuensinya disengaja: saldo menjadi cerminan langsung dari jumlah jawaban
 * benar, sehingga peringkat mudah dijelaskan ke peserta dan tidak bisa terbantu
 * keberuntungan jenis soal yang kebetulan didapat.
 *
 * | Hasil jawaban          | Perubahan saldo |
 * |------------------------|-----------------|
 * | Benar                  | +1.000.000      |
 * | Salah / tidak menjawab |   −500.000      |
 */

/** Durasi fase menjawab soal (detik). */
export const DURASI_SOAL = 30

/** Berapa soal terakhir yang diingat sistem agar tidak cepat berulang. */
export const RIWAYAT_SOAL_MAX = 20

/**
 * Kecepatan menjawab TIDAK menambah saldo. Perannya hanya sebagai penentu
 * urutan saat terjadi seri:
 *   - Podium putaran : di antara yang sama-sama benar, yang tercepat menang.
 *   - Peringkat akhir: di antara yang saldonya sama, yang rata-rata menjawabnya
 *                      lebih cepat berada di atas.
 * Logikanya ada di src/lib/peringkat.ts.
 */

/** PIN akses halaman fasilitator. Ubah lewat file .env (VITE_FASILITATOR_PIN). */
export const FASILITATOR_PIN = import.meta.env.VITE_FASILITATOR_PIN || '2024'

export const EFEK_META = {
  masuk: { label: 'Pemasukan', emoji: '➕', kelas: 'bg-green-500/15 text-green-400 border-green-500/40' },
  keluar: { label: 'Pengeluaran', emoji: '➖', kelas: 'bg-red-500/15 text-red-400 border-red-500/40' },
  netral: { label: 'Diskusi', emoji: '⬜', kelas: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
} as const
