import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ambilSemuaJawaban,
  ambilSemuaPeserta,
  ambilSemuaPilihanWarna,
  ambilSemuaSoal,
  ambilSemuaTransaksi,
  pilihSoalAcak,
  resetGame,
  seedSoalJikaKosong,
  simpanSemuaSoal,
  tambahRiwayat,
  ubahGameState,
} from '../lib/api'
import { DAFTAR_WARNA, DURASI_PILIH_WARNA, DURASI_SOAL, EFEK_META, WARNA_META } from '../lib/config'
import { useGameState, useRealtimeTabel, useSisaWaktu } from '../lib/hooks'
import { sekarang } from '../lib/waktu'
import { LABEL_OPSI, rupiah } from '../lib/format'
import type { Soal, Warna } from '../lib/types'
import PinGate from '../components/PinGate'
import SpinWheel from '../components/SpinWheel'
import TimerRing from '../components/TimerRing'
import EditorSoal from '../components/EditorSoal'
import Dashboard, { type DataDashboard } from '../components/Dashboard'

const KUNCI_PIN = 'juragan-terkaya:fasilitator'
const TABEL_DIPANTAU = ['peserta', 'pilihan_warna', 'jawaban', 'transaksi']

export default function Fasilitator() {
  const [lolos, setLolos] = useState(() => sessionStorage.getItem(KUNCI_PIN) === 'ok')
  if (!lolos) {
    return (
      <PinGate
        onBerhasil={() => {
          sessionStorage.setItem(KUNCI_PIN, 'ok')
          setLolos(true)
        }}
      />
    )
  }
  return <PanelFasilitator />
}

function PanelFasilitator() {
  const { state } = useGameState()

  const [soal, setSoal] = useState<Soal[]>([])
  const [data, setData] = useState<DataDashboard>({
    peserta: [],
    warna: [],
    jawaban: [],
    transaksi: [],
    soal: [],
  })
  const [tab, setTab] = useState<'spin' | 'dashboard'>('spin')
  const [editorTerbuka, setEditorTerbuka] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const [warnaHasil, setWarnaHasil] = useState<Warna | null>(null)
  const [pemicuSpin, setPemicuSpin] = useState(0)
  const spinSelesaiRef = useRef(0)

  const sisaWarna = useSisaWaktu(
    state?.fase === 'pilih_warna' ? state.fase_mulai : null,
    DURASI_PILIH_WARNA,
  )
  const sisaSoal = useSisaWaktu(state?.fase === 'soal' ? state.fase_mulai : null, DURASI_SOAL)

  // ── Muat bank soal (sekaligus isi data awal bila tabel masih kosong) ──
  useEffect(() => {
    seedSoalJikaKosong()
      .then(setSoal)
      .catch((e) => setGalat(e instanceof Error ? e.message : String(e)))
  }, [])

  // ── Muat data dashboard, disegarkan otomatis lewat realtime ──
  const muatData = useCallback(async () => {
    try {
      const [peserta, warna, jawaban, transaksi, semuaSoal] = await Promise.all([
        ambilSemuaPeserta(),
        ambilSemuaPilihanWarna(),
        ambilSemuaJawaban(),
        ambilSemuaTransaksi(),
        ambilSemuaSoal(),
      ])
      setData({ peserta, warna, jawaban, transaksi, soal: semuaSoal })
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    muatData()
  }, [muatData])
  useRealtimeTabel(TABEL_DIPANTAU, muatData)

  // ── Aksi fasilitator ─────────────────────────────────────────────────
  const jalankan = useCallback(async (aksi: () => Promise<void>) => {
    setSibuk(true)
    setGalat(null)
    try {
      await aksi()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setSibuk(false)
    }
  }, [])

  const mulaiPutaran = (putaranBaru: number) =>
    jalankan(async () => {
      setWarnaHasil(null)
      await ubahGameState({
        berjalan: true,
        fase: 'pilih_warna',
        putaran: putaranBaru,
        warna_spin: null,
        soal_id: null,
        fase_mulai: new Date(sekarang()).toISOString(),
        reveal: false,
        show_insight: false,
      })
    })

  const putarRoda = () =>
    jalankan(async () => {
      const warna = DAFTAR_WARNA[Math.floor(Math.random() * DAFTAR_WARNA.length)]
      setWarnaHasil(warna)
      setPemicuSpin((p) => p + 1)
      await ubahGameState({ fase: 'spin', warna_spin: warna, soal_id: null })
    })

  const bukaSoal = useCallback(() => {
    if (!state?.warna_spin) return
    void jalankan(async () => {
      const terpilih = pilihSoalAcak(soal, state.warna_spin!, state.riwayat_soal ?? [])
      if (!terpilih) {
        throw new Error(
          `Tidak ada soal berwarna ${state.warna_spin}. Tambahkan lewat Editor Soal terlebih dahulu.`,
        )
      }
      await ubahGameState({
        fase: 'soal',
        soal_id: terpilih.id,
        fase_mulai: new Date(sekarang()).toISOString(),
        riwayat_soal: tambahRiwayat(state.riwayat_soal ?? [], terpilih.id),
      })
    })
  }, [state, soal, jalankan])

  const revealJawaban = () => jalankan(() => ubahGameState({ fase: 'reveal', reveal: true }))
  const tampilkanInsight = () => jalankan(() => ubahGameState({ show_insight: true }))
  const akhiriGame = () => jalankan(() => ubahGameState({ fase: 'selesai', berjalan: false }))

  const resetTotal = () => {
    if (!confirm('Hapus SELURUH data peserta dan riwayat putaran? Bank soal tetap aman.')) return
    void jalankan(async () => {
      await resetGame()
      setWarnaHasil(null)
      await muatData()
    })
  }

  // ── Data turunan untuk panel kontrol ─────────────────────────────────
  const soalAktif = useMemo(
    () => soal.find((s) => s.id === state?.soal_id) ?? null,
    [soal, state?.soal_id],
  )

  const warnaPutaranIni = useMemo(
    () => data.warna.filter((w) => w.putaran === state?.putaran),
    [data.warna, state?.putaran],
  )

  const namaPeserta = useMemo(
    () => new Map(data.peserta.map((p) => [p.id, p.nama])),
    [data.peserta],
  )

  const pesertaWajib = useMemo(
    () =>
      warnaPutaranIni
        .filter((w) => w.warna === state?.warna_spin)
        .map((w) => namaPeserta.get(w.peserta_id) ?? '—'),
    [warnaPutaranIni, state?.warna_spin, namaPeserta],
  )

  const jawabanPutaranIni = useMemo(
    () => data.jawaban.filter((j) => j.putaran === state?.putaran),
    [data.jawaban, state?.putaran],
  )

  if (!state) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5">
      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-amber-400">💰 Juragan Terkaya</h1>
          <p className="text-xs text-slate-400">
            Panel Fasilitator · {data.peserta.length} peserta bergabung
            {state.berjalan && ` · Putaran ${state.putaran}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEditorTerbuka(true)}
            className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-800"
          >
            ✏️ Edit Soal
          </button>
          <button
            onClick={resetTotal}
            className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
          >
            ♻️ Reset
          </button>
        </div>
      </header>

      {galat && (
        <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {galat}
        </div>
      )}

      {/* Tab utama */}
      <div className="mb-5 flex gap-2">
        <TabUtama aktif={tab === 'spin'} onClick={() => setTab('spin')}>
          🎰 Spin &amp; Soal
        </TabUtama>
        <TabUtama aktif={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          📊 Dashboard
        </TabUtama>
      </div>

      {tab === 'dashboard' ? (
        <Dashboard data={data} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Kolom kiri: roda & kontrol */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5 text-center">
            <SpinWheel
              hasil={warnaHasil ?? state.warna_spin}
              pemicu={pemicuSpin}
              onSelesai={() => {
                if (spinSelesaiRef.current === pemicuSpin) return
                spinSelesaiRef.current = pemicuSpin
                bukaSoal()
              }}
            />

            <div className="mt-4">
              <StatusFase state={state} sisaWarna={sisaWarna} jumlahPilih={warnaPutaranIni.length} />
            </div>

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {!state.berjalan && state.fase !== 'selesai' && (
                <Tombol utama onClick={() => mulaiPutaran(1)} sibuk={sibuk}>
                  ▶️ Mulai Game
                </Tombol>
              )}

              {state.fase === 'pilih_warna' && (
                <Tombol utama onClick={putarRoda} sibuk={sibuk}>
                  🎰 Putar Roda
                </Tombol>
              )}

              {state.fase === 'spin' && (
                <Tombol onClick={bukaSoal} sibuk={sibuk}>
                  ⏭️ Tampilkan Soal
                </Tombol>
              )}

              {state.fase === 'soal' && !state.reveal && (
                <Tombol utama onClick={revealJawaban} sibuk={sibuk}>
                  👁️ Reveal Jawaban
                </Tombol>
              )}

              {state.fase === 'reveal' && !state.show_insight && (
                <Tombol utama onClick={tampilkanInsight} sibuk={sibuk}>
                  💡 Tampilkan Insight
                </Tombol>
              )}

              {state.berjalan && state.putaran > 0 && (
                <Tombol onClick={() => mulaiPutaran(state.putaran + 1)} sibuk={sibuk}>
                  ➡️ Putaran Berikutnya
                </Tombol>
              )}

              {state.berjalan && (
                <Tombol bahaya onClick={akhiriGame} sibuk={sibuk}>
                  🏁 Akhiri Game
                </Tombol>
              )}

              {state.fase === 'selesai' && (
                <Tombol utama onClick={() => mulaiPutaran(state.putaran + 1)} sibuk={sibuk}>
                  ▶️ Lanjutkan Game
                </Tombol>
              )}
            </div>

            {state.warna_spin && state.fase !== 'pilih_warna' && (
              <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-left">
                <p className="text-xs uppercase tracking-wide text-slate-500">Wajib menjawab</p>
                <p className={`mt-0.5 font-bold ${WARNA_META[state.warna_spin].teks}`}>
                  {WARNA_META[state.warna_spin].emoji} {WARNA_META[state.warna_spin].label} ·{' '}
                  {pesertaWajib.length} peserta
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">
                  {pesertaWajib.length > 0 ? pesertaWajib.join(', ') : 'Tidak ada peserta di warna ini.'}
                </p>
              </div>
            )}
          </section>

          {/* Kolom kanan: soal & rekap */}
          <section className="space-y-4">
            {soalAktif ? (
              <>
                <KartuSoal soal={soalAktif} reveal={state.reveal} sisa={sisaSoal} fase={state.fase} />
                {state.show_insight && (
                  <div className="animasi-muncul rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5">
                    <h3 className="mb-2 font-bold text-amber-300">💡 Insight</h3>
                    <p className="text-sm leading-relaxed text-slate-200">{soalAktif.insight}</p>
                  </div>
                )}
                <RekapSingkat
                  jawaban={jawabanPutaranIni}
                  nama={namaPeserta}
                  terbuka={state.reveal}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
                Belum ada soal aktif. Mulai putaran lalu putar roda.
              </div>
            )}
          </section>
        </div>
      )}

      {editorTerbuka && (
        <EditorSoal
          soalAwal={soal}
          onTutup={() => setEditorTerbuka(false)}
          onSimpanSemua={async (daftar) => {
            await simpanSemuaSoal(daftar)
            setSoal(await ambilSemuaSoal())
            await muatData()
          }}
        />
      )}
    </div>
  )
}

// ═════════════════════════ Komponen pendukung ═════════════════════════

function TabUtama({
  aktif,
  onClick,
  children,
}: {
  aktif: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 font-semibold transition ${
        aktif ? 'bg-amber-500 text-slate-900' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  )
}

function Tombol({
  children,
  onClick,
  sibuk,
  utama,
  bahaya,
}: {
  children: React.ReactNode
  onClick: () => void
  sibuk?: boolean
  utama?: boolean
  bahaya?: boolean
}) {
  const gaya = utama
    ? 'bg-amber-500 text-slate-900 hover:bg-amber-400'
    : bahaya
      ? 'border border-red-500/50 text-red-400 hover:bg-red-500/10'
      : 'border border-slate-600 text-slate-200 hover:bg-slate-700'
  return (
    <button
      onClick={onClick}
      disabled={sibuk}
      className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40 ${gaya}`}
    >
      {children}
    </button>
  )
}

function StatusFase({
  state,
  sisaWarna,
  jumlahPilih,
}: {
  state: { fase: string; berjalan: boolean; putaran: number }
  sisaWarna: number
  jumlahPilih: number
}) {
  if (!state.berjalan && state.fase !== 'selesai') {
    return <p className="text-slate-400">Game belum dimulai.</p>
  }

  if (state.fase === 'selesai') {
    return <p className="font-semibold text-amber-400">🏁 Game selesai — lihat tab Dashboard.</p>
  }

  if (state.fase === 'pilih_warna') {
    return (
      <div className="flex items-center justify-center gap-4">
        <TimerRing sisa={sisaWarna} total={DURASI_PILIH_WARNA} ukuran={72} label="detik" />
        <div className="text-left">
          <p className="font-semibold text-slate-100">Peserta memilih warna…</p>
          <p className="text-sm text-slate-400">{jumlahPilih} peserta sudah memilih</p>
        </div>
      </div>
    )
  }

  if (state.fase === 'spin') return <p className="font-semibold text-slate-100">🎰 Roda berputar…</p>
  if (state.fase === 'soal') return <p className="font-semibold text-slate-100">📝 Peserta menjawab…</p>
  return <p className="font-semibold text-green-400">✅ Jawaban sudah dibuka</p>
}

function KartuSoal({
  soal,
  reveal,
  sisa,
  fase,
}: {
  soal: Soal
  reveal: boolean
  sisa: number
  fase: string
}) {
  const efek = EFEK_META[soal.efek]
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${efek.kelas}`}>
          {efek.emoji} {efek.label}
          {soal.efek !== 'netral' && ` · ${rupiah(soal.nominal)}`}
        </span>
        {fase === 'soal' && <TimerRing sisa={sisa} total={DURASI_SOAL} ukuran={60} />}
      </div>

      <p className="text-base leading-relaxed text-slate-100">{soal.teks}</p>

      <div className="mt-4 space-y-2">
        {soal.opsi.map((teks, i) => {
          const label = LABEL_OPSI[i]
          const benar = label === soal.jawaban
          return (
            <div
              key={label}
              className={`flex items-start gap-3 rounded-xl border px-4 py-2.5 text-sm ${
                reveal && benar
                  ? 'border-green-500 bg-green-500/15 text-slate-100'
                  : 'border-slate-700 bg-slate-900/60 text-slate-300'
              }`}
            >
              <span className="mt-px shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold">
                {label}
              </span>
              <span className="flex-1">{teks}</span>
              {reveal && benar && <span>✅</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function RekapSingkat({
  jawaban,
  nama,
  terbuka,
}: {
  jawaban: { id: number; peserta_id: string; pilihan: string | null; benar: boolean; wajib: boolean }[]
  nama: Map<string, string>
  terbuka: boolean
}) {
  const wajib = jawaban.filter((j) => j.wajib)
  const sukarela = jawaban.filter((j) => !j.wajib)

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
      <h3 className="mb-3 font-bold text-slate-100">
        Rekap jawaban putaran ini
        <span className="ml-2 text-sm font-normal text-slate-400">{jawaban.length} masuk</span>
      </h3>

      {!terbuka ? (
        <p className="text-sm text-slate-400">
          Detail disembunyikan sampai kamu menekan “Reveal Jawaban”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Kelompok judul="Wajib" daftar={wajib} nama={nama} aksen="text-amber-400" />
          <Kelompok judul="Sukarela" daftar={sukarela} nama={nama} aksen="text-slate-400" />
        </div>
      )}
    </div>
  )
}

function Kelompok({
  judul,
  daftar,
  nama,
  aksen,
}: {
  judul: string
  daftar: { id: number; peserta_id: string; pilihan: string | null; benar: boolean }[]
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
