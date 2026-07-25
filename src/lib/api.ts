import { supabase } from './supabase'
import { SOAL_DEFAULT } from '../data/soal'
import { RIWAYAT_SOAL_MAX } from './config'
import type {
  GameState,
  JawabanPeserta,
  Peserta,
  PilihanWarna,
  Soal,
  Transaksi,
  Warna,
} from './types'

/** Membungkus error Supabase jadi pesan yang bisa dibaca manusia. */
function cek<T>(data: T | null, error: { message: string } | null, konteks: string): T {
  if (error) throw new Error(`${konteks}: ${error.message}`)
  if (data === null) throw new Error(`${konteks}: data kosong`)
  return data
}

// ───────────────────────────── STATUS GAME ─────────────────────────────

export async function ambilGameState(): Promise<GameState> {
  const { data, error } = await supabase.from('game_state').select('*').eq('id', 1).single()
  return cek(data, error, 'Gagal membaca status game')
}

export async function ubahGameState(patch: Partial<GameState>): Promise<void> {
  const { error } = await supabase.from('game_state').update(patch).eq('id', 1)
  if (error) throw new Error(`Gagal memperbarui status game: ${error.message}`)
}

/**
 * Membukukan seluruh perubahan saldo satu putaran sekaligus.
 * Dipanggil saat fasilitator menekan "Reveal Jawaban" — sampai saat itu saldo
 * peserta sengaja dibiarkan tetap agar tidak membocorkan benar/salah.
 */
export async function terapkanSaldoPutaran(putaran: number): Promise<void> {
  const { error } = await supabase.rpc('terapkan_saldo_putaran', { p_putaran: putaran })
  if (error) throw new Error(`Gagal membukukan saldo putaran: ${error.message}`)
}

export async function resetGame(): Promise<void> {
  const { error } = await supabase.rpc('reset_game')
  if (error) throw new Error(`Gagal mereset game: ${error.message}`)
}

// ─────────────────────────────── PESERTA ───────────────────────────────

export async function daftarPeserta(nama: string): Promise<Peserta> {
  const { data, error } = await supabase
    .from('peserta')
    .insert({ nama: nama.trim() })
    .select()
    .single()
  return cek(data, error, 'Gagal mendaftarkan peserta')
}

export async function ambilPeserta(id: string): Promise<Peserta | null> {
  const { data, error } = await supabase.from('peserta').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Gagal membaca data peserta: ${error.message}`)
  return data
}

export async function ambilSemuaPeserta(): Promise<Peserta[]> {
  const { data, error } = await supabase
    .from('peserta')
    .select('*')
    .order('created_at', { ascending: true })
  return cek(data, error, 'Gagal membaca daftar peserta')
}

export async function ubahSaldo(pesertaId: string, saldoBaru: number): Promise<void> {
  const { error } = await supabase.from('peserta').update({ saldo: saldoBaru }).eq('id', pesertaId)
  if (error) throw new Error(`Gagal memperbarui saldo: ${error.message}`)
}

// ──────────────────────────── PILIHAN WARNA ────────────────────────────

export async function simpanPilihanWarna(
  pesertaId: string,
  putaran: number,
  warna: Warna,
  otomatis = false,
): Promise<void> {
  const { error } = await supabase
    .from('pilihan_warna')
    .upsert(
      { peserta_id: pesertaId, putaran, warna, otomatis },
      { onConflict: 'peserta_id,putaran', ignoreDuplicates: true },
    )
  if (error) throw new Error(`Gagal menyimpan pilihan warna: ${error.message}`)
}

export async function ambilSemuaPilihanWarna(): Promise<PilihanWarna[]> {
  const { data, error } = await supabase.from('pilihan_warna').select('*')
  return cek(data, error, 'Gagal membaca pilihan warna')
}

export async function ambilPilihanWarnaSaya(
  pesertaId: string,
  putaran: number,
): Promise<PilihanWarna | null> {
  const { data, error } = await supabase
    .from('pilihan_warna')
    .select('*')
    .eq('peserta_id', pesertaId)
    .eq('putaran', putaran)
    .maybeSingle()
  if (error) throw new Error(`Gagal membaca pilihan warna: ${error.message}`)
  return data
}

// ─────────────────────────────── JAWABAN ───────────────────────────────

export async function simpanJawaban(
  jawaban: Omit<JawabanPeserta, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase
    .from('jawaban')
    .upsert(jawaban, { onConflict: 'peserta_id,putaran', ignoreDuplicates: true })
  if (error) throw new Error(`Gagal menyimpan jawaban: ${error.message}`)
}

export async function ambilSemuaJawaban(): Promise<JawabanPeserta[]> {
  const { data, error } = await supabase.from('jawaban').select('*')
  return cek(data, error, 'Gagal membaca jawaban')
}

export async function ambilJawabanSaya(
  pesertaId: string,
  putaran: number,
): Promise<JawabanPeserta | null> {
  const { data, error } = await supabase
    .from('jawaban')
    .select('*')
    .eq('peserta_id', pesertaId)
    .eq('putaran', putaran)
    .maybeSingle()
  if (error) throw new Error(`Gagal membaca jawaban: ${error.message}`)
  return data
}

// ────────────────────────────── TRANSAKSI ──────────────────────────────

export async function simpanTransaksi(
  transaksi: Omit<Transaksi, 'id' | 'created_at'>,
): Promise<void> {
  const { error } = await supabase.from('transaksi').insert(transaksi)
  if (error) throw new Error(`Gagal menyimpan catatan transaksi: ${error.message}`)
}

export async function ambilSemuaTransaksi(): Promise<Transaksi[]> {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .order('putaran', { ascending: false })
    .order('created_at', { ascending: false })
  return cek(data, error, 'Gagal membaca catatan transaksi')
}

export async function ambilTransaksiSaya(pesertaId: string): Promise<Transaksi[]> {
  const { data, error } = await supabase
    .from('transaksi')
    .select('*')
    .eq('peserta_id', pesertaId)
    .order('putaran', { ascending: false })
    .order('created_at', { ascending: false })
  return cek(data, error, 'Gagal membaca catatan transaksi')
}

// ──────────────────────────────── SOAL ────────────────────────────────

export async function ambilSemuaSoal(): Promise<Soal[]> {
  const { data, error } = await supabase.from('soal').select('*').order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca bank soal')
}

export async function ambilSoalById(id: number): Promise<Soal | null> {
  const { data, error } = await supabase.from('soal').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Gagal membaca soal: ${error.message}`)
  return data
}

/** Mengisi tabel soal dengan data default jika tabel masih kosong. */
export async function seedSoalJikaKosong(): Promise<Soal[]> {
  const { count, error } = await supabase.from('soal').select('id', { count: 'exact', head: true })
  if (error) throw new Error(`Gagal memeriksa bank soal: ${error.message}`)

  if ((count ?? 0) === 0) {
    const { error: errInsert } = await supabase.from('soal').insert(SOAL_DEFAULT)
    if (errInsert) throw new Error(`Gagal mengisi bank soal awal: ${errInsert.message}`)
  }
  return ambilSemuaSoal()
}

/** Menyimpan seluruh bank soal hasil editan fasilitator. */
export async function simpanSemuaSoal(daftarSoal: Soal[]): Promise<void> {
  const { error } = await supabase.from('soal').upsert(daftarSoal, { onConflict: 'id' })
  if (error) throw new Error(`Gagal menyimpan bank soal: ${error.message}`)
}

export async function hapusSoal(id: number): Promise<void> {
  const { error } = await supabase.from('soal').delete().eq('id', id)
  if (error) throw new Error(`Gagal menghapus soal: ${error.message}`)
}

// ──────────────────────── PEMILIHAN SOAL ACAK ────────────────────────

/**
 * Memilih 1 soal acak dengan warna tertentu, menghindari soal yang baru dipakai.
 * Jika semua soal warna itu sudah terpakai, riwayat diabaikan (fallback).
 */
export function pilihSoalAcak(
  semuaSoal: Soal[],
  warna: Warna,
  riwayat: number[],
): Soal | null {
  const sewarna = semuaSoal.filter((s) => s.warna === warna)
  if (sewarna.length === 0) return null

  const belumDipakai = sewarna.filter((s) => !riwayat.includes(s.id))
  const kandidat = belumDipakai.length > 0 ? belumDipakai : sewarna
  return kandidat[Math.floor(Math.random() * kandidat.length)]
}

/** Menambahkan id soal ke riwayat, memotong agar tidak melebihi batas. */
export function tambahRiwayat(riwayat: number[], soalId: number): number[] {
  return [...riwayat.filter((id) => id !== soalId), soalId].slice(-RIWAYAT_SOAL_MAX)
}
