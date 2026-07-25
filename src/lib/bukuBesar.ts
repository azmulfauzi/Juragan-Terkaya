import { BONUS_BENAR, DENDA, MODAL_AWAL } from './config'
import type { JawabanPeserta, Peserta, Soal, Transaksi } from './types'

export interface BarisBukuBesar {
  urut: number
  jawaban: JawabanPeserta
  soal: Soal | undefined
  /** Bonus (positif) atau denda (negatif) dari jawaban ini. */
  perubahan: number
  keterangan: string
}

export interface BukuBesar {
  baris: BarisBukuBesar[]
  totalBonus: number
  totalDenda: number
  jumlahBenar: number
  jumlahSalah: number
  saldoAkhir: number
  /**
   * Selisih antara saldo tersimpan dan saldo hasil hitung ulang.
   * Bukan nol menandakan data dibuat dengan aturan skor lama, atau ditulis
   * oleh halaman peserta versi kedaluwarsa.
   */
  selisihHitung: number
}

/**
 * Menyusun buku besar satu peserta: modal awal, tiap jawaban beserta bonus atau
 * dendanya, lalu saldo akhir.
 *
 * Nominal transaksi pada soal TIDAK masuk hitungan — hanya bonus dan denda yang
 * menggerakkan saldo. Nominalnya tetap ditampilkan sebagai konteks agar peserta
 * mengingat transaksi apa yang sedang dibahas.
 */
export function hitungBukuBesar(
  peserta: Peserta,
  jawaban: JawabanPeserta[],
  transaksi: Transaksi[],
  soal: Soal[],
): BukuBesar {
  const soalPeta = new Map(soal.map((s) => [s.id, s]))

  const jawabanSaya = jawaban
    .filter((j) => j.peserta_id === peserta.id)
    .sort((a, b) => a.putaran - b.putaran)

  // Keterangan yang diisi sendiri oleh peserta, diindeks per putaran.
  const keteranganPeserta = new Map(
    transaksi.filter((t) => t.peserta_id === peserta.id).map((t) => [t.putaran, t.keterangan]),
  )

  const baris: BarisBukuBesar[] = jawabanSaya.map((j, i) => {
    const s = soalPeta.get(j.soal_id)
    return {
      urut: i + 1,
      jawaban: j,
      soal: s,
      perubahan: j.benar ? BONUS_BENAR : -DENDA,
      keterangan: keteranganPeserta.get(j.putaran) ?? s?.teks ?? '—',
    }
  })

  const jumlahBenar = jawabanSaya.filter((j) => j.benar).length
  const jumlahSalah = jawabanSaya.length - jumlahBenar
  const totalBonus = jumlahBenar * BONUS_BENAR
  const totalDenda = jumlahSalah * DENDA

  return {
    baris,
    totalBonus,
    totalDenda,
    jumlahBenar,
    jumlahSalah,
    saldoAkhir: peserta.saldo,
    selisihHitung: peserta.saldo - (MODAL_AWAL + totalBonus - totalDenda),
  }
}
