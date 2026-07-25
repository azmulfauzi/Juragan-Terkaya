import { supabase } from './supabase'
import { SOAL_DEFAULT } from '../data/soal'
import { RIWAYAT_SOAL_MAX } from './config'
import type { GameState, JawabanPeserta, Peserta, Soal, Tema, Transaksi } from './types'

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

/** Seluruh jawaban milik satu peserta, untuk menyusun buku besarnya. */
export async function ambilJawabanPeserta(pesertaId: string): Promise<JawabanPeserta[]> {
  const { data, error } = await supabase
    .from('jawaban')
    .select('*')
    .eq('peserta_id', pesertaId)
    .order('putaran', { ascending: true })
  return cek(data, error, 'Gagal membaca riwayat jawaban')
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

// ──────────────────────────────── TEMA ────────────────────────────────

export async function ambilSemuaTema(): Promise<Tema[]> {
  const { data, error } = await supabase.from('tema').select('*').order('nama', { ascending: true })
  return cek(data, error, 'Gagal membaca daftar tema')
}

export async function buatTema(nama: string, deskripsi = ''): Promise<Tema> {
  const { data, error } = await supabase
    .from('tema')
    .insert({ nama: nama.trim(), deskripsi: deskripsi.trim() })
    .select()
    .single()
  return cek(data, error, 'Gagal membuat tema')
}

export async function ubahTema(id: number, patch: Partial<Pick<Tema, 'nama' | 'deskripsi'>>) {
  const { error } = await supabase.from('tema').update(patch).eq('id', id)
  if (error) throw new Error(`Gagal memperbarui tema: ${error.message}`)
}

/** Menghapus tema beserta seluruh soal di dalamnya (cascade dari database). */
export async function hapusTema(id: number): Promise<void> {
  const { error } = await supabase.from('tema').delete().eq('id', id)
  if (error) throw new Error(`Gagal menghapus tema: ${error.message}`)
}

// ──────────────────────────────── SOAL ────────────────────────────────

export async function ambilSemuaSoal(): Promise<Soal[]> {
  const { data, error } = await supabase.from('soal').select('*').order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca bank soal')
}

export async function ambilSoalTema(temaId: number): Promise<Soal[]> {
  const { data, error } = await supabase
    .from('soal')
    .select('*')
    .eq('tema_id', temaId)
    .order('id', { ascending: true })
  return cek(data, error, 'Gagal membaca soal tema')
}

/** Menyalakan atau mematikan satu soal dari daftar yang diundi. */
export async function ubahAktifSoal(id: number, aktif: boolean): Promise<void> {
  const { error } = await supabase.from('soal').update({ aktif }).eq('id', id)
  if (error) throw new Error(`Gagal mengubah status soal: ${error.message}`)
}

/** Menyalakan atau mematikan seluruh soal dalam satu tema sekaligus. */
export async function ubahAktifSemuaSoal(temaId: number, aktif: boolean): Promise<void> {
  const { error } = await supabase.from('soal').update({ aktif }).eq('tema_id', temaId)
  if (error) throw new Error(`Gagal mengubah status soal: ${error.message}`)
}

export async function ambilSoalById(id: number): Promise<Soal | null> {
  const { data, error } = await supabase.from('soal').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(`Gagal membaca soal: ${error.message}`)
  return data
}

/**
 * Mengisi bank soal dengan tema bawaan bila database masih benar-benar kosong.
 * Dipakai pada pemasangan baru; database yang sudah berisi soal tidak disentuh.
 */
export async function seedTemaJikaKosong(): Promise<Tema[]> {
  const tema = await ambilSemuaTema()
  if (tema.length > 0) return tema

  const temaBaru = await buatTema(
    'Literasi Keuangan UMKM',
    'Bank soal bawaan: penjualan tunai, piutang, hutang, prive, dan kebiasaan mencatat harian.',
  )
  const { error } = await supabase
    .from('soal')
    .insert(SOAL_DEFAULT.map((s) => ({ ...s, tema_id: temaBaru.id })))
  if (error) throw new Error(`Gagal mengisi bank soal awal: ${error.message}`)

  return ambilSemuaTema()
}

/** Nomor soal ditentukan database (sequence), jadi tidak dikirim dari sini. */
export async function buatSoal(soal: Omit<Soal, 'id'>): Promise<Soal> {
  const { data, error } = await supabase.from('soal').insert(soal).select().single()
  return cek(data, error, 'Gagal menambah soal')
}

export async function ubahSoal(id: number, patch: Partial<Omit<Soal, 'id'>>): Promise<void> {
  const { error } = await supabase.from('soal').update(patch).eq('id', id)
  if (error) throw new Error(`Gagal menyimpan soal: ${error.message}`)
}

export async function hapusSoal(id: number): Promise<void> {
  const { error } = await supabase.from('soal').delete().eq('id', id)
  if (error) throw new Error(`Gagal menghapus soal: ${error.message}`)
}

// ──────────────────────── PEMILIHAN SOAL ACAK ────────────────────────

/**
 * Memilih 1 soal acak dari soal yang AKTIF, menghindari soal yang baru dipakai.
 * Jika semua soal aktif sudah terpakai, riwayat diabaikan (fallback).
 */
export function pilihSoalAcak(semuaSoal: Soal[], riwayat: number[]): Soal | null {
  const aktif = semuaSoal.filter((s) => s.aktif)
  if (aktif.length === 0) return null

  const belumDipakai = aktif.filter((s) => !riwayat.includes(s.id))
  const kandidat = belumDipakai.length > 0 ? belumDipakai : aktif
  return kandidat[Math.floor(Math.random() * kandidat.length)]
}

/** Menambahkan id soal ke riwayat, memotong agar tidak melebihi batas. */
export function tambahRiwayat(riwayat: number[], soalId: number): number[] {
  return [...riwayat.filter((id) => id !== soalId), soalId].slice(-RIWAYAT_SOAL_MAX)
}
