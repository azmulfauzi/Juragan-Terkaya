import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ambilSemuaJawaban,
  ambilSemuaPeserta,
  ambilSemuaSoal,
  ambilSemuaTema,

  ambilSoalTema,
  pilihSoalAcak,
  resetGame,
  seedTemaJikaKosong,
  tambahRiwayat,
  bukaJawabanPutaran,
  sisaSoalAktif,
  ubahGameState,
} from '../lib/api'
import { DURASI_SOAL, EFEK_META } from '../lib/config'
import { useGameState, useRealtimeTabel, useSisaWaktu } from '../lib/hooks'
import { sekarang } from '../lib/waktu'
import { LABEL_OPSI, gabungPilihan, rupiah } from '../lib/format'
import { formatPoin, formatWaktu, poinJawaban } from '../lib/skor'
import type { JawabanPeserta, Soal, Tema } from '../lib/types'
import PinGate from '../components/PinGate'
import TimerRing from '../components/TimerRing'
import BankSoal from '../components/BankSoal'
import PapanSkorPutaran from '../components/PapanSkorPutaran'
import BannerVersi from '../components/BannerVersi'
import { useVersiKedaluwarsa } from '../lib/versi'
import Dashboard, { type DataDashboard } from '../components/Dashboard'

const KUNCI_PIN = 'juragan-terkaya:fasilitator'
const TABEL_DIPANTAU = ['peserta', 'jawaban']

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

  const [tema, setTema] = useState<Tema[]>([])
  const [soalTema, setSoalTema] = useState<Soal[]>([])
  const [data, setData] = useState<DataDashboard>({
    peserta: [],
    jawaban: [],

    soal: [],
  })
  const [tab, setTab] = useState<'kendali' | 'bank' | 'dashboard'>('kendali')
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, setSibuk] = useState(false)

  const [daftarTerbuka, setDaftarTerbuka] = useState(false)
  const [notifBergabung, setNotifBergabung] = useState<string[]>([])
  const idPesertaSebelumnya = useRef<Set<string> | null>(null)

  const sisaSoal = useSisaWaktu(state?.fase === 'soal' ? state.fase_mulai : null, DURASI_SOAL)

  // ── Muat daftar tema (isi bawaan bila database masih benar-benar kosong) ──
  const muatTema = useCallback(async () => {
    try {
      setTema(await seedTemaJikaKosong())
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    }
  }, [])

  useEffect(() => {
    muatTema()
  }, [muatTema])

  // ── Muat soal dari tema yang sedang dipilih ──────────────────────────
  const temaId = state?.tema_id ?? null
  useEffect(() => {
    if (!temaId) {
      setSoalTema([])
      return
    }
    let aktif = true
    ambilSoalTema(temaId)
      .then((s) => aktif && setSoalTema(s))
      .catch((e) => setGalat(e instanceof Error ? e.message : String(e)))
    return () => {
      aktif = false
    }
  }, [temaId])

  const temaAktif = useMemo(() => tema.find((t) => t.id === temaId) ?? null, [tema, temaId])

  // ── Muat data dashboard, disegarkan otomatis lewat realtime ──
  const muatData = useCallback(async () => {
    try {
      const [peserta, jawaban, semuaSoal] = await Promise.all([
        ambilSemuaPeserta(),
        ambilSemuaJawaban(),

        ambilSemuaSoal(),
      ])
      setData({ peserta, jawaban, soal: semuaSoal })
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

  /** Mengganti tema yang dimainkan. Riwayat soal ikut dikosongkan. */
  const pilihTema = (id: number | null) =>
    jalankan(() => ubahGameState({ tema_id: id, riwayat_soal: [] }))

  /**
   * Membuka putaran baru: mengundi soal acak dari tema yang dipilih lalu
   * menampilkannya ke seluruh peserta.
   *
   * Bila seluruh soal aktif sudah keluar, permainan langsung diakhiri —
   * tidak mengulang dari awal. Kalau fasilitator mencentang 10 soal, memang
   * selesai setelah soal ke-10.
   */
  const mulaiPutaran = useCallback(
    (putaranBaru: number) =>
      jalankan(async () => {
        if (!temaId) throw new Error('Pilih tema soal terlebih dahulu.')

        // Diambil ulang dari database supaya soal yang baru saja ditambahkan
        // lewat menu Bank Soal langsung ikut terundi.
        const daftarSoal = await ambilSoalTema(temaId)
        setSoalTema(daftarSoal)

        const riwayat = state?.riwayat_soal ?? []
        const terpilih = pilihSoalAcak(daftarSoal, riwayat)

        if (!terpilih) {
          const adaSoalAktif = daftarSoal.some((s) => s.aktif)
          if (!adaSoalAktif) {
            throw new Error(
              'Tema ini belum punya soal aktif. Centang soal di menu Bank Soal terlebih dahulu.',
            )
          }
          // Semua soal sudah dimainkan — tutup permainan.
          await ubahGameState({ fase: 'selesai', berjalan: false, soal_id: null })
          return
        }

        await ubahGameState({
          berjalan: true,
          fase: 'soal',
          putaran: putaranBaru,
          soal_id: terpilih.id,
          fase_mulai: new Date(sekarang()).toISOString(),
          reveal: false,
          show_insight: false,
          riwayat_soal: tambahRiwayat(riwayat, terpilih.id),
        })
      }),
    [temaId, state?.riwayat_soal, jalankan],
  )

  /**
   * Membuka jawaban seluruh peserta putaran ini. Sebelum dibuka, jawaban tidak
   * ikut dihitung ke poin mana pun — supaya peserta tidak bisa menebak
   * benar/salah dari poinnya yang bertambah lebih dulu.
   */
  const revealJawaban = () =>
    jalankan(async () => {
      if (state) await bukaJawabanPutaran(state.putaran)
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
      await muatData()
    })
  }

  // ── Data turunan untuk panel kontrol ─────────────────────────────────
  const soalAktif = useMemo(
    () => soalTema.find((s) => s.id === state?.soal_id) ?? null,
    [soalTema, state?.soal_id],
  )

  const namaPeserta = useMemo(
    () => new Map(data.peserta.map((p) => [p.id, p.nama])),
    [data.peserta],
  )

  const jawabanPutaranIni = useMemo(
    () => data.jawaban.filter((j) => j.putaran === state?.putaran),
    [data.jawaban, state?.putaran],
  )

  /** Seluruh peserta kini wajib menjawab setiap soal. */
  const idSemuaPeserta = useMemo(() => data.peserta.map((p) => p.id), [data.peserta])

  /** Soal aktif yang belum keluar pada sesi berjalan. */
  const sisaSoalIni = useMemo(
    () => sisaSoalAktif(soalTema, state?.riwayat_soal ?? []),
    [soalTema, state?.riwayat_soal],
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
          <h1 className="text-xl font-extrabold text-amber-400">💰 Games Literasi Keuangan</h1>
          <p className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
            <span>Panel Fasilitator ·</span>
            <button
              onClick={() => setDaftarTerbuka((v) => !v)}
              className="rounded px-1 py-0.5 font-semibold text-amber-400 underline decoration-dotted underline-offset-2 transition hover:bg-slate-800"
              title="Klik untuk melihat nama peserta"
            >
              {data.peserta.length} peserta bergabung {daftarTerbuka ? '▴' : '▾'}
            </button>
            {temaAktif && <span>· {temaAktif.nama}</span>}
            {state.berjalan && <span>· Putaran {state.putaran}</span>}
          </p>
        </div>
        <div className="flex gap-2">
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
      <div className="mb-5 flex flex-wrap gap-2">
        <TabUtama aktif={tab === 'kendali'} onClick={() => setTab('kendali')}>
          🎮 Kendali
        </TabUtama>
        <TabUtama aktif={tab === 'bank'} onClick={() => setTab('bank')}>
          📚 Bank Soal
        </TabUtama>
        <TabUtama aktif={tab === 'dashboard'} onClick={() => setTab('dashboard')}>
          📊 Dashboard
        </TabUtama>
      </div>

      {tab === 'bank' ? (
        <BankSoal
          onBerubah={() => {
            muatTema()
            if (temaId) ambilSoalTema(temaId).then(setSoalTema).catch(() => {})
          }}
        />
      ) : tab === 'dashboard' ? (
        <Dashboard data={data} putaranAktif={state.putaran} revealAktif={state.reveal} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Kolom kiri: kontrol putaran */}
          <section className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5 text-center">
            <PemilihTema
              tema={tema}
              temaId={temaId}
              jumlahAktif={soalTema.filter((s) => s.aktif).length}
              sisaAktif={sisaSoalIni}
              terkunci={state.berjalan}
              onPilih={pilihTema}
              onKeBankSoal={() => setTab('bank')}
            />

            <StatusFase state={state} sisaSoal={sisaSoal} />

            <div className="mt-5 flex flex-wrap justify-center gap-2">
              {!state.berjalan && state.fase !== 'selesai' && (
                <Tombol utama onClick={() => mulaiPutaran(1)} sibuk={sibuk || !temaId}>
                  ▶️ Mulai Game
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
                  ➡️ Lihat Papan Skor
                </Tombol>
              )}

              {state.fase === 'skor' && (
                <Tombol utama onClick={() => mulaiPutaran(state.putaran + 1)} sibuk={sibuk}>
                  ▶️ Soal Berikutnya
                </Tombol>
              )}

              {state.berjalan && state.fase === 'soal' && (
                <Tombol onClick={bukaPapanSkor} sibuk={sibuk}>
                  ⏭️ Lewati ke Papan Skor
                </Tombol>
              )}

              {/* Jaring pengaman: sesi lama bisa tersimpan dengan fase yang sudah
                  tidak dikenali (pilih_warna / spin). Tanpa ini fasilitator
                  tersangkut tanpa tombol lanjut. */}
              {state.berjalan &&
                !['soal', 'reveal', 'skor', 'selesai'].includes(state.fase) && (
                  <Tombol utama onClick={() => mulaiPutaran(state.putaran || 1)} sibuk={sibuk}>
                    ▶️ Tampilkan Soal
                  </Tombol>
                )}

              {state.berjalan && (
                <Tombol bahaya onClick={akhiriGame} sibuk={sibuk}>
                  🏁 Akhiri Game
                </Tombol>
              )}

              {/* Hanya ditawarkan bila masih ada soal tersisa. Tanpa penjagaan
                  ini tombolnya jadi jalan buntu: ditekan, tidak terjadi apa-apa. */}
              {state.fase === 'selesai' && sisaSoalIni > 0 && (
                <Tombol utama onClick={() => mulaiPutaran(state.putaran + 1)} sibuk={sibuk}>
                  ▶️ Lanjutkan Game
                </Tombol>
              )}
            </div>

            {state.fase === 'selesai' && sisaSoalIni === 0 && (
              <p className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-300">
                🎉 Seluruh soal tema ini sudah dimainkan. Tekan <b>♻️ Reset</b> untuk memulai sesi
                baru, atau ganti tema setelah reset.
              </p>
            )}

            <div className="mt-5 text-left">
              <DaftarPesertaBergabung peserta={data.peserta} belumMulai={!state.berjalan} />
            </div>
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
                  idSemuaPeserta={idSemuaPeserta}
                />
              </>
            ) : (
              <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
                Belum ada soal aktif. Tekan “Mulai Game” untuk menampilkan soal pertama.
              </div>
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

    </div>
  )
}

// ═════════════════════════ Komponen pendukung ═════════════════════════

/**
 * Pemilih tema yang akan dimainkan. Terkunci selama game berjalan supaya soal
 * tidak berpindah tema di tengah sesi — peringkat peserta jadi tidak sebanding
 * kalau materinya berganti di tengah jalan.
 */
function PemilihTema({
  tema,
  temaId,
  jumlahAktif,
  sisaAktif,
  terkunci,
  onPilih,
  onKeBankSoal,
}: {
  tema: Tema[]
  temaId: number | null
  /** Soal yang dicentang di tema ini. */
  jumlahAktif: number
  /** Soal aktif yang belum keluar pada sesi berjalan. */
  sisaAktif: number
  terkunci: boolean
  onPilih: (id: number | null) => void
  onKeBankSoal: () => void
}) {
  if (tema.length === 0) {
    return (
      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-300">
        Belum ada tema soal.{' '}
        <button onClick={onKeBankSoal} className="underline underline-offset-2">
          Buat tema di menu Bank Soal
        </button>{' '}
        terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-slate-700 bg-slate-900/60 p-3 text-left">
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">
        Tema soal sesi ini
      </label>

      <select
        value={temaId ?? ''}
        disabled={terkunci}
        onChange={(e) => onPilih(e.target.value ? Number(e.target.value) : null)}
        className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400 disabled:opacity-50"
      >
        <option value="">— pilih tema —</option>
        {tema.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nama}
          </option>
        ))}
      </select>

      {temaId && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-slate-800/60 px-2.5 py-1.5">
          <span className="text-[11px] text-slate-400">Soal dimainkan</span>
          <span className="text-xs font-semibold tabular-nums text-slate-100">
            {jumlahAktif - sisaAktif} / {jumlahAktif}
          </span>
        </div>
      )}

      <p className="mt-1.5 text-[11px] text-slate-500">
        {terkunci
          ? sisaAktif === 0
            ? 'Semua soal sudah dimainkan — game akan berakhir setelah putaran ini.'
            : `Tersisa ${sisaAktif} soal. Tema terkunci sampai game diakhiri atau direset.`
          : temaId
            ? jumlahAktif === 0
              ? 'Tema ini belum punya soal yang dicentang.'
              : `${jumlahAktif} soal dicentang dan siap dimainkan.`
            : 'Pilih tema dulu sebelum memulai game.'}
      </p>
    </div>
  )
}

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
          : 'Nama bertambah otomatis bila ada peserta yang baru bergabung.'}
      </p>
    </div>
  )
}

function StatusFase({
  state,
  sisaSoal,
}: {
  state: { fase: string; berjalan: boolean; putaran: number }
  sisaSoal: number
}) {
  if (!state.berjalan && state.fase !== 'selesai') {
    return <p className="text-slate-400">Game belum dimulai.</p>
  }

  if (state.fase === 'selesai') {
    return <p className="font-semibold text-amber-400">🏁 Game selesai — lihat tab Dashboard.</p>
  }

  if (state.fase === 'soal') {
    return (
      <div className="flex items-center justify-center gap-4">
        <TimerRing sisa={sisaSoal} total={DURASI_SOAL} ukuran={72} label="detik" />
        <div className="text-left">
          <p className="font-semibold text-slate-100">📝 Peserta menjawab…</p>
          <p className="text-sm text-slate-400">Putaran {state.putaran}</p>
        </div>
      </div>
    )
  }

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

      {soal.jawaban_benar.length > 1 && (
        <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
          Soal berjawaban ganda — peserta harus memilih {soal.jawaban_benar.length} opsi sekaligus.
        </p>
      )}

      <div className="mt-4 space-y-2">
        {soal.opsi.map((teks, i) => {
          const label = LABEL_OPSI[i]
          const benar = soal.jawaban_benar.includes(label)
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
  idSemuaPeserta,
}: {
  jawaban: JawabanPeserta[]
  nama: Map<string, string>
  terbuka: boolean
  idSemuaPeserta: string[]
}) {
  const sudahMenjawab = new Set(jawaban.map((j) => j.peserta_id))
  const belum = idSemuaPeserta.filter((id) => !sudahMenjawab.has(id))
  const persen =
    idSemuaPeserta.length > 0 ? Math.round((jawaban.length / idSemuaPeserta.length) * 100) : 0

  const benar = jawaban.filter((j) => j.benar).length
  // Diurutkan dari yang tercepat supaya terlihat siapa yang gesit.
  const urut = [...jawaban].sort(
    (a, b) => (a.waktu_jawab_ms ?? Infinity) - (b.waktu_jawab_ms ?? Infinity),
  )

  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-bold text-slate-100">Progress jawaban</h3>
        <span className="text-sm text-slate-400">
          {jawaban.length}/{idSemuaPeserta.length} peserta
          {terbuka && ` · ${benar} benar`}
        </span>
      </div>

      <div className="mb-4 h-2 overflow-hidden rounded-full bg-slate-900">
        <div
          className="h-full rounded-full bg-amber-500 transition-all duration-500"
          style={{ width: `${persen}%` }}
        />
      </div>

      {urut.length === 0 ? (
        <p className="text-center text-xs text-slate-500">Belum ada jawaban yang masuk.</p>
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
                    {(j.waktu_jawab_ms / 1000).toFixed(1)}s
                  </span>
                )}
                {terbuka ? (
                  <>
                    <span className="text-slate-500">{gabungPilihan(j.pilihan_ganda)}</span>
                    <span>{j.benar ? '✅' : '❌'}</span>
                  </>
                ) : (
                  <span className="text-amber-400">{j.pilihan_ganda === null ? '⏰' : '📌'}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

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
