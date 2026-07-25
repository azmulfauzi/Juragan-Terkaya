import { useCallback, useEffect, useState } from 'react'
import {
  ambilSemuaTema,
  ambilSoalTema,
  buatSoal,
  buatTema,
  hapusSoal,
  hapusTema,
  ubahAktifSemuaSoal,
  ubahAktifSoal,
  ubahSoal,
  ubahTema,
} from '../lib/api'
import { EFEK_META } from '../lib/config'
import { LABEL_OPSI, MAKS_OPSI, MIN_OPSI, gabungPilihan, rupiah } from '../lib/format'
import type { Efek, Pilihan, Soal, Tema } from '../lib/types'

/** Soal kosong untuk form tambah. */
function soalBaru(temaId: number): Omit<Soal, 'id'> {
  return {
    tema_id: temaId,
    aktif: true,
    teks: '',
    opsi: ['', '', ''],
    jawaban_benar: ['A'],
    nominal: 0,
    efek: 'netral',
    insight: '',
  }
}

/**
 * Menu Bank Soal: mengelola tema beserta isinya.
 *
 * Setiap perubahan langsung tersimpan ke database begitu tombol Simpan ditekan
 * — tidak ada lagi konsep "simpan semua" yang menahan perubahan di memori.
 * Lebih sedikit yang bisa hilang kalau halaman tertutup di tengah jalan.
 */
export default function BankSoal({ onBerubah }: { onBerubah?: () => void }) {
  const [tema, setTema] = useState<Tema[]>([])
  const [jumlahSoal, setJumlahSoal] = useState<Record<number, number>>({})
  const [temaAktif, setTemaAktif] = useState<Tema | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)

  const muatTema = useCallback(async () => {
    try {
      const daftar = await ambilSemuaTema()
      setTema(daftar)

      // Hitung isi tiap tema untuk ditampilkan di kartu.
      const hitung: Record<number, number> = {}
      await Promise.all(
        daftar.map(async (t) => {
          hitung[t.id] = (await ambilSoalTema(t.id)).length
        }),
      )
      setJumlahSoal(hitung)
      setGalat(null)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    muatTema()
  }, [muatTema])

  if (memuat) return <p className="p-8 text-center text-slate-400">Memuat bank soal…</p>

  if (temaAktif) {
    return (
      <IsiTema
        tema={temaAktif}
        onKembali={() => {
          setTemaAktif(null)
          muatTema()
          onBerubah?.()
        }}
      />
    )
  }

  return (
    <div>
      {galat && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {galat}
        </p>
      )}

      <FormTemaBaru
        onSimpan={async (nama, deskripsi) => {
          await buatTema(nama, deskripsi)
          await muatTema()
          onBerubah?.()
        }}
        onGalat={setGalat}
      />

      {tema.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-slate-400">
          Belum ada tema. Buat tema pertamamu di atas — misalnya “Literasi Keuangan UMKM”.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tema.map((t) => (
            <KartuTema
              key={t.id}
              tema={t}
              jumlah={jumlahSoal[t.id] ?? 0}
              onBuka={() => setTemaAktif(t)}
              onUbah={async (nama, deskripsi) => {
                await ubahTema(t.id, { nama, deskripsi })
                await muatTema()
                onBerubah?.()
              }}
              onHapus={async () => {
                await hapusTema(t.id)
                await muatTema()
                onBerubah?.()
              }}
              onGalat={setGalat}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ───────────────────────────── DAFTAR TEMA ─────────────────────────────

function FormTemaBaru({
  onSimpan,
  onGalat,
}: {
  onSimpan: (nama: string, deskripsi: string) => Promise<void>
  onGalat: (s: string | null) => void
}) {
  const [terbuka, setTerbuka] = useState(false)
  const [nama, setNama] = useState('')
  const [deskripsi, setDeskripsi] = useState('')
  const [proses, setProses] = useState(false)

  async function simpan() {
    if (nama.trim().length < 3) {
      onGalat('Nama tema minimal 3 huruf.')
      return
    }
    setProses(true)
    try {
      await onSimpan(nama, deskripsi)
      setNama('')
      setDeskripsi('')
      setTerbuka(false)
      onGalat(null)
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setProses(false)
    }
  }

  if (!terbuka) {
    return (
      <button
        onClick={() => setTerbuka(true)}
        className="mb-4 rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
      >
        ➕ Tema Baru
      </button>
    )
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
      <h3 className="mb-3 text-sm font-bold text-amber-300">Tema baru</h3>
      <input
        value={nama}
        onChange={(e) => setNama(e.target.value)}
        placeholder="Nama tema, misal: Pencatatan Kas Harian"
        maxLength={60}
        autoFocus
        className={kelasInput}
      />
      <input
        value={deskripsi}
        onChange={(e) => setDeskripsi(e.target.value)}
        placeholder="Keterangan singkat (opsional)"
        maxLength={120}
        className={`${kelasInput} mt-2`}
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setTerbuka(false)}
          className="rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          onClick={simpan}
          disabled={proses}
          className="ml-auto rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40"
        >
          {proses ? 'Menyimpan…' : 'Buat Tema'}
        </button>
      </div>
    </div>
  )
}

function KartuTema({
  tema,
  jumlah,
  onBuka,
  onUbah,
  onHapus,
  onGalat,
}: {
  tema: Tema
  jumlah: number
  onBuka: () => void
  onUbah: (nama: string, deskripsi: string) => Promise<void>
  onHapus: () => Promise<void>
  onGalat: (s: string) => void
}) {
  const [ubah, setUbah] = useState(false)
  const [nama, setNama] = useState(tema.nama)
  const [deskripsi, setDeskripsi] = useState(tema.deskripsi)

  async function jalankan(aksi: () => Promise<void>) {
    try {
      await aksi()
    } catch (e) {
      onGalat(e instanceof Error ? e.message : String(e))
    }
  }

  if (ubah) {
    return (
      <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
        <input value={nama} onChange={(e) => setNama(e.target.value)} className={kelasInput} />
        <input
          value={deskripsi}
          onChange={(e) => setDeskripsi(e.target.value)}
          placeholder="Keterangan singkat"
          className={`${kelasInput} mt-2`}
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setNama(tema.nama)
              setDeskripsi(tema.deskripsi)
              setUbah(false)
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
          >
            Batal
          </button>
          <button
            onClick={() =>
              jalankan(async () => {
                await onUbah(nama, deskripsi)
                setUbah(false)
              })
            }
            className="ml-auto rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-900"
          >
            Simpan
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition hover:border-amber-400">
      <button onClick={onBuka} className="flex-1 text-left">
        <h3 className="font-bold text-slate-100">{tema.nama}</h3>
        <p className="mt-0.5 text-xs text-amber-400">{jumlah} soal</p>
        {tema.deskripsi && (
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{tema.deskripsi}</p>
        )}
      </button>

      <div className="mt-3 flex gap-1 border-t border-slate-700 pt-2">
        <button
          onClick={onBuka}
          className="rounded-md px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-700"
        >
          📝 Kelola soal
        </button>
        <button
          onClick={() => setUbah(true)}
          title="Ubah nama tema"
          className="ml-auto rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
        >
          ✏️
        </button>
        <button
          onClick={() => {
            if (
              !confirm(
                `Hapus tema "${tema.nama}" beserta ${jumlah} soal di dalamnya?\n\nTindakan ini tidak bisa dibatalkan.`,
              )
            )
              return
            void jalankan(onHapus)
          }}
          title="Hapus tema beserta isinya"
          className="rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
        >
          🗑
        </button>
      </div>
    </div>
  )
}

// ────────────────────────────── ISI TEMA ──────────────────────────────

function IsiTema({ tema, onKembali }: { tema: Tema; onKembali: () => void }) {
  const [daftar, setDaftar] = useState<Soal[]>([])
  const [cari, setCari] = useState('')
  const [edit, setEdit] = useState<Soal | Omit<Soal, 'id'> | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [memuat, setMemuat] = useState(true)

  const muat = useCallback(async () => {
    try {
      setDaftar(await ambilSoalTema(tema.id))
      setGalat(null)
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemuat(false)
    }
  }, [tema.id])

  useEffect(() => {
    muat()
  }, [muat])

  const kunci = cari.trim().toLowerCase()
  const terlihat = kunci
    ? daftar.filter(
        (s) =>
          String(s.id) === kunci ||
          s.teks.toLowerCase().includes(kunci) ||
          s.insight.toLowerCase().includes(kunci) ||
          s.opsi.some((o) => o.toLowerCase().includes(kunci)),
      )
    : daftar

  const jumlahAktif = daftar.filter((s) => s.aktif).length

  if (edit) {
    return (
      <FormSoal
        awal={edit}
        namaTema={tema.nama}
        onBatal={() => setEdit(null)}
        onSimpan={async (data) => {
          if ('id' in edit) await ubahSoal(edit.id, data)
          else await buatSoal(data)
          setEdit(null)
          await muat()
        }}
      />
    )
  }

  return (
    <div>
      <button
        onClick={onKembali}
        className="mb-3 rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        ← Semua tema
      </button>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{tema.nama}</h2>
          <p className="text-xs text-slate-400">
            <b className="text-amber-400">{jumlahAktif}</b> dari {daftar.length} soal akan dimainkan
          </p>
        </div>

        {daftar.length > 0 && (
          <button
            onClick={async () => {
              try {
                await ubahAktifSemuaSoal(tema.id, jumlahAktif < daftar.length)
                await muat()
              } catch (e) {
                setGalat(e instanceof Error ? e.message : String(e))
              }
            }}
            className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
          >
            {jumlahAktif < daftar.length ? '☑ Centang semua' : '☐ Hapus semua centang'}
          </button>
        )}
      </div>

      {galat && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {galat}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        <input
          value={cari}
          onChange={(e) => setCari(e.target.value)}
          placeholder="Cari teks soal, opsi, insight, atau nomor…"
          className={`${kelasInput} min-w-[180px] flex-1`}
        />
        <button
          onClick={() => setEdit(soalBaru(tema.id))}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-400"
        >
          ➕ Tambah Soal
        </button>
      </div>

      {memuat ? (
        <p className="p-8 text-center text-slate-400">Memuat…</p>
      ) : terlihat.length === 0 ? (
        <p className="rounded-xl border border-slate-700 bg-slate-800/40 p-8 text-center text-sm text-slate-400">
          {daftar.length === 0
            ? 'Tema ini belum punya soal. Tambahkan soal pertama lewat tombol di atas.'
            : 'Tidak ada soal yang cocok dengan pencarian.'}
        </p>
      ) : (
        <div className="space-y-2">
          {terlihat.map((s) => (
            <div
              key={s.id}
              className={`flex items-start gap-2 rounded-xl border bg-slate-800/50 pr-2 transition hover:border-amber-400 ${
                s.aktif ? 'border-slate-700' : 'border-slate-800 opacity-50'
              }`}
            >
              {/* Centang menentukan soal ini ikut diundi ke peserta atau tidak. */}
              <label
                className="flex shrink-0 cursor-pointer items-center py-2.5 pl-3"
                title={s.aktif ? 'Soal ikut dimainkan' : 'Soal disimpan tapi tidak dimainkan'}
              >
                <input
                  type="checkbox"
                  checked={s.aktif}
                  onChange={async (e) => {
                    try {
                      await ubahAktifSoal(s.id, e.target.checked)
                      await muat()
                    } catch (err) {
                      setGalat(err instanceof Error ? err.message : String(err))
                    }
                  }}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>

              <button
                onClick={() => setEdit(s)}
                className="min-w-0 flex-1 py-2.5 pr-3 text-left"
              >
                <span className="block truncate text-sm text-slate-100">
                  {s.teks || <i className="text-slate-500">(belum diisi)</i>}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  #{s.id} · {EFEK_META[s.efek].emoji} {EFEK_META[s.efek].label}
                  {s.efek !== 'netral' && ` ${rupiah(s.nominal)}`} ·{' '}
                  {s.opsi.length} opsi · Jawaban {gabungPilihan(s.jawaban_benar)}
                  {!s.aktif && ' · tidak dimainkan'}
                </span>
              </button>

              <div className="flex shrink-0 gap-1 py-2.5">
                <button
                  onClick={async () => {
                    try {
                      const { id: _lama, ...tanpaId } = s
                      await buatSoal(tanpaId)
                      await muat()
                    } catch (e) {
                      setGalat(e instanceof Error ? e.message : String(e))
                    }
                  }}
                  title="Duplikat soal ini"
                  className="rounded-md px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-700 hover:text-slate-100"
                >
                  ⧉
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Hapus soal ini?\n\n"${s.teks.slice(0, 70)}"`)) return
                    try {
                      await hapusSoal(s.id)
                      await muat()
                    } catch (e) {
                      setGalat(e instanceof Error ? e.message : String(e))
                    }
                  }}
                  title="Hapus soal ini"
                  className="rounded-md px-2 py-1 text-sm text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ──────────────────────────── FORM SATU SOAL ────────────────────────────

function FormSoal({
  awal,
  namaTema,
  onSimpan,
  onBatal,
}: {
  awal: Soal | Omit<Soal, 'id'>
  namaTema: string
  onSimpan: (data: Omit<Soal, 'id'>) => Promise<void>
  onBatal: () => void
}) {
  const [draft, setDraft] = useState({ ...awal, opsi: [...awal.opsi] })
  const [proses, setProses] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const ubah = <K extends keyof Omit<Soal, 'id'>>(k: K, v: Omit<Soal, 'id'>[K]) =>
    setDraft((d) => ({ ...d, [k]: v }))

  const netral = draft.efek === 'netral'
  const baru = !('id' in awal)

  /** Menandai atau membatalkan satu opsi sebagai jawaban benar. */
  const alihkanBenar = (label: Pilihan) =>
    setDraft((d) => ({
      ...d,
      jawaban_benar: d.jawaban_benar.includes(label)
        ? d.jawaban_benar.filter((x) => x !== label)
        : [...d.jawaban_benar, label].sort(),
    }))

  /**
   * Menghapus satu opsi. Label opsi bergeser (C jadi B, dst), jadi penanda
   * jawaban benar ikut digeser supaya tidak menunjuk opsi yang keliru.
   */
  function hapusOpsi(indeks: number) {
    setDraft((d) => {
      const opsiBaru = d.opsi.filter((_, j) => j !== indeks)
      const benarBaru = d.jawaban_benar
        .map((label) => LABEL_OPSI.indexOf(label))
        .filter((i) => i !== indeks)
        .map((i) => (i > indeks ? i - 1 : i))
        .map((i) => LABEL_OPSI[i])
      return { ...d, opsi: opsiBaru, jawaban_benar: benarBaru }
    })
  }

  async function simpan() {
    if (!draft.teks.trim()) return setGalat('Pertanyaan belum diisi.')
    if (draft.opsi.some((o) => !o.trim())) return setGalat('Semua pilihan jawaban harus diisi.')
    if (draft.jawaban_benar.length === 0)
      return setGalat('Tandai minimal satu opsi sebagai jawaban benar.')

    setProses(true)
    setGalat(null)
    try {
      const { id: _abaikan, ...data } = draft as Soal
      await onSimpan({ ...data, nominal: netral ? 0 : draft.nominal })
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
      setProses(false)
    }
  }

  return (
    <div>
      <button
        onClick={onBatal}
        className="mb-3 rounded-lg px-2 py-1 text-sm text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
      >
        ← Kembali ke {namaTema}
      </button>

      <h2 className="mb-4 text-lg font-bold text-slate-100">
        {baru ? 'Soal baru' : `Ubah soal #${(awal as Soal).id}`}
      </h2>

      {galat && (
        <p className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {galat}
        </p>
      )}

      <div className="space-y-4 rounded-2xl border border-slate-700 bg-slate-800/40 p-5">
        <div>
          <Label>Pertanyaan / kasus</Label>
          <textarea
            value={draft.teks}
            onChange={(e) => ubah('teks', e.target.value)}
            rows={3}
            className={kelasInput}
          />
        </div>

        <div>
          <Label>Pilihan jawaban</Label>
          <div className="space-y-2">
            {draft.opsi.map((o, i) => {
              const label = LABEL_OPSI[i]
              const benar = draft.jawaban_benar.includes(label)
              return (
                <div key={i} className="flex items-center gap-2">
                  <button
                    onClick={() => alihkanBenar(label)}
                    title={benar ? 'Batalkan sebagai jawaban benar' : 'Jadikan jawaban benar'}
                    className={`w-9 shrink-0 rounded-md py-1.5 text-center text-xs font-bold transition ${
                      benar
                        ? 'bg-green-500 text-slate-900'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                  <input
                    value={o}
                    onChange={(e) =>
                      ubah('opsi', draft.opsi.map((x, j) => (j === i ? e.target.value : x)))
                    }
                    className={kelasInput}
                  />
                  {draft.opsi.length > MIN_OPSI && (
                    <button
                      onClick={() => hapusOpsi(i)}
                      title="Hapus opsi ini"
                      className="shrink-0 rounded-md px-2 py-1.5 text-sm text-slate-400 transition hover:bg-red-500/20 hover:text-red-400"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {draft.opsi.length < MAKS_OPSI && (
              <button
                onClick={() => ubah('opsi', [...draft.opsi, ''])}
                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-200 transition hover:bg-slate-800"
              >
                ➕ Tambah opsi ({LABEL_OPSI[draft.opsi.length]})
              </button>
            )}
            <p className="text-[11px] text-slate-500">
              Klik hurufnya untuk menandai jawaban benar. Boleh lebih dari satu — saat ini{' '}
              <b className="text-green-400">{gabungPilihan(draft.jawaban_benar)}</b>.
            </p>
          </div>

          {draft.jawaban_benar.length > 1 && (
            <p className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 p-2.5 text-[11px] leading-relaxed text-amber-300">
              Soal berjawaban ganda: peserta harus memilih <b>persis semuanya</b> — kurang satu atau
              lebih satu tetap dihitung salah. Mereka akan diberi tahu bahwa ada{' '}
              {draft.jawaban_benar.length} jawaban benar.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Efek transaksi</Label>
            <select
              value={draft.efek}
              onChange={(e) => ubah('efek', e.target.value as Efek)}
              className={kelasInput}
            >
              <option value="masuk">➕ Pemasukan</option>
              <option value="keluar">➖ Pengeluaran</option>
              <option value="netral">⬜ Diskusi (tanpa nilai)</option>
            </select>
          </div>

          <div>
            <Label>Nominal transaksi (Rp)</Label>
            <input
              type="number"
              min={0}
              step={50000}
              value={netral ? 0 : draft.nominal}
              disabled={netral}
              onChange={(e) => ubah('nominal', Number(e.target.value) || 0)}
              className={`${kelasInput} ${netral ? 'opacity-40' : ''}`}
            />
          </div>
        </div>

        <p className="rounded-lg border border-slate-700 bg-slate-900/60 p-2.5 text-[11px] leading-relaxed text-slate-400">
          ℹ️ Efek dan nominal <b>tidak mempengaruhi saldo</b> peserta. Keduanya hanya tampil setelah
          jawaban dibuka dan mengisi form catatan transaksi. Saldo hanya digerakkan bonus jawaban
          benar dan denda jawaban salah.
        </p>

        <div>
          <Label>Insight / pembahasan edukatif</Label>
          <textarea
            value={draft.insight}
            onChange={(e) => ubah('insight', e.target.value)}
            rows={4}
            className={kelasInput}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onBatal}
            className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            onClick={simpan}
            disabled={proses}
            className="ml-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40"
          >
            {proses ? 'Menyimpan…' : baru ? 'Tambahkan Soal' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>
    </div>
  )
}

const kelasInput =
  'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-slate-400">{children}</label>
}
