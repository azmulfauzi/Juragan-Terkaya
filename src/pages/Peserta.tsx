import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import {
  ambilJawabanSaya,
  ambilPeserta,
  ambilPilihanWarnaSaya,
  ambilSoalById,
  ambilTransaksiSaya,
  daftarPeserta,
  simpanJawaban,
  simpanPilihanWarna,
  simpanTransaksi,
  ubahSaldo,
} from '../lib/api'
import {
  DAFTAR_WARNA,
  DENDA,
  DURASI_PILIH_WARNA,
  DURASI_SOAL,
  EFEK_META,
  MODAL_AWAL,
  SUKARELA_MEMPENGARUHI_SALDO,
  WARNA_META,
} from '../lib/config'
import {
  bacaIdPeserta,
  simpanIdPeserta,
  useGameState,
  useSisaWaktu,
  type StatusKoneksi,
} from '../lib/hooks'
import { LABEL_OPSI, rupiah, selisih } from '../lib/format'
import type { JawabanPeserta, Peserta as TPeserta, Pilihan, PilihanWarna, Soal, Transaksi, Warna } from '../lib/types'
import TimerRing from '../components/TimerRing'

export default function Peserta() {
  const { state, koneksi } = useGameState()

  const [peserta, setPeserta] = useState<TPeserta | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const [pilihanWarna, setPilihanWarna] = useState<PilihanWarna | null>(null)
  const [jawaban, setJawaban] = useState<JawabanPeserta | null>(null)
  const [soal, setSoal] = useState<Soal | null>(null)
  const [transaksi, setTransaksi] = useState<Transaksi[]>([])
  const [mengirim, setMengirim] = useState(false)

  const putaran = state?.putaran ?? 0
  const wajib = Boolean(state?.warna_spin && pilihanWarna?.warna === state.warna_spin)

  const sisaWarna = useSisaWaktu(
    state?.fase === 'pilih_warna' ? state.fase_mulai : null,
    DURASI_PILIH_WARNA,
  )
  const sisaSoal = useSisaWaktu(state?.fase === 'soal' ? state.fase_mulai : null, DURASI_SOAL)

  // ── Muat identitas peserta dari perangkat ──────────────────────────────
  const muatPeserta = useCallback(async () => {
    const id = bacaIdPeserta()
    if (!id) {
      setPeserta(null)
      setMemuat(false)
      return
    }
    try {
      const data = await ambilPeserta(id)
      if (!data) {
        // Data terhapus (fasilitator melakukan reset) — daftar ulang.
        simpanIdPeserta(null)
        setPeserta(null)
      } else {
        setPeserta(data)
      }
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muatPeserta()
    const timer = setInterval(muatPeserta, 10_000)
    return () => clearInterval(timer)
  }, [muatPeserta])

  // ── Muat data putaran berjalan (juga saat peserta refresh di tengah ronde) ──
  useEffect(() => {
    if (!peserta || putaran === 0) {
      setPilihanWarna(null)
      setJawaban(null)
      return
    }
    let aktif = true
    Promise.all([
      ambilPilihanWarnaSaya(peserta.id, putaran),
      ambilJawabanSaya(peserta.id, putaran),
    ])
      .then(([w, j]) => {
        if (!aktif) return
        setPilihanWarna(w)
        setJawaban(j)
      })
      .catch((e) => setGalat(e instanceof Error ? e.message : String(e)))
    return () => {
      aktif = false
    }
  }, [peserta?.id, putaran])

  // ── Muat soal aktif ──────────────────────────────────────────────────
  useEffect(() => {
    if (!state?.soal_id) {
      setSoal(null)
      return
    }
    let aktif = true
    ambilSoalById(state.soal_id)
      .then((s) => aktif && setSoal(s))
      .catch((e) => setGalat(e instanceof Error ? e.message : String(e)))
    return () => {
      aktif = false
    }
  }, [state?.soal_id])

  // ── Muat riwayat transaksi ───────────────────────────────────────────
  const muatTransaksi = useCallback(async () => {
    if (!peserta) return
    try {
      setTransaksi(await ambilTransaksiSaya(peserta.id))
    } catch {
      /* diamkan — riwayat bukan data kritis */
    }
  }, [peserta?.id])

  useEffect(() => {
    muatTransaksi()
  }, [muatTransaksi, putaran])

  // ── Aksi: pilih warna ────────────────────────────────────────────────
  const pilihWarna = useCallback(
    async (warna: Warna, otomatis = false) => {
      if (!peserta || !state || pilihanWarna) return
      try {
        await simpanPilihanWarna(peserta.id, state.putaran, warna, otomatis)
        const tersimpan = await ambilPilihanWarnaSaya(peserta.id, state.putaran)
        setPilihanWarna(tersimpan)
      } catch (e) {
        setGalat(e instanceof Error ? e.message : String(e))
      }
    },
    [peserta, state, pilihanWarna],
  )

  // Sistem memilihkan warna acak bila peserta tidak sempat memilih.
  const autoWarnaRef = useRef<number | null>(null)
  useEffect(() => {
    if (!state || !peserta || state.fase !== 'pilih_warna') return
    if (pilihanWarna || sisaWarna > 0) return
    if (autoWarnaRef.current === state.putaran) return
    autoWarnaRef.current = state.putaran
    void pilihWarna(DAFTAR_WARNA[Math.floor(Math.random() * DAFTAR_WARNA.length)], true)
  }, [state, peserta, pilihanWarna, sisaWarna, pilihWarna])

  // ── Aksi: kirim jawaban ──────────────────────────────────────────────
  const kirimJawaban = useCallback(
    async (pilihan: Pilihan | null) => {
      if (!peserta || !state || !soal || jawaban || mengirim) return
      setMengirim(true)
      try {
        const benar = pilihan !== null && pilihan === soal.jawaban
        const berpengaruh = wajib || SUKARELA_MEMPENGARUHI_SALDO

        let delta = 0
        if (berpengaruh) {
          if (benar) {
            delta = soal.efek === 'masuk' ? soal.nominal : soal.efek === 'keluar' ? -soal.nominal : 0
          } else {
            delta = -DENDA
          }
        }

        const record = {
          peserta_id: peserta.id,
          putaran: state.putaran,
          soal_id: soal.id,
          pilihan,
          benar,
          wajib,
          delta_saldo: delta,
        }
        await simpanJawaban(record)

        // Pastikan saldo hanya berubah sekali walau ada percobaan ganda.
        const tersimpan = await ambilJawabanSaya(peserta.id, state.putaran)
        setJawaban(tersimpan)

        if (tersimpan && tersimpan.delta_saldo !== 0) {
          const saldoBaru = peserta.saldo + tersimpan.delta_saldo
          await ubahSaldo(peserta.id, saldoBaru)
          setPeserta({ ...peserta, saldo: saldoBaru })
        }
      } catch (e) {
        setGalat(e instanceof Error ? e.message : String(e))
      } finally {
        setMengirim(false)
      }
    },
    [peserta, state, soal, jawaban, mengirim, wajib],
  )

  // Peserta WAJIB yang tidak menjawab sampai waktu habis dianggap salah.
  const autoTimeoutRef = useRef<number | null>(null)
  useEffect(() => {
    if (!state || !peserta || !soal || state.fase !== 'soal') return
    if (jawaban || sisaSoal > 0 || !wajib) return
    if (autoTimeoutRef.current === state.putaran) return
    autoTimeoutRef.current = state.putaran
    void kirimJawaban(null)
  }, [state, peserta, soal, jawaban, sisaSoal, wajib, kirimJawaban])

  // ── Render ───────────────────────────────────────────────────────────
  if (memuat) {
    return <Pusat>Memuat…</Pusat>
  }

  if (!peserta) {
    return <FormDaftar onDaftar={setPeserta} onGalat={setGalat} galat={galat} />
  }

  const sudahCatatPutaranIni = transaksi.some((t) => t.putaran === putaran)
  const perluCatat =
    wajib && jawaban?.benar === true && soal !== null && soal.efek !== 'netral' && !sudahCatatPutaranIni

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-4">
      <BadgeStatus peserta={peserta} warna={pilihanWarna?.warna ?? null} />
      <BadgeKoneksi status={koneksi} />

      {galat && (
        <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {galat}
        </div>
      )}

      {(!state || !state.berjalan) && state?.fase !== 'selesai' && (
        <KartuInfo emoji="⏳" judul="Menunggu fasilitator memulai game…">
          Siapkan HP-mu. Setiap putaran kamu akan diminta memilih warna kartu.
        </KartuInfo>
      )}

      {state?.fase === 'selesai' && (
        <KartuInfo emoji="🏁" judul="Game selesai!">
          Saldo akhirmu <b className="text-amber-400">{rupiah(peserta.saldo)}</b>. Lihat papan skor
          di layar fasilitator.
        </KartuInfo>
      )}

      {state?.berjalan && state.fase === 'pilih_warna' && (
        <FasePilihWarna
          sisa={sisaWarna}
          terpilih={pilihanWarna}
          onPilih={(w) => pilihWarna(w)}
          putaran={state.putaran}
        />
      )}

      {state?.berjalan && state.fase === 'spin' && (
        <KartuInfo emoji="🎰" judul="Roda sedang diputar…">
          Warnamu putaran ini:{' '}
          {pilihanWarna ? (
            <b className={WARNA_META[pilihanWarna.warna].teks}>
              {WARNA_META[pilihanWarna.warna].emoji} {WARNA_META[pilihanWarna.warna].label}
            </b>
          ) : (
            '—'
          )}
          . Lihat layar fasilitator!
        </KartuInfo>
      )}

      {state?.berjalan && (state.fase === 'soal' || state.fase === 'reveal') && soal && (
        <FaseSoal
          soal={soal}
          wajib={wajib}
          warnaSpin={state.warna_spin}
          warnaSaya={pilihanWarna?.warna ?? null}
          sisa={sisaSoal}
          jawaban={jawaban}
          mengirim={mengirim}
          faseReveal={state.fase === 'reveal'}
          onJawab={kirimJawaban}
        />
      )}

      {state?.show_insight && soal && (
        <div className="animasi-muncul mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5">
          <h3 className="mb-2 font-bold text-amber-300">💡 Insight</h3>
          <p className="text-sm leading-relaxed text-slate-200">{soal.insight}</p>
        </div>
      )}

      {perluCatat && soal && (
        <FormCatatTransaksi
          soal={soal}
          putaran={putaran}
          pesertaId={peserta.id}
          onTersimpan={muatTransaksi}
          onGalat={setGalat}
        />
      )}

      {transaksi.length > 0 && <RiwayatTransaksi daftar={transaksi} />}
    </div>
  )
}

// ══════════════════════════ Komponen pendukung ══════════════════════════

function Pusat({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen items-center justify-center text-slate-400">{children}</div>
}

function KartuInfo({
  emoji,
  judul,
  children,
}: {
  emoji: string
  judul: string
  children?: React.ReactNode
}) {
  return (
    <div className="animasi-muncul rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <h2 className="font-bold text-slate-100">{judul}</h2>
      {children && <p className="mt-2 text-sm text-slate-400">{children}</p>}
    </div>
  )
}

function FormDaftar({
  onDaftar,
  onGalat,
  galat,
}: {
  onDaftar: (p: TPeserta) => void
  onGalat: (s: string | null) => void
  galat: string | null
}) {
  const [nama, setNama] = useState('')
  const [proses, setProses] = useState(false)

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (nama.trim().length < 2 || proses) return
    setProses(true)
    onGalat(null)
    try {
      const p = await daftarPeserta(nama)
      simpanIdPeserta(p.id)
      onDaftar(p)
    } catch (err) {
      onGalat(err instanceof Error ? err.message : String(err))
    } finally {
      setProses(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={kirim} className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/60 p-7">
        <div className="mb-6 text-center">
          <div className="mb-2 text-5xl">💰</div>
          <h1 className="text-xl font-bold text-amber-400">Juragan Terkaya</h1>
          <p className="mt-2 text-sm text-slate-400">
            Kamu akan memulai usaha dengan modal
            <br />
            <b className="text-lg text-slate-100">{rupiah(MODAL_AWAL)}</b>
          </p>
        </div>

        <label className="mb-1.5 block text-sm text-slate-300">Nama lengkap</label>
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Contoh: Siti Rahayu"
          maxLength={40}
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-slate-100 outline-none focus:border-amber-400"
        />

        {galat && <p className="mt-3 text-sm text-red-400">{galat}</p>}

        <button
          type="submit"
          disabled={nama.trim().length < 2 || proses}
          className="mt-5 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
        >
          {proses ? 'Mendaftar…' : 'Bergabung'}
        </button>
      </form>
    </div>
  )
}

function BadgeStatus({ peserta, warna }: { peserta: TPeserta; warna: Warna | null }) {
  const untung = peserta.saldo >= MODAL_AWAL
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-slate-100">{peserta.nama}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {warna ? (
            <span className={WARNA_META[warna].teks}>
              {WARNA_META[warna].emoji} {WARNA_META[warna].label} 🔒
            </span>
          ) : (
            'Belum pilih warna'
          )}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-lg font-bold tabular-nums ${untung ? 'text-green-400' : 'text-red-400'}`}>
          {rupiah(peserta.saldo)}
        </p>
        <p className="text-[10px] text-slate-500">{selisih(peserta.saldo - MODAL_AWAL)}</p>
      </div>
    </div>
  )
}

const META_KONEKSI: Record<StatusKoneksi, { teks: string; kelas: string; titik: string }> = {
  terhubung: {
    teks: 'Terhubung',
    kelas: 'text-green-400',
    titik: 'bg-green-400',
  },
  lambat: {
    teks: 'Koneksi lambat — data tetap masuk, mungkin telat beberapa detik',
    kelas: 'text-yellow-400',
    titik: 'bg-yellow-400',
  },
  bermasalah: {
    teks: 'Koneksi bermasalah — coba muat ulang halaman',
    kelas: 'text-red-400',
    titik: 'bg-red-400',
  },
}

function BadgeKoneksi({ status }: { status: StatusKoneksi }) {
  const meta = META_KONEKSI[status]
  return (
    <div className={`mb-3 flex items-center gap-2 px-1 text-[11px] ${meta.kelas}`}>
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${meta.titik}`} />
      <span className="flex-1">{meta.teks}</span>
      {status === 'bermasalah' && (
        <button
          onClick={() => location.reload()}
          className="shrink-0 rounded-md border border-red-500/50 px-2 py-0.5 font-medium transition hover:bg-red-500/10"
        >
          Muat ulang
        </button>
      )}
    </div>
  )
}

function FasePilihWarna({
  sisa,
  terpilih,
  onPilih,
  putaran,
}: {
  sisa: number
  terpilih: PilihanWarna | null
  onPilih: (w: Warna) => void
  putaran: number
}) {
  return (
    <div className="animasi-muncul rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Putaran {putaran}</p>
          <h2 className="font-bold text-slate-100">
            {terpilih ? 'Warna terkunci' : 'Pilih warna kartumu'}
          </h2>
        </div>
        {!terpilih && <TimerRing sisa={sisa} total={DURASI_PILIH_WARNA} ukuran={72} label="detik" />}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {DAFTAR_WARNA.map((w) => {
          const meta = WARNA_META[w]
          const dipilih = terpilih?.warna === w
          const redup = terpilih !== null && !dipilih
          return (
            <button
              key={w}
              onClick={() => onPilih(w)}
              disabled={terpilih !== null}
              className={`rounded-2xl px-4 py-6 text-lg font-bold text-white transition ${meta.bg} ${
                terpilih ? '' : meta.bgHover + ' active:scale-95'
              } ${redup ? 'opacity-25' : ''} ${dipilih ? 'ring-4 ring-white/80' : ''}`}
            >
              <span className="block text-3xl">{meta.emoji}</span>
              <span className="mt-1 block text-sm">{meta.label}</span>
              {dipilih && <span className="mt-1 block text-xs">🔒 Terkunci</span>}
            </button>
          )
        })}
      </div>

      {terpilih?.otomatis && (
        <p className="mt-3 text-center text-xs text-amber-400">
          ⚡ Waktu habis — sistem memilihkan warna secara acak untukmu.
        </p>
      )}
    </div>
  )
}

function FaseSoal({
  soal,
  wajib,
  warnaSpin,
  warnaSaya,
  sisa,
  jawaban,
  mengirim,
  faseReveal,
  onJawab,
}: {
  soal: Soal
  wajib: boolean
  warnaSpin: Warna | null
  warnaSaya: Warna | null
  sisa: number
  jawaban: JawabanPeserta | null
  mengirim: boolean
  faseReveal: boolean
  onJawab: (p: Pilihan) => void
}) {
  const efek = EFEK_META[soal.efek]
  const selesai = jawaban !== null || faseReveal
  const habis = sisa === 0

  return (
    <div className="animasi-muncul space-y-4">
      {/* Pengumuman hasil putaran roda */}
      <div
        className={`overflow-hidden rounded-2xl border ${
          wajib ? 'border-amber-400/60' : 'border-slate-600'
        }`}
      >
        <div
          className={`px-4 py-4 text-center text-white ${
            warnaSpin ? WARNA_META[warnaSpin].bg : 'bg-slate-700'
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-widest opacity-90">
            🎰 Roda berhenti di
          </p>
          <p className="mt-0.5 text-2xl font-extrabold drop-shadow">
            {warnaSpin ? `${WARNA_META[warnaSpin].emoji} ${WARNA_META[warnaSpin].label}` : '—'}
          </p>
        </div>

        <div
          className={`px-4 py-3 text-center ${
            wajib ? 'bg-amber-500/15 text-amber-300' : 'bg-slate-800/80 text-slate-300'
          }`}
        >
          {wajib ? (
            <>
              <p className="font-bold">🎯 Warnamu cocok — kamu WAJIB menjawab!</p>
              <p className="mt-0.5 text-xs opacity-80">
                Tidak menjawab sampai waktu habis kena denda {rupiah(DENDA)}.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm">
                Warnamu{' '}
                {warnaSaya ? (
                  <b className={WARNA_META[warnaSaya].teks}>
                    {WARNA_META[warnaSaya].emoji} {WARNA_META[warnaSaya].label}
                  </b>
                ) : (
                  '—'
                )}{' '}
                — boleh ikut jawab
              </p>
              <p className="mt-0.5 text-xs opacity-70">
                Tidak wajib. Diam saja aman, tapi jawaban benar menambah saldomu.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Kartu soal */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          {/* Jenis efek baru boleh terlihat setelah jawaban dibuka — sebelum itu
              badge ini membocorkan arah jawaban yang benar. */}
          {selesai ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${efek.kelas}`}>
              {efek.emoji} {efek.label}
            </span>
          ) : (
            <span className="rounded-full border border-slate-600 bg-slate-700/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              ❓ Kasus keuangan
            </span>
          )}
          {!selesai && !habis && <TimerRing sisa={sisa} total={DURASI_SOAL} ukuran={64} />}
        </div>

        <p className="text-[15px] leading-relaxed text-slate-100">{soal.teks}</p>

        <div className="mt-4 space-y-2">
          {soal.opsi.map((teks, i) => {
            const label = LABEL_OPSI[i]
            const iniJawabanBenar = label === soal.jawaban
            const iniPilihanSaya = jawaban?.pilihan === label

            let gaya = 'border-slate-600 bg-slate-900 hover:border-amber-400'
            if (selesai) {
              if (iniJawabanBenar) gaya = 'border-green-500 bg-green-500/15'
              else if (iniPilihanSaya) gaya = 'border-red-500 bg-red-500/15'
              else gaya = 'border-slate-700 bg-slate-900 opacity-50'
            }

            return (
              <button
                key={label}
                onClick={() => onJawab(label)}
                disabled={selesai || mengirim || habis}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm text-slate-100 transition disabled:cursor-default ${gaya}`}
              >
                <span className="mt-px shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold">
                  {label}
                </span>
                <span className="flex-1">{teks}</span>
                {selesai && iniJawabanBenar && <span>✅</span>}
                {selesai && iniPilihanSaya && !iniJawabanBenar && <span>❌</span>}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hasil */}
      {jawaban && <HasilJawaban jawaban={jawaban} soal={soal} />}

      {!jawaban && habis && !wajib && (
        <p className="text-center text-sm text-slate-400">
          Waktu habis. Kamu tidak ikut menjawab, saldomu tidak berubah.
        </p>
      )}
    </div>
  )
}

function HasilJawaban({ jawaban, soal }: { jawaban: JawabanPeserta; soal: Soal }) {
  if (jawaban.benar) {
    return (
      <div className="rounded-2xl border border-green-500/40 bg-green-500/10 p-4 text-center">
        <p className="font-bold text-green-400">✅ Jawaban benar!</p>
        <p className="mt-1 text-sm text-slate-300">
          {soal.efek === 'netral'
            ? 'Soal diskusi — saldo tidak berubah.'
            : `Saldo ${soal.efek === 'masuk' ? 'bertambah' : 'berkurang'} ${rupiah(soal.nominal)}.`}
        </p>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-center">
      <p className="font-bold text-red-400">
        {jawaban.pilihan === null ? '⏰ Waktu habis!' : '❌ Jawaban salah'}
      </p>
      <p className="mt-1 text-sm text-slate-300">
        {jawaban.delta_saldo === 0
          ? 'Saldomu tidak berubah.'
          : `Saldo dikurangi denda ${rupiah(DENDA)}.`}
      </p>
    </div>
  )
}

function FormCatatTransaksi({
  soal,
  putaran,
  pesertaId,
  onTersimpan,
  onGalat,
}: {
  soal: Soal
  putaran: number
  pesertaId: string
  onTersimpan: () => void
  onGalat: (s: string) => void
}) {
  const [keterangan, setKeterangan] = useState('')
  const [proses, setProses] = useState(false)
  const masuk = soal.efek === 'masuk'

  async function kirim(e: FormEvent) {
    e.preventDefault()
    if (proses) return
    setProses(true)
    try {
      await simpanTransaksi({
        peserta_id: pesertaId,
        putaran,
        keterangan: keterangan.trim() || soal.teks.slice(0, 60),
        jumlah: soal.nominal,
        arah: masuk ? 'masuk' : 'keluar',
      })
      onTersimpan()
    } catch (err) {
      onGalat(err instanceof Error ? err.message : String(err))
    } finally {
      setProses(false)
    }
  }

  return (
    <form
      onSubmit={kirim}
      className="animasi-muncul mt-4 rounded-2xl border border-amber-400/40 bg-amber-500/10 p-5"
    >
      <h3 className="font-bold text-amber-300">📒 Catat transaksimu</h3>
      <p className="mt-1 text-xs text-slate-400">
        Inilah kebiasaan yang melatih juragan sukses — catat setiap transaksi usaha.
      </p>

      <label className="mt-4 mb-1.5 block text-sm text-slate-300">Keterangan</label>
      <input
        value={keterangan}
        onChange={(e) => setKeterangan(e.target.value)}
        placeholder={soal.teks.slice(0, 50) + '…'}
        maxLength={80}
        className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-amber-400"
      />

      <label className="mt-3 mb-1.5 block text-sm text-slate-300">
        {masuk ? 'Pemasukan' : 'Pengeluaran'}
      </label>
      <input
        readOnly
        value={rupiah(soal.nominal)}
        className={`w-full cursor-not-allowed rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-2.5 font-semibold ${
          masuk ? 'text-green-400' : 'text-red-400'
        }`}
      />
      <p className="mt-1 text-[11px] text-slate-500">
        Nominal terkunci mengikuti soal agar penilaian tetap adil.
      </p>

      <button
        type="submit"
        disabled={proses}
        className="mt-4 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
      >
        {proses ? 'Menyimpan…' : 'Simpan Catatan'}
      </button>
    </form>
  )
}

function RiwayatTransaksi({ daftar }: { daftar: Transaksi[] }) {
  return (
    <div className="mt-6">
      <h3 className="mb-2 text-sm font-semibold text-slate-400">📒 Catatan transaksimu</h3>
      <div className="space-y-2">
        {daftar.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-slate-200">{t.keterangan}</p>
              <p className="text-[11px] text-slate-500">Putaran {t.putaran}</p>
            </div>
            <span
              className={`ml-3 shrink-0 text-sm font-semibold tabular-nums ${
                t.arah === 'masuk' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {t.arah === 'masuk' ? '+' : '−'}
              {rupiah(t.jumlah)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
