import { DURASI_SOAL, POIN_MAKS, POIN_MIN } from './config'
import type { JawabanPeserta, Peserta, Soal } from './types'

/**
 * Poin satu jawaban.
 *
 * Benar → antara POIN_MIN dan POIN_MAKS, menurun lurus seiring waktu terpakai.
 * Salah atau tidak menjawab → 0.
 */
export function poinJawaban(j: JawabanPeserta): number {
  if (!j.benar) return 0
  if (j.waktu_jawab_ms === null) return POIN_MIN

  const durasiMs = DURASI_SOAL * 1000
  const rasioTerpakai = Math.min(1, Math.max(0, j.waktu_jawab_ms / durasiMs))
  return Math.round(POIN_MAKS - (POIN_MAKS - POIN_MIN) * rasioTerpakai)
}

export interface PesertaSkor extends Peserta {
  poin: number
  benar: number
  /** Berapa soal yang sudah dinilai untuk peserta ini. */
  dijawab: number
  /** Rata-rata lama menjawab (ms). null bila belum pernah menjawab tepat waktu. */
  rataWaktuMs: number | null
}

/**
 * Hanya jawaban dari putaran yang SUDAH dibuka fasilitator yang dinilai.
 *
 * Penanda `diterapkan` dipasang saat reveal. Tanpa filter ini, peserta bisa
 * menebak benar/salah dari poinnya yang bertambah sebelum jawaban dibuka —
 * dan layar fasilitator yang di-share pun ikut membocorkannya.
 */
export function jawabanTerbuka(jawaban: JawabanPeserta[]): JawabanPeserta[] {
  return jawaban.filter((j) => j.diterapkan)
}

/**
 * Menyusun papan peringkat.
 *
 * Urutan penilaian:
 *   1. Poin tertinggi
 *   2. Jumlah jawaban benar terbanyak
 *   3. Rata-rata waktu menjawab tercepat
 *   4. Nama, supaya urutannya stabil
 */
export function hitungPeringkat(
  peserta: Peserta[],
  jawaban: JawabanPeserta[],
): PesertaSkor[] {
  const terbuka = jawabanTerbuka(jawaban)

  return peserta
    .map((p) => {
      const milikDia = terbuka.filter((j) => j.peserta_id === p.id)
      const berwaktu = milikDia.filter((j) => j.waktu_jawab_ms !== null)
      const totalWaktu = berwaktu.reduce((n, j) => n + (j.waktu_jawab_ms ?? 0), 0)

      return {
        ...p,
        poin: milikDia.reduce((n, j) => n + poinJawaban(j), 0),
        benar: milikDia.filter((j) => j.benar).length,
        dijawab: milikDia.length,
        rataWaktuMs: berwaktu.length > 0 ? totalWaktu / berwaktu.length : null,
      }
    })
    .sort((a, b) => {
      if (b.poin !== a.poin) return b.poin - a.poin
      if (b.benar !== a.benar) return b.benar - a.benar

      const wa = a.rataWaktuMs ?? Number.POSITIVE_INFINITY
      const wb = b.rataWaktuMs ?? Number.POSITIVE_INFINITY
      if (wa !== wb) return wa - wb

      return a.nama.localeCompare(b.nama, 'id')
    })
}

export interface BarisRiwayat {
  urut: number
  jawaban: JawabanPeserta
  soal: Soal | undefined
  poin: number
}

export interface RiwayatPeserta {
  baris: BarisRiwayat[]
  poin: number
  benar: number
  salah: number
  rataWaktuMs: number | null
}

/** Riwayat jawaban satu peserta, untuk ditampilkan ke dirinya dan ke fasilitator. */
export function hitungRiwayat(
  peserta: Peserta,
  jawaban: JawabanPeserta[],
  soal: Soal[],
): RiwayatPeserta {
  const soalPeta = new Map(soal.map((s) => [s.id, s]))

  const milikDia = jawabanTerbuka(jawaban)
    .filter((j) => j.peserta_id === peserta.id)
    .sort((a, b) => a.putaran - b.putaran)

  const baris: BarisRiwayat[] = milikDia.map((j, i) => ({
    urut: i + 1,
    jawaban: j,
    soal: soalPeta.get(j.soal_id),
    poin: poinJawaban(j),
  }))

  const berwaktu = milikDia.filter((j) => j.waktu_jawab_ms !== null)
  const benar = milikDia.filter((j) => j.benar).length

  return {
    baris,
    poin: baris.reduce((n, r) => n + r.poin, 0),
    benar,
    salah: milikDia.length - benar,
    rataWaktuMs:
      berwaktu.length > 0
        ? berwaktu.reduce((n, j) => n + (j.waktu_jawab_ms ?? 0), 0) / berwaktu.length
        : null,
  }
}

/** Format poin dengan pemisah ribuan, contoh: 7350 -> "7.350" */
export function formatPoin(poin: number): string {
  return poin.toLocaleString('id-ID')
}

/** Format rata-rata waktu, contoh: "⌀ 8,3 dtk" */
export function formatRataWaktu(ms: number | null): string {
  if (ms === null) return '—'
  return `⌀ ${(ms / 1000).toFixed(1).replace('.', ',')} dtk`
}

/** Format waktu satu jawaban, contoh: "8,3 dtk" */
export function formatWaktu(ms: number | null): string {
  if (ms === null) return '—'
  return `${(ms / 1000).toFixed(1).replace('.', ',')} dtk`
}
