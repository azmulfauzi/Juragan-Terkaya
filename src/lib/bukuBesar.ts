import { BONUS_BENAR, DENDA, MODAL_AWAL } from './config'
import type { JawabanPeserta, Peserta, Soal, Transaksi } from './types'

export interface BarisBukuBesar {
  urut: number
  jawaban: JawabanPeserta
  soal: Soal | undefined
  /** Perubahan kas dari transaksi soal, sebelum bonus/denda. */
  efekNominal: number
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
 * Menyusun buku besar satu peserta: modal awal, tiap transaksi yang mengubah
 * saldo, total bonus dan denda, lalu saldo akhir.
 *
 * Hanya putaran saat peserta berstatus WAJIB yang dihitung — hanya itu yang
 * mempengaruhi saldo. Rinciannya direkonstruksi dari jawaban + bank soal, jadi
 * tetap lengkap walau peserta lupa mengisi form catatan.
 */
export function hitungBukuBesar(
  peserta: Peserta,
  jawaban: JawabanPeserta[],
  transaksi: Transaksi[],
  soal: Soal[],
): BukuBesar {
  const soalPeta = new Map(soal.map((s) => [s.id, s]))

  const jawabanWajib = jawaban
    .filter((j) => j.peserta_id === peserta.id && j.wajib)
    .sort((a, b) => a.putaran - b.putaran)

  // Keterangan yang diisi sendiri oleh peserta, diindeks per putaran.
  const keteranganPeserta = new Map(
    transaksi.filter((t) => t.peserta_id === peserta.id).map((t) => [t.putaran, t.keterangan]),
  )

  const baris: BarisBukuBesar[] = jawabanWajib.map((j, i) => {
    const s = soalPeta.get(j.soal_id)
    const efekNominal = !s
      ? 0
      : s.efek === 'masuk'
        ? s.nominal
        : s.efek === 'keluar'
          ? -s.nominal
          : 0

    return {
      urut: i + 1,
      jawaban: j,
      soal: s,
      efekNominal,
      keterangan: keteranganPeserta.get(j.putaran) ?? s?.teks ?? '—',
    }
  })

  const jumlahBenar = jawabanWajib.filter((j) => j.benar).length
  const jumlahSalah = jawabanWajib.length - jumlahBenar
  const totalBonus = jumlahBenar * BONUS_BENAR
  const totalDenda = jumlahSalah * DENDA

  const saldoHitung =
    MODAL_AWAL + baris.reduce((n, r) => n + r.efekNominal, 0) + totalBonus - totalDenda

  return {
    baris,
    totalBonus,
    totalDenda,
    jumlahBenar,
    jumlahSalah,
    saldoAkhir: peserta.saldo,
    selisihHitung: peserta.saldo - saldoHitung,
  }
}
