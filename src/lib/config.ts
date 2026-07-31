/** Durasi menjawab satu soal (detik). */
export const DURASI_SOAL = 30

/**
 * Poin untuk jawaban BENAR, bergantung kecepatan menjawab:
 *   - menjawab di detik pertama  -> mendekati POIN_MAKS
 *   - menjawab di detik terakhir -> POIN_MIN
 * Jawaban salah atau tidak menjawab mendapat 0.
 *
 * Batas bawah sengaja tidak nol supaya peserta yang berpikir lama tapi tetap
 * benar masih dihargai — yang dibedakan kecepatannya, bukan diabaikan.
 *
 * Konsekuensi yang perlu disadari: peserta cepat dengan 8 jawaban benar bisa
 * mengalahkan peserta lambat dengan 9 jawaban benar. Itu memang disengaja —
 * game ini menilai ketepatan DAN kecepatan sekaligus.
 */
export const POIN_MAKS = 1000
export const POIN_MIN = 500

/** PIN akses halaman fasilitator. Ubah lewat file .env (VITE_FASILITATOR_PIN). */
export const FASILITATOR_PIN = import.meta.env.VITE_FASILITATOR_PIN || '2024'

export const EFEK_META = {
  masuk: { label: 'Pemasukan', emoji: '➕', kelas: 'bg-green-500/15 text-green-400 border-green-500/40' },
  keluar: { label: 'Pengeluaran', emoji: '➖', kelas: 'bg-red-500/15 text-red-400 border-red-500/40' },
  netral: { label: 'Diskusi', emoji: '⬜', kelas: 'bg-slate-500/15 text-slate-300 border-slate-500/40' },
} as const
