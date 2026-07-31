import { useMemo, useState } from 'react'
import { gabungPilihan } from '../lib/format'
import {
  formatPoin,
  formatRataWaktu,
  formatWaktu,
  hitungPeringkat,
  hitungRiwayat,
  poinJawaban,
} from '../lib/skor'
import type { JawabanPeserta, Peserta, Soal } from '../lib/types'

export interface DataDashboard {
  peserta: Peserta[]
  jawaban: JawabanPeserta[]
  soal: Soal[]
}

const SUB_TAB = [
  { id: 'skor', label: '🏆 Papan Skor' },
  { id: 'riwayat', label: '📋 Riwayat Peserta' },
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
        <Kosong>Belum ada peserta yang bergabung.</Kosong>
      ) : (
        <>
          {tab === 'skor' && <PapanSkor data={data} />}
          {tab === 'riwayat' && <RiwayatPeserta data={data} />}
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
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-400">
              {formatPoin(p.poin)}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-slate-500">poin</p>
            <p className="mt-1 text-xs text-slate-400">
              {p.benar}/{p.dijawab} benar · {formatRataWaktu(p.rataWaktuMs)}
            </p>
          </div>
        ))}
      </div>

      <div className="scroll-x rounded-xl border border-slate-700">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <Th className="w-12">#</Th>
              <Th>Nama</Th>
              <Th className="w-24 text-right">Benar</Th>
              <Th className="w-28 text-right">Rata waktu</Th>
              <Th className="w-28 text-right">Poin</Th>
            </tr>
          </thead>
          <tbody>
            {peringkat.map((p, i) => (
              <tr key={p.id} className="border-t border-slate-800">
                <Td className="text-slate-500">{i + 1}</Td>
                <Td className="font-medium text-slate-100">{p.nama}</Td>
                <Td className="text-right tabular-nums text-slate-300">
                  {p.benar}/{p.dijawab}
                </Td>
                <Td
                  className="text-right tabular-nums text-slate-400"
                  title="Rata-rata waktu menjawab — penentu urutan bila poin seri"
                >
                  {formatRataWaktu(p.rataWaktuMs)}
                </Td>
                <Td className="text-right font-bold tabular-nums text-amber-400">
                  {formatPoin(p.poin)}
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ───────────────────────── 2. RIWAYAT PESERTA ─────────────────────────

/**
 * Riwayat jawaban per peserta: tiap putaran, benar/salah, waktu, dan poinnya.
 * Kartu lipat supaya tetap terbaca walau pesertanya puluhan.
 */
function RiwayatPeserta({ data }: { data: DataDashboard }) {
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set())

  const daftar = useMemo(
    () =>
      data.peserta
        .map((p) => ({ peserta: p, riwayat: hitungRiwayat(p, data.jawaban, data.soal) }))
        .sort((a, b) => b.riwayat.poin - a.riwayat.poin),
    [data.peserta, data.jawaban, data.soal],
  )

  const kunci = cari.trim().toLowerCase()
  const terlihat = kunci
    ? daftar.filter((d) => d.peserta.nama.toLowerCase().includes(kunci))
    : daftar

  const semuaTerbuka = terlihat.length > 0 && terlihat.every((d) => terbuka.has(d.peserta.id))

  function toggle(id: string) {
    setTerbuka((s) => {
      const baru = new Set(s)
      if (baru.has(id)) baru.delete(id)
      else baru.add(id)
      return baru
    })
  }

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
            setTerbuka(semuaTerbuka ? new Set() : new Set(terlihat.map((d) => d.peserta.id)))
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
          {terlihat.map(({ peserta, riwayat }) => {
            const dibuka = terbuka.has(peserta.id)
            return (
              <div
                key={peserta.id}
                className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40"
              >
                <button
                  onClick={() => toggle(peserta.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60"
                >
                  <span className="text-slate-500">{dibuka ? '▾' : '▸'}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-100">
                      {peserta.nama}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {riwayat.benar} benar · {riwayat.salah} salah ·{' '}
                      {formatRataWaktu(riwayat.rataWaktuMs)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-bold tabular-nums text-amber-400">
                      {formatPoin(riwayat.poin)}
                    </span>
                    <span className="block text-[10px] uppercase tracking-wide text-slate-500">
                      poin
                    </span>
                  </span>
                </button>

                {dibuka && (
                  <div className="border-t border-slate-700 px-4 py-3">
                    {riwayat.baris.length === 0 ? (
                      <p className="py-2 text-center text-xs text-slate-500">
                        Belum ada jawaban yang dinilai.
                      </p>
                    ) : (
                      <ul className="space-y-2 text-sm">
                        {riwayat.baris.map((r) => (
                          <li key={r.jawaban.id}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="text-xs text-slate-400">
                                Putaran {r.jawaban.putaran} · Soal #{r.jawaban.soal_id} ·{' '}
                                {r.jawaban.benar ? (
                                  <span className="text-green-400">benar</span>
                                ) : (
                                  <span className="text-red-400">
                                    {r.jawaban.pilihan_ganda === null ? 'tidak menjawab' : 'salah'}
                                  </span>
                                )}
                                {r.jawaban.waktu_jawab_ms !== null &&
                                  ` · ${formatWaktu(r.jawaban.waktu_jawab_ms)}`}
                              </span>
                              <span
                                className={`shrink-0 tabular-nums ${
                                  r.poin > 0 ? 'text-amber-400' : 'text-slate-600'
                                }`}
                              >
                                +{formatPoin(r.poin)}
                              </span>
                            </div>
                            <p className="truncate text-slate-300">{r.soal?.teks ?? '—'}</p>
                          </li>
                        ))}
                      </ul>
                    )}
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

// ────────────────────────── 3. REKAP JAWABAN ──────────────────────────

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

        // Diurutkan dari yang tercepat — penentu podium putaran.
        const urut = [...daftar].sort(
          (a, b) => (a.waktu_jawab_ms ?? Infinity) - (b.waktu_jawab_ms ?? Infinity),
        )

        return (
          <div key={putaran} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-bold text-slate-100">Putaran {putaran}</h4>
              <span className="text-xs text-slate-400">
                {tersembunyi
                  ? `${daftar.length} jawaban masuk`
                  : `${benar}/${daftar.length} benar (${persen}%)`}
              </span>
            </div>

            {soal && !tersembunyi && <p className="mb-3 text-xs text-slate-400">{soal.teks}</p>}

            {tersembunyi ? (
              <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-4 text-center text-xs text-slate-400">
                🔒 Putaran ini masih berjalan. Detail muncul setelah kamu menekan “Reveal Jawaban”.
              </p>
            ) : (
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
                          {formatWaktu(j.waktu_jawab_ms)}
                        </span>
                      )}
                      <span className="text-slate-500">{gabungPilihan(j.pilihan_ganda)}</span>
                      <span>{j.benar ? '✅' : '❌'}</span>
                      <span className="w-12 text-right tabular-nums text-amber-400">
                        +{formatPoin(poinJawaban(j))}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )
      })}
    </div>
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
