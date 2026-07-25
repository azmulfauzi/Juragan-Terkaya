import type { JawabanPeserta, Peserta } from './types'

export interface PesertaPeringkat extends Peserta {
  /** Rata-rata lama menjawab (ms). null jika belum pernah menjawab tepat waktu. */
  rataWaktuMs: number | null
}

/**
 * Mengurutkan peserta untuk papan peringkat.
 *
 * Urutan penilaian:
 *   1. Saldo tertinggi
 *   2. Bila saldo sama — rata-rata waktu menjawab tercepat
 *   3. Bila keduanya sama — urut nama, supaya tampilannya stabil
 *
 * Dipakai rata-rata (bukan total) agar adil: peserta sukarela yang ikut
 * menjawab lebih sering tidak dirugikan oleh akumulasi waktu.
 */
export function hitungPeringkat(
  peserta: Peserta[],
  jawaban: JawabanPeserta[],
): PesertaPeringkat[] {
  const waktuPer = new Map<string, { total: number; jumlah: number }>()

  for (const j of jawaban) {
    if (j.waktu_jawab_ms === null) continue
    const akum = waktuPer.get(j.peserta_id) ?? { total: 0, jumlah: 0 }
    akum.total += j.waktu_jawab_ms
    akum.jumlah += 1
    waktuPer.set(j.peserta_id, akum)
  }

  return peserta
    .map((p) => {
      const akum = waktuPer.get(p.id)
      return {
        ...p,
        rataWaktuMs: akum && akum.jumlah > 0 ? akum.total / akum.jumlah : null,
      }
    })
    .sort((a, b) => {
      if (b.saldo !== a.saldo) return b.saldo - a.saldo

      // Saldo seri — yang rata-rata menjawabnya lebih cepat unggul.
      // Yang belum pernah menjawab dianggap paling lambat.
      const wa = a.rataWaktuMs ?? Number.POSITIVE_INFINITY
      const wb = b.rataWaktuMs ?? Number.POSITIVE_INFINITY
      if (wa !== wb) return wa - wb

      return a.nama.localeCompare(b.nama, 'id')
    })
}

/** Format rata-rata waktu untuk ditampilkan, contoh: "⌀ 8,3 dtk" */
export function formatRataWaktu(ms: number | null): string {
  if (ms === null) return '—'
  return `⌀ ${(ms / 1000).toFixed(1).replace('.', ',')} dtk`
}
