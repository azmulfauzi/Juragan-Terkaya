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

export const LABEL_OPSI = ['A', 'B', 'C'] as const
