import { useMemo, useState } from 'react'
import { MODAL_AWAL } from '../lib/config'
import { gabungPilihan, rupiah, selisih } from '../lib/format'
import { formatRataWaktu, hitungPeringkat } from '../lib/peringkat'
import { hitungBukuBesar } from '../lib/bukuBesar'
import BukuBesar from './BukuBesar'
import type { JawabanPeserta, Peserta, Soal, Transaksi } from '../lib/types'

export interface DataDashboard {
  peserta: Peserta[]
  jawaban: JawabanPeserta[]
  transaksi: Transaksi[]
  soal: Soal[]
}

const SUB_TAB = [
  { id: 'skor', label: '🏆 Papan Skor' },
  { id: 'catatan', label: '📒 Catatan Transaksi' },
  { id: 'rekap', label: '💬 Rekap Jawaban' },
] as const

type SubTab = (typeof SUB_TAB)[number]['id']

interface PropsDashboard {
  data: DataDashboard
  /** Putaran yang sedang berjalan — detailnya disembunyikan sampai reveal. */
  putaranAktif: number
  /** true jika jawaban putaran aktif sudah dibuka fasilitator. */
  revealAktif: boolean
}

export default function Dashboard({ data, putaranAktif, revealAktif }: PropsDashboard) {
  const [tab, setTab] = useState<SubTab>('skor')

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {SUB_TAB.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-amber-500 text-slate-900'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {data.peserta.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
          Belum ada peserta yang bergabung.
        </p>
      ) : (
        <>
          {tab === 'skor' && <PapanSkor data={data} />}
          {tab === 'catatan' && <CatatanTransaksi data={data} />}
          {tab === 'rekap' && (
            <RekapJawaban data={data} putaranAktif={putaranAktif} revealAktif={revealAktif} />
          )}
        </>
      )}
    </div>
  )
}

// ─────────────────────────── 1. PAPAN SKOR ───────────────────────────

function PapanSkor({ data }: { data: DataDashboard }) {
  const peringkat = useMemo(
    () => hitungPeringkat(data.peserta, data.jawaban),
    [data.peserta, data.jawaban],
  )

  const medali = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {peringkat.slice(0, 3).map((p, i) => (
          <div
            key={p.id}
            className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-transparent p-4 text-center"
          >
            <div className="text-3xl">{medali[i]}</div>
            <p className="mt-1 truncate font-bold text-slate-100">{p.nama}</p>
            <p className="mt-2 text-lg font-bold tabular-nums text-amber-400">{rupiah(p.saldo)}</p>
            <p
              className={`text-xs tabular-nums ${
                p.saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {selisih(p.saldo - MODAL_AWAL)}
            </p>
            <p className="text-[10px] text-slate-500">{formatRataWaktu(p.rataWaktuMs)}</p>
          </div>
        ))}
      </div>

      <div className="scroll-x rounded-xl border border-slate-700">
        <table className="w-full min-w-[460px] text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <Th className="w-12">#</Th>
              <Th>Nama</Th>
              <Th className="w-28 text-right">Rata waktu</Th>
              <Th className="w-40 text-right">Saldo</Th>
              <Th className="w-32 text-right">Selisih</Th>
            </tr>
          </thead>
          <tbody>
            {peringkat.map((p, i) => (
              <tr key={p.id} className="border-t border-slate-800">
                <Td className="text-slate-500">{i + 1}</Td>
                <Td className="font-medium text-slate-100">{p.nama}</Td>
                <Td
                  className="text-right tabular-nums text-slate-400"
                  title="Rata-rata waktu menjawab — penentu urutan bila saldo seri"
                >
                  {formatRataWaktu(p.rataWaktuMs)}
                </Td>
                <Td className="text-right font-semibold tabular-nums text-slate-100">
                  {rupiah(p.saldo)}
                </Td>
                <Td
                  className={`text-right tabular-nums ${
                    p.saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {selisih(p.saldo - MODAL_AWAL)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ───────────────────────── 2. CATATAN TRANSAKSI ─────────────────────────

/**
 * Buku besar per peserta: modal awal, tiap jawaban beserta bonus atau dendanya,
 * lalu saldo akhir.
 *
 * Rinciannya direkonstruksi dari jawaban + bank soal, jadi tetap utuh walau
 * peserta lupa mengisi form catatan.
 */
function CatatanTransaksi({ data }: { data: DataDashboard }) {
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set())

  const bukuBesar = useMemo(
    () =>
      data.peserta
        .map((p) => ({
          peserta: p,
          buku: hitungBukuBesar(p, data.jawaban, data.transaksi, data.soal),
        }))
        .sort((a, b) => b.peserta.saldo - a.peserta.saldo),
    [data.peserta, data.jawaban, data.transaksi, data.soal],
  )

  const kunci = cari.trim().toLowerCase()
  const terlihat = kunci
    ? bukuBesar.filter((b) => b.peserta.nama.toLowerCase().includes(kunci))
    : bukuBesar

  function toggle(id: string) {
    setTerbuka((s) => {
      const baru = new Set(s)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }

  const semuaTerbuka = terlihat.length > 0 && terlihat.every((b) => terbuka.has(b.peserta.id))

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari nama peserta…"
          className="min-w-[180px] flex-1 rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400"
        />
        <button
          onClick={() =>
            setTerbuka(semuaTerbuka ? new Set() : new Set(terlihat.map((b) => b.peserta.id)))
          }
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          {semuaTerbuka ? 'Tutup semua' : 'Buka semua'}
        </button>
      </div>

      {terlihat.length === 0 ? (
        <Kosong>Tidak ada peserta yang cocok.</Kosong>
      ) : (
        <div className="space-y-2">
          {terlihat.map((b) => {
            const dibuka = terbuka.has(b.peserta.id)
            const untung = b.peserta.saldo >= MODAL_AWAL

            return (
              <div
                key={b.peserta.id}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40"
              >
                <button
                  onClick={() => toggle(b.peserta.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60"
                >
                  <span className="text-slate-500">{dibuka ? '▾' : '▸'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-100">
                      {b.peserta.nama}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {b.buku.baris.length} transaksi · {b.buku.jumlahBenar} benar ·{' '}
                      {b.buku.jumlahSalah} salah
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span
                      className={`block font-bold tabular-nums ${
                        untung ? 'text-green-400' : 'text-red-400'
                      }`}
                    >
                      {rupiah(b.peserta.saldo)}
                    </span>
                    <span className="block text-[11px] tabular-nums text-slate-400">
                      {selisih(b.peserta.saldo - MODAL_AWAL)}
                    </span>
                  </span>
                </button>

                {dibuka && (
                  <div className="border-t border-slate-700 px-4 py-3">
                    <BukuBesar buku={b.buku} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ────────────────────────── 4. REKAP JAWABAN ──────────────────────────

function RekapJawaban({
  data,
  putaranAktif,
  revealAktif,
}: {
  data: DataDashboard
  putaranAktif: number
  revealAktif: boolean
}) {
  const nama = useMemo(() => new Map(data.peserta.map((p) => [p.id, p.nama])), [data.peserta])
  const soalPeta = useMemo(() => new Map(data.soal.map((s) => [s.id, s])), [data.soal])

  const perPutaran = useMemo(() => {
    const peta = new Map<number, JawabanPeserta[]>()
    for (const j of data.jawaban) {
      const arr = peta.get(j.putaran) ?? []
      arr.push(j)
      peta.set(j.putaran, arr)
    }
    return [...peta.entries()].sort((a, b) => b[0] - a[0])
  }, [data.jawaban])

  if (perPutaran.length === 0) {
    return <Kosong>Belum ada jawaban yang masuk.</Kosong>
  }

  return (
    <div className="space-y-4">
      {perPutaran.map(([putaran, daftar]) => {
        const benar = daftar.filter((j) => j.benar).length
        const persen = daftar.length > 0 ? Math.round((benar / daftar.length) * 100) : 0
        const soal = soalPeta.get(daftar[0].soal_id)
        // Putaran yang belum dibuka tidak boleh menampilkan benar/salah —
        // layar fasilitator sering di-share ke peserta.
        const tersembunyi = putaran === putaranAktif && !revealAktif

        return (
          <div key={putaran} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-bold text-slate-100">Putaran {putaran}</h4>
              <span className="text-xs text-slate-400">
                {tersembunyi ? `${daftar.length} jawaban masuk` : `${benar}/${daftar.length} benar (${persen}%)`}
              </span>
            </div>

            {soal && !tersembunyi && <p className="mb-3 text-xs text-slate-400">{soal.teks}</p>}

            {tersembunyi ? (
              <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center text-xs text-slate-400">
                🔒 Putaran ini masih berjalan. Detail muncul setelah kamu menekan “Reveal Jawaban”.
              </p>
            ) : (
              <KelompokJawaban daftar={daftar} nama={nama} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function KelompokJawaban({
  daftar,
  nama,
}: {
  daftar: JawabanPeserta[]
  nama: Map<string, string>
}) {
  // Diurutkan dari yang tercepat — penentu podium putaran.
  const urut = [...daftar].sort(
    (a, b) => (a.waktu_jawab_ms ?? Infinity) - (b.waktu_jawab_ms ?? Infinity),
  )

  if (urut.length === 0) return <p className="text-xs text-slate-600">—</p>

  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {urut.map((j) => (
        <li
          key={j.id}
          className="flex items-center justify-between gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 text-xs"
        >
          <span className="truncate text-slate-300">{nama.get(j.peserta_id) ?? '—'}</span>
          <span className="flex shrink-0 items-center gap-1.5">
            {j.waktu_jawab_ms !== null && (
              <span className="tabular-nums text-slate-500">
                {(j.waktu_jawab_ms / 1000).toFixed(1)}s
              </span>
            )}
            <span className="text-slate-500">{gabungPilihan(j.pilihan_ganda) || '⏰'}</span>
            <span>{j.benar ? '✅' : '❌'}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

// ──────────────────────────── util tampilan ────────────────────────────

function Th({ children, className = '' }: { children?: React.ReactNode; className?: string }) {
  return <th className={`px-3 py-2 text-left font-medium ${className}`}>{children}</th>
}

function Td({
  children,
  className = '',
  title,
}: {
  children?: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <td className={`px-3 py-2 ${className}`} title={title}>
      {children}
    </td>
  )
}

function Kosong({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
      {children}
    </p>
  )
}
