import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  ambilJawabanPeserta,
  ambilJawabanSaya,
  ambilPeserta,
  ambilSemuaJawaban,
  ambilSemuaPeserta,
  ambilSemuaSoal,
  ambilSoalById,
  ambilTransaksiSaya,
  daftarPeserta,
  simpanJawaban,
  simpanTransaksi,
} from '../lib/api'
import {
  BONUS_BENAR,
  DENDA,
  DURASI_SOAL,
  EFEK_META,
  MODAL_AWAL,
} from '../lib/config'
import { sekarang } from '../lib/waktu'
import { useVersiKedaluwarsa } from '../lib/versi'
import { hitungBukuBesar } from '../lib/bukuBesar'
import PapanSkorPutaran from '../components/PapanSkorPutaran'
import BannerVersi from '../components/BannerVersi'
import BukuBesar from '../components/BukuBesar'
import {
  bacaIdPeserta,
  simpanIdPeserta,
  useGameState,
  useSisaWaktu,
  type StatusKoneksi,
} from '../lib/hooks'
import { LABEL_OPSI, jawabanCocok, rupiah, selisih } from '../lib/format'
import type { JawabanPeserta, Peserta as TPeserta, Pilihan, Soal, Transaksi } from '../lib/types'
import TimerRing from '../components/TimerRing'

export default function Peserta() {
  const { state, koneksi } = useGameState()
  const versiKedaluwarsa = useVersiKedaluwarsa()

  const [peserta, setPeserta] = useState<TPeserta | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState<string | null>(null)

  const [jawaban, setJawaban] = useState<JawabanPeserta | null>(null)
  const [soal, setSoal] = useState<Soal | null>(null)
  const [transaksi, setTransaksi] = useState<Transaksi[]>([])
  const [mengirim, setMengirim] = useState(false)

  // Riwayat lengkap milik peserta ini, untuk buku besarnya sendiri.
  const [jawabanSaya, setJawabanSaya] = useState<JawabanPeserta[]>([])
  const [bankSoal, setBankSoal] = useState<Soal[]>([])

  // Dimuat hanya saat fase papan skor — tidak perlu dibawa sepanjang permainan.
  const [semuaPeserta, setSemuaPeserta] = useState<TPeserta[]>([])
  const [semuaJawaban, setSemuaJawaban] = useState<JawabanPeserta[]>([])
  const [jawabanPutaran, setJawabanPutaran] = useState<JawabanPeserta[]>([])

  const putaran = state?.putaran ?? 0
  const fase = state?.fase
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

  // ── Muat jawaban putaran berjalan (juga saat peserta refresh di tengah ronde) ──
  useEffect(() => {
    if (!peserta || putaran === 0) {
      setJawaban(null)
      return
    }
    let aktif = true
    ambilJawabanSaya(peserta.id, putaran)
      .then((j) => aktif && setJawaban(j))
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

  // ── Muat riwayat untuk buku besar ────────────────────────────────────
  const muatRiwayat = useCallback(async () => {
    if (!peserta) return
    try {
      const [jwb, soalSemua] = await Promise.all([
        ambilJawabanPeserta(peserta.id),
        bankSoal.length > 0 ? Promise.resolve(bankSoal) : ambilSemuaSoal(),
      ])
      setJawabanSaya(jwb)
      setBankSoal(soalSemua)
    } catch {
      /* riwayat bukan data kritis — diamkan bila gagal */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peserta?.id])

  // Disegarkan tiap ganti putaran dan tiap hasil dibukukan.
  useEffect(() => {
    muatRiwayat()
  }, [muatRiwayat, putaran, fase === 'reveal'])

  // ── Segarkan saldo begitu fasilitator membukukan hasil putaran ──────
  useEffect(() => {
    if (fase === 'reveal' || fase === 'skor' || fase === 'selesai') muatPeserta()
  }, [fase, muatPeserta])

  // ── Muat data papan skor ─────────────────────────────────────────────
  useEffect(() => {
    if (fase !== 'skor' && fase !== 'selesai') return
    let aktif = true
    Promise.all([ambilSemuaPeserta(), ambilSemuaJawaban()])
      .then(([daftarPeserta, daftarJawaban]) => {
        if (!aktif) return
        setSemuaPeserta(daftarPeserta)
        setSemuaJawaban(daftarJawaban)
        setJawabanPutaran(daftarJawaban.filter((j) => j.putaran === putaran))
      })
      .catch(() => {
        /* papan skor bukan data kritis — diamkan bila gagal */
      })
    return () => {
      aktif = false
    }
  }, [fase, putaran])

  // ── Aksi: kirim jawaban ──────────────────────────────────────────────
  const kirimJawaban = useCallback(
    async (pilihan: Pilihan[] | null) => {
      if (!peserta || !state || !soal || jawaban || mengirim) return
      setMengirim(true)
      try {
        const benar = jawabanCocok(pilihan, soal.jawaban_benar)

        // Lama menjawab dihitung dari jam server agar adil lintas perangkat.
        // Dibulatkan: koreksi jam server menghasilkan pecahan milidetik,
        // sedangkan kolom waktu_jawab_ms bertipe integer.
        const durasiMs = DURASI_SOAL * 1000
        const waktuMs = Math.round(
          state.fase_mulai
            ? Math.max(0, Math.min(durasiMs, sekarang() - new Date(state.fase_mulai).getTime()))
            : durasiMs,
        )

        // Hanya bonus dan denda yang menggerakkan saldo. Nominal soal tidak
        // terlibat, dan kecepatan hanya jadi penentu urutan saat saldo seri.
        const delta = benar ? BONUS_BENAR : -DENDA

        await simpanJawaban({
          peserta_id: peserta.id,
          putaran: state.putaran,
          soal_id: soal.id,
          pilihan_ganda: pilihan,
          benar,
          wajib: true,
          delta_saldo: delta,
          waktu_jawab_ms: pilihan === null ? null : waktuMs,
          diterapkan: false,
        })

        // Saldo TIDAK diubah di sini. Perubahan saldo dibukukan serentak oleh
        // fasilitator saat reveal, supaya peserta tidak bisa menebak benar/salah
        // dari saldonya yang berubah lebih dulu.
        setJawaban(await ambilJawabanSaya(peserta.id, state.putaran))
      } catch (e) {
        setGalat(e instanceof Error ? e.message : String(e))
      } finally {
        setMengirim(false)
      }
    },
    [peserta, state, soal, jawaban, mengirim],
  )

  // Tidak menjawab sampai waktu habis dianggap salah dan kena denda.
  const autoTimeoutRef = useRef<number | null>(null)
  useEffect(() => {
    if (!state || !peserta || !soal || state.fase !== 'soal') return
    if (jawaban || sisaSoal > 0) return
    if (autoTimeoutRef.current === state.putaran) return
    autoTimeoutRef.current = state.putaran
    void kirimJawaban(null)
  }, [state, peserta, soal, jawaban, sisaSoal, kirimJawaban])

  // ── Render ───────────────────────────────────────────────────────────
  if (memuat) {
    return <Pusat>Memuat…</Pusat>
  }

  if (!peserta) {
    return (
      <>
        {versiKedaluwarsa && (
          <div className="mx-auto w-full max-w-sm px-4 pt-4">
            <BannerVersi />
          </div>
        )}
        <FormDaftar onDaftar={setPeserta} onGalat={setGalat} galat={galat} />
      </>
    )
  }

  const sudahCatatPutaranIni = transaksi.some((t) => t.putaran === putaran)
  // Form catatan baru boleh muncul setelah jawaban dibuka — kemunculannya sendiri
  // sudah menandakan jawaban peserta benar.
  const hasilTerbuka = fase === 'reveal' || fase === 'skor' || fase === 'selesai'
  const perluCatat =
    hasilTerbuka &&
    jawaban?.benar === true &&
    soal !== null &&
    soal.efek !== 'netral' &&
    !sudahCatatPutaranIni

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-4">
      {versiKedaluwarsa && <BannerVersi />}
      <BadgeStatus peserta={peserta} />
      <BadgeKoneksi status={koneksi} />

      {galat && (
        <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
          {galat}
        </div>
      )}

      {(!state || !state.berjalan) && state?.fase !== 'selesai' && (
        <KartuInfo emoji="⏳" judul="Menunggu fasilitator memulai game…">
          Siapkan HP-mu. Setiap soal akan muncul di layar ini — jawab secepat dan setepat mungkin.
        </KartuInfo>
      )}

      {state?.fase === 'selesai' && (
        <div className="space-y-4">
          <KartuInfo emoji="🏁" judul="Game selesai!">
            Saldo akhirmu <b className="text-amber-400">{rupiah(peserta.saldo)}</b>
          </KartuInfo>
          <PapanSkorPutaran
            putaran={putaran}
            jawaban={jawabanPutaran}
            semuaJawaban={semuaJawaban}
            peserta={semuaPeserta}
            sorotPesertaId={peserta.id}
            sembunyikanPodium
          />
        </div>
      )}

      {state?.berjalan && (state.fase === 'soal' || state.fase === 'reveal') && soal && (
        <FaseSoal
          soal={soal}
          putaran={state.putaran}
          sisa={sisaSoal}
          jawaban={jawaban}
          mengirim={mengirim}
          faseReveal={state.fase === 'reveal'}
          onJawab={kirimJawaban}
        />
      )}

      {state?.berjalan && state.fase === 'skor' && (
        <PapanSkorPutaran
          putaran={putaran}
          jawaban={jawabanPutaran}
          semuaJawaban={semuaJawaban}
          peserta={semuaPeserta}
          sorotPesertaId={peserta.id}
          maksBaris={10}
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

      <BukuBesarSaya
        peserta={peserta}
        jawaban={jawabanSaya}
        transaksi={transaksi}
        soal={bankSoal}
      />
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

function BadgeStatus({ peserta }: { peserta: TPeserta }) {
  const untung = peserta.saldo >= MODAL_AWAL
  return (
    <div className="mb-4 flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-800/80 px-4 py-3">
      <p className="min-w-0 truncate text-sm font-semibold text-slate-100">{peserta.nama}</p>
      <div className="shrink-0 text-right">
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

function FaseSoal({
  soal,
  putaran,
  sisa,
  jawaban,
  mengirim,
  faseReveal,
  onJawab,
}: {
  soal: Soal
  putaran: number
  sisa: number
  jawaban: JawabanPeserta | null
  mengirim: boolean
  faseReveal: boolean
  onJawab: (p: Pilihan[]) => void
}) {
  const efek = EFEK_META[soal.efek]
  /** Hasil hanya boleh terlihat setelah fasilitator menekan "Reveal Jawaban". */
  const terbuka = faseReveal
  const sudahJawab = jawaban !== null
  const habis = sisa === 0

  const jumlahBenar = soal.jawaban_benar.length
  const ganda = jumlahBenar > 1

  // Pilihan sementara sebelum dikirim — hanya dipakai pada soal berjawaban ganda.
  const [dipilih, setDipilih] = useState<Pilihan[]>([])
  useEffect(() => {
    setDipilih([])
  }, [soal.id])

  const alihkanPilihan = (label: Pilihan) =>
    setDipilih((d) => (d.includes(label) ? d.filter((x) => x !== label) : [...d, label]))

  return (
    <div className="animasi-muncul space-y-4">
      <div className="rounded-2xl border border-amber-400/50 bg-amber-500/15 px-4 py-3 text-center text-amber-300">
        <p className="text-[11px] font-medium uppercase tracking-widest opacity-90">
          Putaran {putaran}
        </p>
        <p className="text-base font-extrabold tracking-wide">🎯 JAWAB SECEPATNYA</p>
        <p className="mt-0.5 text-xs opacity-75">
          Benar bonus {rupiah(BONUS_BENAR)} · Salah atau telat denda {rupiah(DENDA)}
        </p>
      </div>

      {/* Kartu soal */}
      <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          {/* Jenis efek baru boleh terlihat setelah jawaban dibuka — sebelum itu
              badge ini membocorkan arah jawaban yang benar. */}
          {terbuka ? (
            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${efek.kelas}`}>
              {efek.emoji} {efek.label}
            </span>
          ) : (
            <span className="rounded-full border border-slate-600 bg-slate-700/40 px-2.5 py-1 text-[11px] font-semibold text-slate-400">
              ❓ Kasus keuangan
            </span>
          )}
          {/* Timer hanya relevan selama fase menjawab. Setelah dibuka, fase_mulai
              sudah tidak dipakai sehingga angkanya akan menyesatkan. */}
          {!sudahJawab && !habis && !terbuka && (
            <TimerRing sisa={sisa} total={DURASI_SOAL} ukuran={64} />
          )}
        </div>

        <p className="text-[15px] leading-relaxed text-slate-100">{soal.teks}</p>

        {jumlahBenar > 1 && !sudahJawab && !terbuka && (
          <p className="mt-3 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">
            ⚠️ Soal ini punya {jumlahBenar} jawaban benar — pilih semuanya, lalu tekan Kirim.
          </p>
        )}

        <div className="mt-4 space-y-2">
          {soal.opsi.map((teks, i) => {
            const label = LABEL_OPSI[i]
            const iniJawabanBenar = soal.jawaban_benar.includes(label)
            const iniPilihanSaya = sudahJawab
              ? (jawaban?.pilihan_ganda ?? []).includes(label)
              : dipilih.includes(label)

            let gaya = 'border-slate-600 bg-slate-900 hover:border-amber-400'
            if (terbuka) {
              // Fasilitator sudah membuka jawaban — tampilkan benar/salah.
              if (iniJawabanBenar) gaya = 'border-green-500 bg-green-500/15'
              else if (iniPilihanSaya) gaya = 'border-red-500 bg-red-500/15'
              else gaya = 'border-slate-700 bg-slate-900 opacity-50'
            } else if (sudahJawab) {
              // Sudah menjawab tapi belum dibuka — tandai pilihan sendiri saja,
              // tanpa memberi petunjuk benar atau salah.
              gaya = iniPilihanSaya
                ? 'border-amber-400 bg-amber-500/10'
                : 'border-slate-700 bg-slate-900 opacity-40'
            } else if (iniPilihanSaya) {
              gaya = 'border-amber-400 bg-amber-500/10'
            }

            return (
              <button
                key={label}
                onClick={() => (ganda ? alihkanPilihan(label) : onJawab([label]))}
                disabled={sudahJawab || mengirim || habis || terbuka}
                className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm text-slate-100 transition disabled:cursor-default ${gaya}`}
              >
                <span className="mt-px shrink-0 rounded-md bg-slate-700 px-2 py-0.5 text-xs font-bold">
                  {label}
                </span>
                <span className="flex-1">{teks}</span>
                {terbuka && iniJawabanBenar && <span>✅</span>}
                {terbuka && iniPilihanSaya && !iniJawabanBenar && <span>❌</span>}
                {!terbuka && iniPilihanSaya && <span className="text-amber-400">📌</span>}
              </button>
            )
          })}
        </div>

        {/* Soal berjawaban ganda perlu tombol kirim tersendiri — sekali sentuh
            tidak bisa dipakai karena peserta harus memilih beberapa opsi. */}
        {ganda && !sudahJawab && !terbuka && (
          <button
            onClick={() => onJawab(dipilih)}
            disabled={dipilih.length === 0 || mengirim || habis}
            className="mt-3 w-full rounded-xl bg-amber-500 py-3 font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98] disabled:opacity-40"
          >
            {dipilih.length === 0
              ? 'Pilih jawabanmu dulu'
              : `Kirim Jawaban (${dipilih.join(' & ')})`}
          </button>
        )}
      </div>

      {/* Hasil — hanya setelah fasilitator membuka jawaban */}
      {terbuka && jawaban && <HasilJawaban jawaban={jawaban} soal={soal} />}

      {!terbuka && sudahJawab && (
        <div className="rounded-2xl border border-slate-600 bg-slate-800/60 p-4 text-center">
          <p className="font-semibold text-slate-100">✅ Jawaban terkirim</p>
          <p className="mt-1 text-sm text-slate-400">
            Menunggu fasilitator membuka jawaban…
            {jawaban.waktu_jawab_ms !== null && (
              <>
                <br />
                <span className="text-xs">
                  Waktumu {(jawaban.waktu_jawab_ms / 1000).toFixed(1)} detik — penentu urutan bila
                  nanti ada yang seri.
                </span>
              </>
            )}
          </p>
        </div>
      )}

      {!sudahJawab && habis && (
        <p className="text-center text-sm text-slate-400">
          Waktu habis. Menunggu fasilitator membuka jawaban…
        </p>
      )}
    </div>
  )
}

function HasilJawaban({ jawaban, soal }: { jawaban: JawabanPeserta; soal: Soal }) {
  const benar = jawaban.benar
  const judul = benar
    ? '✅ Jawaban benar!'
    : jawaban.pilihan_ganda === null
      ? '⏰ Waktu habis!'
      : '❌ Jawaban salah'

  const gaya = benar
    ? 'border-green-500/40 bg-green-500/10'
    : 'border-red-500/40 bg-red-500/10'

  return (
    <div className={`rounded-2xl border p-4 text-center ${gaya}`}>
      <p className={`font-bold ${benar ? 'text-green-400' : 'text-red-400'}`}>{judul}</p>

      <p
        className={`mt-1 text-lg font-bold tabular-nums ${
          benar ? 'text-green-400' : 'text-red-400'
        }`}
      >
        {selisih(jawaban.delta_saldo)}
      </p>
      <p className="text-xs text-slate-400">
        {benar ? 'Bonus jawaban benar' : 'Denda jawaban salah'}
      </p>

      {soal.efek !== 'netral' && (
        <p className="mt-2 border-t border-slate-700 pt-2 text-xs text-slate-500">
          Nilai transaksi soal ini {rupiah(soal.nominal)} — hanya sebagai konteks, tidak
          mempengaruhi saldo.
        </p>
      )}
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

/**
 * Buku besar milik peserta sendiri — isi dan perhitungannya sama persis dengan
 * yang dilihat fasilitator, karena memakai komponen dan fungsi yang sama.
 * Dibuat lipat agar tidak memanjangkan layar saat sedang menjawab.
 */
function BukuBesarSaya({
  peserta,
  jawaban,
  transaksi,
  soal,
}: {
  peserta: TPeserta
  jawaban: JawabanPeserta[]
  transaksi: Transaksi[]
  soal: Soal[]
}) {
  const [terbuka, setTerbuka] = useState(false)
  const buku = useMemo(
    () => hitungBukuBesar(peserta, jawaban, transaksi, soal),
    [peserta, jawaban, transaksi, soal],
  )

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/40">
      <button
        onClick={() => setTerbuka((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-slate-800/60"
      >
        <span className="text-slate-500">{terbuka ? '▾' : '▸'}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">📒 Buku besarku</span>
          <span className="text-[11px] text-slate-400">
            {buku.baris.length} transaksi · {buku.jumlahBenar} benar · {buku.jumlahSalah} salah
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span
            className={`block text-sm font-bold tabular-nums ${
              peserta.saldo >= MODAL_AWAL ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {rupiah(peserta.saldo)}
          </span>
          <span className="block text-[10px] tabular-nums text-slate-400">
            {selisih(peserta.saldo - MODAL_AWAL)}
          </span>
        </span>
      </button>

      {terbuka && (
        <div className="border-t border-slate-700 px-4 py-3">
          <BukuBesar buku={buku} milikSaya />
        </div>
      )}
    </div>
  )
}
