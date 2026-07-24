import { useMemo, useState } from 'react'
import { MODAL_AWAL, WARNA_META } from '../lib/config'
import { rupiah, selisih } from '../lib/format'
import type { JawabanPeserta, Peserta, PilihanWarna, Soal, Transaksi } from '../lib/types'

export interface DataDashboard {
  peserta: Peserta[]
  warna: PilihanWarna[]
  jawaban: JawabanPeserta[]
  transaksi: Transaksi[]
  soal: Soal[]
}

const SUB_TAB = [
  { id: 'skor', label: '🏆 Papan Skor' },
  { id: 'warna', label: '📋 Warna per Putaran' },
  { id: 'catatan', label: '📒 Catatan Transaksi' },
  { id: 'rekap', label: '💬 Rekap Jawaban' },
] as const

type SubTab = (typeof SUB_TAB)[number]['id']

export default function Dashboard({ data }: { data: DataDashboard }) {
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
          {tab === 'warna' && <WarnaPerPutaran data={data} />}
          {tab === 'catatan' && <CatatanTransaksi data={data} />}
          {tab === 'rekap' && <RekapJawaban data={data} />}
        </>
      )}
    </div>
  )
}

// ─────────────────────────── 1. PAPAN SKOR ───────────────────────────

function PapanSkor({ data }: { data: DataDashboard }) {
  const peringkat = useMemo(
    () => [...data.peserta].sort((a, b) => b.saldo - a.saldo),
    [data.peserta],
  )

  const warnaTerakhir = useMemo(() => {
    const peta = new Map<string, PilihanWarna>()
    for (const w of data.warna) {
      const ada = peta.get(w.peserta_id)
      if (!ada || w.putaran > ada.putaran) peta.set(w.peserta_id, w)
    }
    return peta
  }, [data.warna])

  const medali = ['🥇', '🥈', '🥉']

  return (
    <div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {peringkat.slice(0, 3).map((p, i) => {
          const w = warnaTerakhir.get(p.id)
          return (
            <div
              key={p.id}
              className="rounded-2xl border border-amber-500/30 bg-gradient-to-b from-amber-500/15 to-transparent p-4 text-center"
            >
              <div className="text-3xl">{medali[i]}</div>
              <p className="mt-1 truncate font-bold text-slate-100">{p.nama}</p>
              <p className="text-xs text-slate-400">
                {w ? `${WARNA_META[w.warna].emoji} ${WARNA_META[w.warna].label}` : '—'}
              </p>
              <p className="mt-2 text-lg font-bold tabular-nums text-amber-400">{rupiah(p.saldo)}</p>
              <p
                className={`text-xs tabular-nums ${
                  p.saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {selisih(p.saldo - MODAL_AWAL)}
              </p>
            </div>
          )
        })}
      </div>

      <div className="scroll-x rounded-xl border border-slate-700">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="bg-slate-800 text-slate-400">
            <tr>
              <Th className="w-12">#</Th>
              <Th>Nama</Th>
              <Th className="w-32">Warna terakhir</Th>
              <Th className="w-40 text-right">Saldo</Th>
              <Th className="w-32 text-right">Selisih</Th>
            </tr>
          </thead>
          <tbody>
            {peringkat.map((p, i) => {
              const w = warnaTerakhir.get(p.id)
              return (
                <tr key={p.id} className="border-t border-slate-800">
                  <Td className="text-slate-500">{i + 1}</Td>
                  <Td className="font-medium text-slate-100">{p.nama}</Td>
                  <Td>{w ? `${WARNA_META[w.warna].emoji} ${WARNA_META[w.warna].label}` : '—'}</Td>
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ──────────────────────── 2. WARNA PER PUTARAN ────────────────────────

function WarnaPerPutaran({ data }: { data: DataDashboard }) {
  const maxPutaran = data.warna.reduce((m, w) => Math.max(m, w.putaran), 0)
  const putaranList = Array.from({ length: maxPutaran }, (_, i) => i + 1)

  const peta = useMemo(() => {
    const m = new Map<string, PilihanWarna>()
    for (const w of data.warna) m.set(`${w.peserta_id}:${w.putaran}`, w)
    return m
  }, [data.warna])

  if (maxPutaran === 0) {
    return <Kosong>Belum ada putaran yang dimainkan.</Kosong>
  }

  return (
    <div className="scroll-x rounded-xl border border-slate-700">
      <table className="w-full text-sm" style={{ minWidth: 220 + putaranList.length * 56 }}>
        <thead className="bg-slate-800 text-slate-400">
          <tr>
            <Th className="sticky left-0 bg-slate-800">Nama</Th>
            {putaranList.map((p) => (
              <Th key={p} className="w-14 text-center">
                P{p}
              </Th>
            ))}
            <Th className="w-36 text-right">Saldo</Th>
          </tr>
        </thead>
        <tbody>
          {data.peserta.map((p) => (
            <tr key={p.id} className="border-t border-slate-800">
              <Td className="sticky left-0 bg-slate-900 font-medium text-slate-100">{p.nama}</Td>
              {putaranList.map((n) => {
                const w = peta.get(`${p.id}:${n}`)
                return (
                  <Td key={n} className="text-center" title={w?.otomatis ? 'Dipilihkan sistem' : ''}>
                    {w ? (
                      <span className={w.otomatis ? 'opacity-50' : ''}>{WARNA_META[w.warna].emoji}</span>
                    ) : (
                      <span className="text-slate-700">–</span>
                    )}
                  </Td>
                )
              })}
              <Td className="text-right font-semibold tabular-nums text-slate-100">
                {rupiah(p.saldo)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ───────────────────────── 3. CATATAN TRANSAKSI ─────────────────────────

function CatatanTransaksi({ data }: { data: DataDashboard }) {
  const nama = useMemo(
    () => new Map(data.peserta.map((p) => [p.id, p.nama])),
    [data.peserta],
  )

  if (data.transaksi.length === 0) {
    return <Kosong>Belum ada catatan transaksi dari peserta.</Kosong>
  }

  return (
    <div className="scroll-x rounded-xl border border-slate-700">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="bg-slate-800 text-slate-400">
          <tr>
            <Th className="w-20">Putaran</Th>
            <Th className="w-44">Nama</Th>
            <Th>Keterangan</Th>
            <Th className="w-40 text-right">Jumlah</Th>
          </tr>
        </thead>
        <tbody>
          {data.transaksi.map((t) => (
            <tr key={t.id} className="border-t border-slate-800">
              <Td className="text-slate-400">P{t.putaran}</Td>
              <Td className="text-slate-100">{nama.get(t.peserta_id) ?? '—'}</Td>
              <Td className="text-slate-300">{t.keterangan}</Td>
              <Td
                className={`text-right font-semibold tabular-nums ${
                  t.arah === 'masuk' ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {t.arah === 'masuk' ? '+' : '−'}
                {rupiah(t.jumlah)}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ────────────────────────── 4. REKAP JAWABAN ──────────────────────────

function RekapJawaban({ data }: { data: DataDashboard }) {
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
        const wajib = daftar.filter((j) => j.wajib)
        const sukarela = daftar.filter((j) => !j.wajib)
        const benar = daftar.filter((j) => j.benar).length
        const persen = daftar.length > 0 ? Math.round((benar / daftar.length) * 100) : 0
        const soal = soalPeta.get(daftar[0].soal_id)

        return (
          <div key={putaran} className="rounded-xl border border-slate-700 bg-slate-800/40 p-4">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-bold text-slate-100">Putaran {putaran}</h4>
              <span className="text-xs text-slate-400">
                {benar}/{daftar.length} benar ({persen}%)
              </span>
            </div>

            {soal && <p className="mb-3 text-xs text-slate-400">{soal.teks}</p>}

            <div className="grid gap-3 sm:grid-cols-2">
              <KelompokJawaban judul="Wajib" daftar={wajib} nama={nama} aksen="text-amber-400" />
              <KelompokJawaban judul="Sukarela" daftar={sukarela} nama={nama} aksen="text-slate-400" />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KelompokJawaban({
  judul,
  daftar,
  nama,
  aksen,
}: {
  judul: string
  daftar: JawabanPeserta[]
  nama: Map<string, string>
  aksen: string
}) {
  const benar = daftar.filter((j) => j.benar).length
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${aksen}`}>
        {judul} · {benar}/{daftar.length} benar
      </p>
      {daftar.length === 0 ? (
        <p className="text-xs text-slate-600">—</p>
      ) : (
        <ul className="space-y-1">
          {daftar.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-300">{nama.get(j.peserta_id) ?? '—'}</span>
              <span className="shrink-0">
                <span className="mr-1 text-slate-500">{j.pilihan ?? '⏰'}</span>
                {j.benar ? '✅' : '❌'}
              </span>
            </li>
          ))}
        </ul>
      )}
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
