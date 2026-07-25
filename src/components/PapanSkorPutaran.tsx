import { useMemo } from 'react'
import { MODAL_AWAL } from '../lib/config'
import { rupiah, selisih } from '../lib/format'
import { formatRataWaktu, hitungPeringkat } from '../lib/peringkat'
import type { JawabanPeserta, Peserta } from '../lib/types'

interface Props {
  putaran: number
  /** Jawaban pada putaran ini saja — dipakai untuk podium tercepat. */
  jawaban: JawabanPeserta[]
  /** Seluruh jawaban sepanjang game — dipakai sebagai penentu seri peringkat. */
  semuaJawaban: JawabanPeserta[]
  /** Seluruh peserta beserta saldo terkini. */
  peserta: Peserta[]
  /** Baris peserta ini akan disorot (dipakai di halaman peserta). */
  sorotPesertaId?: string
  /** Batasi jumlah baris peringkat; sisanya diringkas. */
  maksBaris?: number
  /** Sembunyikan podium putaran, misalnya di layar akhir game. */
  sembunyikanPodium?: boolean
}

const MEDALI = ['🥇', '🥈', '🥉']

function detik(ms: number | null): string {
  if (ms === null) return '—'
  return `${(ms / 1000).toFixed(1)} dtk`
}

/**
 * Papan pemenang satu putaran (jawaban benar tercepat, ala Kahoot) sekaligus
 * peringkat kumulatif seluruh peserta.
 */
export default function PapanSkorPutaran({
  putaran,
  jawaban,
  semuaJawaban,
  peserta,
  sorotPesertaId,
  maksBaris,
  sembunyikanPodium,
}: Props) {
  const nama = useMemo(() => new Map(peserta.map((p) => [p.id, p.nama])), [peserta])

  /** Jawaban benar, diurutkan dari yang paling cepat. */
  const tercepat = useMemo(
    () =>
      jawaban
        .filter((j) => j.benar && j.waktu_jawab_ms !== null)
        .sort((a, b) => (a.waktu_jawab_ms ?? 0) - (b.waktu_jawab_ms ?? 0))
        .slice(0, 3),
    [jawaban],
  )

  const peringkat = useMemo(
    () => hitungPeringkat(peserta, semuaJawaban),
    [peserta, semuaJawaban],
  )
  // Tiga besar ditonjolkan sebagai podium, sisanya jadi daftar biasa.
  const tigaBesar = peringkat.slice(0, 3)
  const sisanya = peringkat.slice(3)
  const ditampilkan = maksBaris ? sisanya.slice(0, Math.max(0, maksBaris - 3)) : sisanya

  const posisiSaya = sorotPesertaId ? peringkat.findIndex((p) => p.id === sorotPesertaId) : -1
  const sayaDiLuarDaftar = posisiSaya >= 0 && posisiSaya >= 3 + ditampilkan.length

  return (
    <div className="animasi-muncul space-y-4">
      {/* Pemenang putaran */}
      <div
        className={`rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5 ${
          sembunyikanPodium ? 'hidden' : ''
        }`}
      >
        <h3 className="text-center font-bold text-amber-300">
          ⚡ Tercepat &amp; benar — Putaran {putaran}
        </h3>

        {tercepat.length === 0 ? (
          <p className="mt-3 text-center text-sm text-slate-400">
            Tidak ada yang menjawab benar di putaran ini.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {tercepat.map((j, i) => {
              const saya = j.peserta_id === sorotPesertaId
              return (
                <li
                  key={j.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    saya
                      ? 'border-amber-400 bg-amber-500/20'
                      : 'border-slate-700 bg-slate-900/60'
                  }`}
                >
                  <span className="text-2xl">{MEDALI[i]}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-100">
                      {nama.get(j.peserta_id) ?? '—'}
                      {saya && <span className="ml-1.5 text-xs text-amber-300">(kamu)</span>}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {j.wajib ? 'Wajib' : 'Sukarela'}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold tabular-nums text-amber-400">
                      {detik(j.waktu_jawab_ms)}
                    </span>
                    <span className="block text-[11px] tabular-nums text-slate-400">
                      {j.wajib ? selisih(j.delta_saldo) : 'tanpa saldo'}
                    </span>
                  </span>
                </li>
              )
            })}
          </ol>
        )}
      </div>

      {/* Peringkat kumulatif — tiga besar ditonjolkan */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
        <h3 className="mb-4 font-bold text-slate-100">🏆 Top 3 Juragan</h3>

        {peringkat.length === 0 ? (
          <p className="text-center text-sm text-slate-400">Belum ada peserta.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {tigaBesar.map((p, i) => (
                <KartuPodium
                  key={p.id}
                  posisi={i}
                  nama={p.nama}
                  saldo={p.saldo}
                  rataWaktuMs={p.rataWaktuMs}
                  saya={p.id === sorotPesertaId}
                />
              ))}
            </div>

            {(ditampilkan.length > 0 || sayaDiLuarDaftar) && (
              <>
                <p className="mb-2 mt-5 text-xs uppercase tracking-wide text-slate-500">
                  Peringkat selanjutnya
                </p>
                <ol className="space-y-1.5">
                  {ditampilkan.map((p, i) => (
                    <BarisPeringkat
                      key={p.id}
                      posisi={i + 3}
                      nama={p.nama}
                      saldo={p.saldo}
                      rataWaktuMs={p.rataWaktuMs}
                      saya={p.id === sorotPesertaId}
                    />
                  ))}

                  {sayaDiLuarDaftar && (
                    <>
                      <li className="py-1 text-center text-xs text-slate-600">⋯</li>
                      <BarisPeringkat
                        posisi={posisiSaya}
                        nama={peringkat[posisiSaya].nama}
                        saldo={peringkat[posisiSaya].saldo}
                        rataWaktuMs={peringkat[posisiSaya].rataWaktuMs}
                        saya
                      />
                    </>
                  )}
                </ol>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** Kartu podium untuk tiga peringkat teratas. */
function KartuPodium({
  posisi,
  nama,
  saldo,
  rataWaktuMs,
  saya,
}: {
  posisi: number
  nama: string
  saldo: number
  rataWaktuMs: number | null
  saya?: boolean
}) {
  const juara = posisi === 0
  return (
    <div
      className={`flex flex-col items-center rounded-xl border p-3 text-center ${
        juara
          ? 'border-amber-400 bg-gradient-to-b from-amber-500/25 to-transparent'
          : 'border-slate-700 bg-slate-900/60'
      } ${saya ? 'ring-2 ring-amber-400/70' : ''}`}
    >
      <span className={juara ? 'text-3xl' : 'text-2xl'}>{MEDALI[posisi]}</span>
      <span className="mt-1 w-full truncate text-sm font-bold text-slate-100" title={nama}>
        {nama}
      </span>
      {saya && <span className="text-[10px] text-amber-300">(kamu)</span>}
      <span
        className={`mt-1 w-full truncate font-bold tabular-nums ${
          juara ? 'text-base text-amber-400' : 'text-sm text-slate-200'
        }`}
      >
        {rupiah(saldo)}
      </span>
      <span
        className={`text-[10px] tabular-nums ${
          saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {selisih(saldo - MODAL_AWAL)}
      </span>
      <span className="text-[10px] text-slate-500">{formatRataWaktu(rataWaktuMs)}</span>
    </div>
  )
}

function BarisPeringkat({
  posisi,
  nama,
  saldo,
  rataWaktuMs,
  saya,
}: {
  posisi: number
  nama: string
  saldo: number
  rataWaktuMs: number | null
  saya?: boolean
}) {
  return (
    <li
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        saya ? 'border-amber-400/60 bg-amber-500/10' : 'border-slate-700 bg-slate-900/60'
      }`}
    >
      <span className="w-7 shrink-0 text-center text-sm">
        {posisi < 3 ? MEDALI[posisi] : <span className="text-slate-500">{posisi + 1}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-slate-100">
          {nama}
          {saya && <span className="ml-1.5 text-xs text-amber-300">(kamu)</span>}
        </span>
        <span
          className="block text-[10px] text-slate-500"
          title="Rata-rata waktu menjawab — penentu urutan bila saldo seri"
        >
          {formatRataWaktu(rataWaktuMs)}
        </span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-slate-100">
          {rupiah(saldo)}
        </span>
        <span
          className={`block text-[11px] tabular-nums ${
            saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
          }`}
        >
          {selisih(saldo - MODAL_AWAL)}
        </span>
      </span>
    </li>
  )
}
