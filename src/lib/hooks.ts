import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { ambilGameState } from './api'
import { sekarang } from './waktu'
import type { GameState } from './types'

/**
 * Mendengarkan status game secara realtime.
 * Polling cadangan tiap 5 detik dipakai sebagai jaring pengaman bila koneksi
 * realtime peserta sempat terputus (sesuai kebutuhan resiliensi jaringan).
 */
export function useGameState() {
  const [state, setState] = useState<GameState | null>(null)
  const [error, setError] = useState<string | null>(null)

  const muat = useCallback(async () => {
    try {
      setState(await ambilGameState())
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    muat()

    const channel = supabase
      .channel('perubahan-game-state')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_state' },
        (payload) => setState(payload.new as GameState),
      )
      .subscribe()

    const polling = setInterval(muat, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(polling)
    }
  }, [muat])

  return { state, error, muatUlang: muat }
}

/**
 * Menjalankan `aksi` setiap kali salah satu tabel berubah.
 * Perubahan digabung (debounce) agar dashboard tidak dirender berulang-ulang
 * saat 50+ peserta menjawab hampir bersamaan.
 */
export function useRealtimeTabel(tabel: string[], aksi: () => void, jedaMs = 400) {
  const aksiRef = useRef(aksi)
  aksiRef.current = aksi

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const jadwalkan = () => {
      clearTimeout(timer)
      timer = setTimeout(() => aksiRef.current(), jedaMs)
    }

    const channel = supabase.channel(`perubahan-${tabel.join('-')}`)
    for (const t of tabel) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, jadwalkan)
    }
    channel.subscribe()

    // Jaring pengaman bila realtime terputus.
    const polling = setInterval(jadwalkan, 5000)

    return () => {
      clearTimeout(timer)
      clearInterval(polling)
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabel.join(','), jedaMs])
}

/**
 * Sisa waktu (detik) dihitung dari timestamp server saat fase dimulai,
 * sehingga semua perangkat menampilkan angka yang sama.
 */
export function useSisaWaktu(faseMulai: string | null, durasiDetik: number): number {
  const hitung = useCallback(() => {
    if (!faseMulai) return durasiDetik
    const lewat = (sekarang() - new Date(faseMulai).getTime()) / 1000
    return Math.max(0, Math.min(durasiDetik, Math.ceil(durasiDetik - lewat)))
  }, [faseMulai, durasiDetik])

  const [sisa, setSisa] = useState(hitung)

  useEffect(() => {
    setSisa(hitung())
    const timer = setInterval(() => setSisa(hitung()), 250)
    return () => clearInterval(timer)
  }, [hitung])

  return sisa
}

/** Menyimpan identitas peserta di perangkatnya agar tidak hilang saat refresh. */
const KUNCI_PESERTA = 'juragan-terkaya:peserta-id'

export function bacaIdPeserta(): string | null {
  try {
    return localStorage.getItem(KUNCI_PESERTA)
  } catch {
    return null
  }
}

export function simpanIdPeserta(id: string | null): void {
  try {
    if (id) localStorage.setItem(KUNCI_PESERTA, id)
    else localStorage.removeItem(KUNCI_PESERTA)
  } catch {
    // localStorage diblokir (mode privat) — abaikan, peserta cukup daftar ulang.
  }
}
