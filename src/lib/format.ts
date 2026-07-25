/** Format angka menjadi Rupiah, contoh: 10000000 -> "Rp10.000.000" */
export function rupiah(nilai: number): string {
  const negatif = nilai < 0
  const angka = Math.abs(Math.round(nilai)).toLocaleString('id-ID')
  return `${negatif ? '-' : ''}Rp${angka}`
}

/** Format selisih dengan tanda eksplisit, contoh: "+Rp1.500.000" / "-Rp500.000" */
export function selisih(nilai: number): string {
  if (nilai === 0) return 'Rp0'
  return `${nilai > 0 ? '+' : '-'}Rp${Math.abs(Math.round(nilai)).toLocaleString('id-ID')}`
}

import type { Pilihan } from './types'

/** Label opsi yang tersedia. Satu soal memakai sebagian dari daftar ini. */
export const LABEL_OPSI: Pilihan[] = ['A', 'B', 'C', 'D', 'E', 'F']

export const MIN_OPSI = 2
export const MAKS_OPSI = LABEL_OPSI.length

/**
 * Jawaban dianggap benar hanya bila peserta memilih PERSIS semua opsi yang
 * benar — tidak kurang, tidak lebih. Tidak ada nilai sebagian.
 */
export function jawabanCocok(dipilih: Pilihan[] | null, benar: Pilihan[]): boolean {
  if (!dipilih || dipilih.length !== benar.length) return false
  const a = [...dipilih].sort()
  const b = [...benar].sort()
  return a.every((v, i) => v === b[i])
}

/** Menampilkan daftar pilihan jadi teks, misal ['A','C'] -> "A & C" */
export function gabungPilihan(daftar: Pilihan[] | null): string {
  if (!daftar || daftar.length === 0) return '—'
  return daftar.join(' & ')
}
