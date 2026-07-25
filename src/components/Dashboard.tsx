import { useMemo, useState } from 'react'
import { BONUS_BENAR, DENDA, MODAL_AWAL, WARNA_META } from '../lib/config'
import { rupiah, selisih } from '../lib/format'
import { formatRataWaktu, hitungPeringkat } from '../lib/peringkat'
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
          {tab === 'warna' && <WarnaPerPutaran data={data} />}
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
              <Th className="w-28 text-right">Rata waktu</Th>
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

/**
 * Buku besar per peserta: modal awal, tiap transaksi yang mempengaruhi saldo,
 * total bonus dan denda, lalu saldo akhir.
 *
 * Hanya putaran saat peserta berstatus WAJIB yang muncul — hanya itu yang
 * mengubah saldo. Rinciannya direkonstruksi dari jawaban + bank soal, jadi
 * tetap utuh walau peserta lupa mengisi form catatan.
 */
function CatatanTransaksi({ data }: { data: DataDashboard }) {
  const [cari, setCari] = useState('')
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set())

  const soalPeta = useMemo(() => new Map(data.soal.map((s) => [s.id, s])), [data.soal])

  const bukuBesar = useMemo(() => {
    return data.peserta
      .map((p) => {
        const jawabanWajib = data.jawaban
          .filter((j) => j.peserta_id === p.id && j.wajib)
          .sort((a, b) => a.putaran - b.putaran)

        // Keterangan yang diisi sendiri oleh peserta, diindeks per putaran.
        const keteranganPeserta = new Map(
          data.transaksi.filter((t) => t.peserta_id === p.id).map((t) => [t.putaran, t.keterangan]),
        )

        const baris = jawabanWajib.map((j, i) => {
          const soal = soalPeta.get(j.soal_id)
          const efekNominal = !soal
            ? 0
            : soal.efek === 'masuk'
              ? soal.nominal
              : soal.efek === 'keluar'
                ? -soal.nominal
                : 0

          return {
            urut: i + 1,
            jawaban: j,
            soal,
            efekNominal,
            keterangan: keteranganPeserta.get(j.putaran) ?? soal?.teks ?? '—',
          }
        })

        const jumlahBenar = jawabanWajib.filter((j) => j.benar).length
        const jumlahSalah = jawabanWajib.length - jumlahBenar
        const totalBonus = jumlahBenar * BONUS_BENAR
        const totalDenda = jumlahSalah * DENDA

        // Saldo hasil hitung ulang harus sama dengan saldo tersimpan. Kalau
        // beda, biasanya data dibuat dengan aturan skor lama atau ditulis oleh
        // halaman peserta versi kedaluwarsa.
        const saldoHitung =
          MODAL_AWAL +
          baris.reduce((n, r) => n + r.efekNominal, 0) +
          totalBonus -
          totalDenda

        return {
          peserta: p,
          baris,
          totalBonus,
          totalDenda,
          jumlahBenar,
          jumlahSalah,
          selisihHitung: p.saldo - saldoHitung,
        }
      })
      .sort((a, b) => b.peserta.saldo - a.peserta.saldo)
  }, [data.peserta, data.jawaban, data.transaksi, soalPeta])

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
                      {b.baris.length} transaksi · {b.jumlahBenar} benar · {b.jumlahSalah} salah
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
                  <div className="border-t border-slate-700 px-4 py-3 text-sm">
                    <BarisBuku label="Saldo awal" nilai={MODAL_AWAL} netral />

                    {b.baris.length === 0 ? (
                      <p className="py-3 text-center text-xs text-slate-500">
                        Belum pernah terpilih sebagai peserta wajib.
                      </p>
                    ) : (
                      <div className="my-2 space-y-2 border-y border-slate-700 py-2">
                        {b.baris.map((r) => (
                          <div key={r.jawaban.id}>
                            <p className="text-xs text-slate-400">
                              <span className="font-semibold text-slate-300">
                                Transaksi {r.urut}
                              </span>{' '}
                              · Putaran {r.jawaban.putaran} · Soal #{r.jawaban.soal_id} ·{' '}
                              {r.jawaban.benar ? (
                                <span className="text-green-400">benar</span>
                              ) : (
                                <span className="text-red-400">
                                  {r.jawaban.pilihan === null ? 'tidak menjawab' : 'salah'}
                                </span>
                              )}
                            </p>
                            <div className="mt-0.5 flex items-baseline justify-between gap-3">
                              <span className="min-w-0 flex-1 text-slate-200">{r.keterangan}</span>
                              <span
                                className={`shrink-0 tabular-nums ${
                                  r.efekNominal === 0
                                    ? 'text-slate-500'
                                    : r.efekNominal > 0
                                      ? 'text-green-400'
                                      : 'text-red-400'
                                }`}
                              >
                                {r.efekNominal === 0 ? 'tanpa efek kas' : selisih(r.efekNominal)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <BarisBuku
                      label={`Bonus jawaban benar (${b.jumlahBenar}×)`}
                      nilai={b.totalBonus}
                    />
                    <BarisBuku
                      label={`Denda jawaban salah (${b.jumlahSalah}×)`}
                      nilai={-b.totalDenda}
                    />

                    <div className="mt-2 border-t border-slate-600 pt-2">
                      <BarisBuku label="Saldo akhir" nilai={b.peserta.saldo} netral tebal />
                    </div>

                    {b.selisihHitung !== 0 && (
                      <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-300">
                        ⚠️ Saldo tersimpan berbeda {selisih(b.selisihHitung)} dari hasil hitung
                        ulang. Biasanya karena data dibuat dengan aturan skor lama, atau ditulis
                        oleh halaman peserta versi kedaluwarsa. Lakukan Reset sebelum sesi baru.
                      </p>
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

function BarisBuku({
  label,
  nilai,
  netral,
  tebal,
}: {
  label: string
  nilai: number
  /** true untuk saldo (bukan perubahan), ditampilkan tanpa tanda +/−. */
  netral?: boolean
  tebal?: boolean
}) {
  const warna = netral
    ? 'text-slate-100'
    : nilai === 0
      ? 'text-slate-500'
      : nilai > 0
        ? 'text-green-400'
        : 'text-red-400'

  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={tebal ? 'font-semibold text-slate-100' : 'text-slate-400'}>{label}</span>
      <span className={`shrink-0 tabular-nums ${tebal ? 'text-base font-bold' : ''} ${warna}`}>
        {netral ? rupiah(nilai) : selisih(nilai)}
      </span>
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
        const wajib = daftar.filter((j) => j.wajib)
        const sukarela = daftar.filter((j) => !j.wajib)
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
              <div className="grid gap-3 sm:grid-cols-2">
                <KelompokJawaban judul="Wajib" daftar={wajib} nama={nama} aksen="text-amber-400" />
                <KelompokJawaban
                  judul="Sukarela"
                  daftar={sukarela}
                  nama={nama}
                  aksen="text-slate-400"
                />
              </div>
            )}
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
