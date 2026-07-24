import { supabase } from './supabase'

/**
 * Selisih (ms) antara jam server dan jam perangkat ini.
 * Jam HP peserta sering meleset; tanpa koreksi ini, hitungan mundur bisa
 * berbeda-beda di tiap perangkat.
 */
let offsetMs = 0

export async function sinkronkanWaktu(): Promise<void> {
  try {
    const sebelum = Date.now()
    const { data, error } = await supabase.rpc('waktu_server')
    if (error || !data) return

    const sesudah = Date.now()
    const latensiSatuArah = (sesudah - sebelum) / 2
    offsetMs = new Date(data as string).getTime() + latensiSatuArah - sesudah
  } catch {
    // Gagal sinkron bukan masalah fatal — pakai jam lokal apa adanya.
    offsetMs = 0
  }
}

/** Waktu sekarang menurut jam server (ms). */
export function sekarang(): number {
  return Date.now() + offsetMs
}
