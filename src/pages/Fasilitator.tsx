import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ambilSemuaJawaban,
  ambilSemuaPeserta,
  ambilSemuaPilihanWarna,
  ambilSemuaSoal,
  ambilSemuaTransaksi,
  hapusSoal,
  pilihSoalAcak,
  resetGame,
  seedSoalJikaKosong,
  simpanSemuaSoal,
  tambahRiwayat,
  terapkanSaldoPutaran,
  ubahGameState,
} from '../lib/api'
import { DAFTAR_WARNA, DURASI_PILIH_WARNA, DURASI_SOAL, EFEK_META, WARNA_META } from '../lib/config'
import { useGameState, useRealtimeTabel, useSisaWaktu } from '../lib/hooks'
import { sekarang } from '../lib/waktu'
import { LABEL_OPSI, rupiah } from '../lib/format'
import type { JawabanPeserta, Soal, Warna } from '../lib/types'
import PinGate from '../components/PinGate'
import SpinWheel from '../components/SpinWheel'
import TimerRing from '../components/TimerRing'
import EditorSoal from '../components/EditorSoal'
import PapanSkorPutaran from '../components/PapanSkorPutaran'
import BannerVersi from '../components/BannerVersi'
import { useVersiKedaluwarsa } from '../lib/versi'
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
  const versiKedaluwarsa = useVersiKedaluwarsa()

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

  const [daftarTerbuka, setDaftarTerbuka] = useState(false)
  const [notifBergabung, setNotifBergabung] = useState<string[]>([])
  const idPesertaSebelumnya = useRef<Set<string> | null>(null)

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

  // ── Notifikasi peserta baru bergabung ────────────────────────────────
  useEffect(() => {
    const idSekarang = new Set(data.peserta.map((p) => p.id))

    // Pemuatan pertama bukan "peserta baru" — jangan dinotifikasi.
    if (idPesertaSebelumnya.current === null) {
      idPesertaSebelumnya.current = idSekarang
      return
    }

    const baru = data.peserta.filter((p) => !idPesertaSebelumnya.current!.has(p.id))
    idPesertaSebelumnya.current = idSekarang
    if (baru.length === 0) return

    const namaBaru = baru.map((p) => p.nama)
    setNotifBergabung((n) => [...n, ...namaBaru])
    setTimeout(() => setNotifBergabung((n) => n.slice(namaBaru.length)), 5000)
  }, [data.peserta])

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

  /**
   * Membuka jawaban sekaligus membukukan saldo seluruh peserta putaran ini.
   * Saldo sengaja baru diterapkan di sini agar peserta tidak bisa menebak
   * benar/salah dari saldonya yang berubah lebih dulu.
   */
  const revealJawaban = () =>
    jalankan(async () => {
      if (state) await terapkanSaldoPutaran(state.putaran)
      await ubahGameState({ fase: 'reveal', reveal: true })
      await muatData()
    })

  const tampilkanInsight = () => jalankan(() => ubahGameState({ show_insight: true }))

  /** Menampilkan podium putaran + peringkat kumulatif sebelum lanjut. */
  const bukaPapanSkor = () =>
    jalankan(async () => {
      await muatData()
      await ubahGameState({ fase: 'skor' })
    })

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

  /** Nama peserta dikelompokkan per warna untuk putaran yang sedang berjalan. */
  const pesertaPerWarna = useMemo(() => {
    const peta = {} as Record<Warna, string[]>
    for (const w of DAFTAR_WARNA) peta[w] = []
    for (const pilihan of warnaPutaranIni) {
      peta[pilihan.warna]?.push(namaPeserta.get(pilihan.peserta_id) ?? '—')
    }
    for (const w of DAFTAR_WARNA) peta[w].sort((a, b) => a.localeCompare(b, 'id'))
    return peta
  }, [warnaPutaranIni, namaPeserta])

  const jawabanPutaranIni = useMemo(
    () => data.jawaban.filter((j) => j.putaran === state?.putaran),
    [data.jawaban, state?.putaran],
  )

  /** Peserta yang wajib menjawab putaran ini — dipakai melacak siapa yang belum. */
  const idWajib = useMemo(
    () =>
      warnaPutaranIni.filter((w) => w.warna === state?.warna_spin).map((w) => w.peserta_id),
    [warnaPutaranIni, state?.warna_spin],
  )

  if (!state) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">Memuat…</div>
  }

  return (
    <div className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5">
      {versiKedaluwarsa && <BannerVersi />}

      {/* Header */}
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-amber-400">💰 Juragan Terkaya</h1>
          <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <span>Panel Fasilitator ·</span>
            <button
              onClick={() => setDaftarTerbuka((v) => !v)}
              className="rounded px-1 py-0.5 font-semibold text-amber-400 underline decoration-dotted underline-offset-2 transition hover:bg-slate-800"
              title="Klik untuk melihat nama peserta"
            >
              {data.peserta.length} peserta bergabung {daftarTerbuka ? '▴' : '▾'}
            </button>
            {state.berjalan && <span>· Putaran {state.putaran}</span>}
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

      {daftarTerbuka && (
        <div className="animasi-muncul mb-4 rounded-xl border border-slate-700 bg-slate-800/60 p-4">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-bold text-slate-100">👥 Peserta yang sudah bergabung</h2>
            <button
              onClick={() => setDaftarTerbuka(false)}
              className="rounded px-2 py-0.5 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
            >
              Tutup
            </button>
          </div>

          {data.peserta.length === 0 ? (
            <p className="py-3 text-center text-sm text-slate-400">
              Belum ada peserta. Nama akan muncul di sini otomatis begitu mereka mendaftar.
            </p>
          ) : (
            <ol className="grid gap-1.5 sm:grid-cols-3 lg:grid-cols-4">
              {data.peserta.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-2.5 py-1.5"
                >
                  <span className="w-5 shrink-0 text-xs tabular-nums text-slate-500">{i + 1}</span>
                  <span className="truncate text-sm text-slate-100">{p.nama}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

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
        <Dashboard data={data} putaranAktif={state.putaran} revealAktif={state.reveal} />
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

              {state.fase === 'reveal' && (
                <Tombol utama={state.show_insight} onClick={bukaPapanSkor} sibuk={sibuk}>
                  ➡️ Putaran Berikutnya
                </Tombol>
              )}

              {state.fase === 'skor' && (
                <Tombol utama onClick={() => mulaiPutaran(state.putaran + 1)} sibuk={sibuk}>
                  ▶️ Mulai Putaran {state.putaran + 1}
                </Tombol>
              )}

              {state.berjalan && (state.fase === 'soal' || state.fase === 'spin') && (
                <Tombol onClick={bukaPapanSkor} sibuk={sibuk}>
                  ⏭️ Lewati ke Papan Skor
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

            {state.berjalan && state.putaran > 0 && (
              <SebaranWarna
                pesertaPerWarna={pesertaPerWarna}
                warnaSpin={state.warna_spin}
                totalPeserta={data.peserta.length}
              />
            )}
          </section>

          {/* Kolom kanan: soal & rekap */}
          <section className="space-y-4">
            {state.fase === 'skor' ? (
              <PapanSkorPutaran
                putaran={state.putaran}
                jawaban={jawabanPutaranIni}
                semuaJawaban={data.jawaban}
                peserta={data.peserta}
              />
            ) : soalAktif ? (
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
                  idWajib={idWajib}
                />
              </>
            ) : (
              <DaftarPesertaBergabung peserta={data.peserta} belumMulai={!state.berjalan} />
            )}
          </section>
        </div>
      )}

      {/* Notifikasi peserta baru bergabung */}
      {notifBergabung.length > 0 && (
        <div className="pointer-events-none fixed bottom-4 right-4 z-40 space-y-2">
          {notifBergabung.map((nama, i) => (
            <div
              key={`${nama}-${i}`}
              className="animasi-muncul rounded-xl border border-green-500/50 bg-green-500/15 px-4 py-2.5 shadow-lg backdrop-blur"
            >
              <p className="text-sm text-green-300">
                🙋 <b className="text-slate-100">{nama}</b> bergabung
              </p>
            </div>
          ))}
        </div>
      )}

      {editorTerbuka && (
        <EditorSoal
          soalAwal={soal}
          onTutup={() => setEditorTerbuka(false)}
          onSimpanSemua={async (daftar, idDihapus) => {
            for (const id of idDihapus) await hapusSoal(id)
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

/**
 * Daftar peserta yang sudah bergabung, dipakai fasilitator untuk memastikan
 * semua orang sudah masuk sebelum putaran pertama dimulai.
 */
function DaftarPesertaBergabung({
  peserta,
  belumMulai,
}: {
  peserta: { id: string; nama: string }[]
  belumMulai: boolean
}) {
  const [tersalin, setTersalin] = useState(false)
  const linkPeserta = `${window.location.origin}/peserta`

  async function salinLink() {
    try {
      await navigator.clipboard.writeText(linkPeserta)
      setTersalin(true)
      setTimeout(() => setTersalin(false), 2000)
    } catch {
      // Clipboard diblokir browser — fasilitator masih bisa menyalin manual.
    }
  }

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-100">👥 Peserta bergabung</h3>
        <span className="rounded-md bg-slate-800 px-2.5 py-0.5 text-sm font-bold text-amber-400">
          {peserta.length}
        </span>
      </div>

      {belumMulai && (
        <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3">
          <p className="mb-1.5 text-xs text-slate-400">Bagikan link ini ke peserta:</p>
          <div className="flex gap-2">
            <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-950 px-3 py-2 text-xs text-amber-300">
              {linkPeserta}
            </code>
            <button
              onClick={salinLink}
              className="shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-800"
            >
              {tersalin ? '✓ Tersalin' : 'Salin'}
            </button>
          </div>
        </div>
      )}

      {peserta.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">
          Belum ada peserta yang bergabung.
          <br />
          <span className="text-xs text-slate-500">
            Nama akan muncul di sini otomatis begitu mereka mendaftar.
          </span>
        </p>
      ) : (
        <ol className="grid gap-1.5 sm:grid-cols-2">
          {peserta.map((p, i) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2"
            >
              <span className="w-5 shrink-0 text-xs tabular-nums text-slate-500">{i + 1}</span>
              <span className="truncate text-sm text-slate-100">{p.nama}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 border-t border-slate-700 pt-3 text-xs text-slate-500">
        {belumMulai
          ? 'Tunggu sampai semua nama muncul, lalu klik “Mulai Game”.'
          : 'Belum ada soal aktif. Putar roda untuk menampilkan soal.'}
      </p>
    </div>
  )
}

/**
 * Sebaran pilihan warna seluruh peserta pada putaran berjalan.
 * Warna hasil spin ditandai agar fasilitator langsung tahu siapa yang wajib menjawab.
 */
function SebaranWarna({
  pesertaPerWarna,
  warnaSpin,
  totalPeserta,
}: {
  pesertaPerWarna: Record<Warna, string[]>
  warnaSpin: Warna | null
  totalPeserta: number
}) {
  const sudahMemilih = DAFTAR_WARNA.reduce((n, w) => n + pesertaPerWarna[w].length, 0)

  return (
    <div className="mt-5 text-left">
      <div className="mb-2 flex items-baseline justify-between px-1">
        <p className="text-xs uppercase tracking-wide text-slate-500">Pilihan warna peserta</p>
        <p className="text-xs text-slate-400">
          {sudahMemilih}/{totalPeserta} sudah memilih
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DAFTAR_WARNA.map((w) => {
          const meta = WARNA_META[w]
          const anggota = pesertaPerWarna[w]
          const iniHasilSpin = warnaSpin === w

          return (
            <div
              key={w}
              className={`rounded-xl border p-3 transition ${
                iniHasilSpin
                  ? 'border-amber-400 bg-amber-500/10 ring-1 ring-amber-400/40'
                  : warnaSpin
                    ? 'border-slate-700 bg-slate-900/60 opacity-60'
                    : 'border-slate-700 bg-slate-900/60'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-sm font-bold ${meta.teks}`}>
                  {meta.emoji} {meta.label}
                </span>
                <span className="shrink-0 rounded-md bg-slate-800 px-1.5 py-0.5 text-xs font-semibold text-slate-300">
                  {anggota.length}
                </span>
              </div>

              {iniHasilSpin && (
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-400">
                  🎯 Wajib menjawab
                </p>
              )}

              <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                {anggota.length > 0 ? anggota.join(', ') : <span className="text-slate-600">—</span>}
              </p>
            </div>
          )
        })}
      </div>
    </div>
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
  if (state.fase === 'skor')
    return <p className="font-semibold text-amber-400">🏆 Papan skor putaran {state.putaran}</p>
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
        {/* Layar fasilitator biasanya di-share ke peserta, jadi jenis efek dan
            nominalnya ikut disembunyikan sampai reveal — keduanya menunjukkan
            arah jawaban yang benar. */}
        {reveal ? (
          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${efek.kelas}`}>
            {efek.emoji} {efek.label}
            {soal.efek !== 'netral' && ` · ${rupiah(soal.nominal)}`}
          </span>
        ) : (
          <span className="rounded-full border border-slate-600 bg-slate-700/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
            ❓ Kasus keuangan
          </span>
        )}
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

/**
 * Progress dan rekap jawaban putaran berjalan.
 *
 * Sebelum reveal, nama yang sudah menjawab tetap ditampilkan supaya fasilitator
 * tahu kapan boleh melanjutkan — tapi benar/salahnya masih disembunyikan agar
 * tidak terbaca peserta lewat layar yang di-share.
 */
function RekapSingkat({
  jawaban,
  nama,
  terbuka,
  idWajib,
}: {
  jawaban: JawabanPeserta[]
  nama: Map<string, string>
  terbuka: boolean
  idWajib: string[]
}) {
  const wajib = jawaban.filter((j) => j.wajib)
  const sukarela = jawaban.filter((j) => !j.wajib)

  const sudahMenjawab = new Set(jawaban.map((j) => j.peserta_id))
  const belum = idWajib.filter((id) => !sudahMenjawab.has(id))
  const persen = idWajib.length > 0 ? Math.round((wajib.length / idWajib.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-100">Progress jawaban</h3>
        <span className="text-sm text-slate-400">
          {wajib.length}/{idWajib.length} wajib
          {sukarela.length > 0 && ` · +${sukarela.length} sukarela`}
        </span>
      </div>

      {/* Bilah progress peserta wajib */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${persen}%` }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Kelompok judul="Wajib" daftar={wajib} nama={nama} aksen="text-amber-400" terbuka={terbuka} />
        <Kelompok
          judul="Sukarela"
          daftar={sukarela}
          nama={nama}
          aksen="text-slate-400"
          terbuka={terbuka}
        />
      </div>

      {belum.length > 0 && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-900/60 p-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">
            Belum menjawab · {belum.length}
          </p>
          <p className="text-xs leading-relaxed text-slate-400">
            {belum.map((id) => nama.get(id) ?? '—').join(', ')}
          </p>
        </div>
      )}

      {!terbuka && (
        <p className="mt-3 text-xs text-slate-500">
          Benar/salah disembunyikan sampai kamu menekan “Reveal Jawaban”.
        </p>
      )}
    </div>
  )
}

function Kelompok({
  judul,
  daftar,
  nama,
  aksen,
  terbuka,
}: {
  judul: string
  daftar: JawabanPeserta[]
  nama: Map<string, string>
  aksen: string
  terbuka: boolean
}) {
  const benar = daftar.filter((j) => j.benar).length
  // Sebelum dibuka, urutkan berdasarkan kecepatan supaya terlihat siapa yang gesit.
  const urut = [...daftar].sort(
    (a, b) => (a.waktu_jawab_ms ?? Infinity) - (b.waktu_jawab_ms ?? Infinity),
  )

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3">
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${aksen}`}>
        {judul} · {terbuka ? `${benar}/${daftar.length} benar` : `${daftar.length} masuk`}
      </p>

      {urut.length === 0 ? (
        <p className="text-xs text-slate-600">—</p>
      ) : (
        <ul className="space-y-1">
          {urut.map((j) => (
            <li key={j.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-slate-300">{nama.get(j.peserta_id) ?? '—'}</span>
              <span className="flex shrink-0 items-center gap-1.5">
                {j.waktu_jawab_ms !== null && (
                  <span className="tabular-nums text-slate-500">
                    {(j.waktu_jawab_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {terbuka ? (
                  <>
                    <span className="text-slate-500">{j.pilihan ?? '⏰'}</span>
                    <span>{j.benar ? '✅' : '❌'}</span>
                  </>
                ) : (
                  <span className="text-amber-400">{j.pilihan === null ? '⏰' : '📌'}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
