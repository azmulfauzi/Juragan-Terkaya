import { useState } from 'react'
import { DAFTAR_WARNA, EFEK_META, WARNA_META } from '../lib/config'
import { LABEL_OPSI, rupiah } from '../lib/format'
import type { Efek, Pilihan, Soal, Warna } from '../lib/types'

interface Props {
  soalAwal: Soal[]
  onSimpanSemua: (daftar: Soal[]) => Promise<void>
  onTutup: () => void
}

export default function EditorSoal({ soalAwal, onSimpanSemua, onTutup }: Props) {
  const [daftar, setDaftar] = useState<Soal[]>(soalAwal)
  const [indeksEdit, setIndeksEdit] = useState<number | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  function simpanSatu(soal: Soal) {
    setDaftar((d) => d.map((s, i) => (i === indeksEdit ? soal : s)))
    setIndeksEdit(null)
  }

  function tambahSoal() {
    const idBaru = daftar.reduce((m, s) => Math.max(m, s.id), 0) + 1
    const baru: Soal = {
      id: idBaru,
      warna: 'merah',
      teks: '',
      opsi: ['', '', ''],
      jawaban: 'A',
      nominal: 0,
      efek: 'netral',
      insight: '',
    }
    setDaftar((d) => [...d, baru])
    setIndeksEdit(daftar.length)
  }

  async function simpanSemua() {
    const kosong = daftar.find((s) => !s.teks.trim() || s.opsi.some((o) => !o.trim()))
    if (kosong) {
      setGalat(`Soal #${kosong.id} masih ada bagian yang kosong. Lengkapi dulu sebelum menyimpan.`)
      return
    }
    setMenyimpan(true)
    setGalat(null)
    try {
      await onSimpanSemua(daftar)
      onTutup()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-4 w-full max-w-3xl rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 px-5 py-4">
          <h2 className="font-bold text-slate-100">
            ✏️ Editor Bank Soal
            <span className="ml-2 text-sm font-normal text-slate-400">({daftar.length} soal)</span>
          </h2>
          <button
            onClick={onTutup}
            className="rounded-lg px-3 py-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        {galat && (
          <p className="mx-5 mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
            {galat}
          </p>
        )}

        {indeksEdit === null ? (
          <>
            <div className="max-h-[60vh] space-y-2 overflow-y-auto p-5">
              {daftar.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setIndeksEdit(i)}
                  className="flex w-full items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-left transition hover:border-amber-400"
                >
                  <span className="mt-0.5 text-lg">{WARNA_META[s.warna].emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-100">
                      {s.teks || <i className="text-slate-500">(belum diisi)</i>}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-slate-400">
                      #{s.id} · {EFEK_META[s.efek].emoji} {EFEK_META[s.efek].label}
                      {s.efek !== 'netral' && ` ${rupiah(s.nominal)}`} · Jawaban {s.jawaban}
                    </span>
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-700 px-5 py-4">
              <button
                onClick={tambahSoal}
                className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
              >
                ➕ Tambah Soal
              </button>
              <button
                onClick={simpanSemua}
                disabled={menyimpan}
                className="ml-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-400 disabled:opacity-40"
              >
                {menyimpan ? 'Menyimpan…' : '💾 Simpan Semua ke Sistem'}
              </button>
            </div>
          </>
        ) : (
          <FormSoal
            soal={daftar[indeksEdit]}
            onSimpan={simpanSatu}
            onBatal={() => setIndeksEdit(null)}
          />
        )}
      </div>
    </div>
  )
}

function FormSoal({
  soal,
  onSimpan,
  onBatal,
}: {
  soal: Soal
  onSimpan: (s: Soal) => void
  onBatal: () => void
}) {
  const [draft, setDraft] = useState<Soal>({ ...soal, opsi: [...soal.opsi] })
  const ubah = <K extends keyof Soal>(k: K, v: Soal[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const netral = draft.efek === 'netral'

  return (
    <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Warna kartu</Label>
          <select
            value={draft.warna}
            onChange={(e) => ubah('warna', e.target.value as Warna)}
            className={inputKelas}
          >
            {DAFTAR_WARNA.map((w) => (
              <option key={w} value={w}>
                {WARNA_META[w].emoji} {WARNA_META[w].label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Efek terhadap saldo</Label>
          <select
            value={draft.efek}
            onChange={(e) => ubah('efek', e.target.value as Efek)}
            className={inputKelas}
          >
            <option value="masuk">➕ Menambah saldo</option>
            <option value="keluar">➖ Mengurangi saldo</option>
            <option value="netral">⬜ Tidak ada perubahan</option>
          </select>
        </div>
      </div>

      <div>
        <Label>Pertanyaan / kasus</Label>
        <textarea
          value={draft.teks}
          onChange={(e) => ubah('teks', e.target.value)}
          rows={3}
          className={inputKelas}
        />
      </div>

      <div>
        <Label>Pilihan jawaban</Label>
        <div className="space-y-2">
          {draft.opsi.map((o, i) => {
            const label = LABEL_OPSI[i]
            const benar = draft.jawaban === label
            return (
              <div key={i} className="flex items-center gap-2">
                <span
                  className={`w-8 shrink-0 rounded-md py-1.5 text-center text-xs font-bold ${
                    benar ? 'bg-green-500 text-slate-900' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {label}
                </span>
                <input
                  value={o}
                  onChange={(e) =>
                    ubah('opsi', draft.opsi.map((x, j) => (j === i ? e.target.value : x)))
                  }
                  className={inputKelas}
                />
                {benar && <span className="shrink-0 text-xs text-green-400">✓ benar</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>Jawaban benar</Label>
          <select
            value={draft.jawaban}
            onChange={(e) => ubah('jawaban', e.target.value as Pilihan)}
            className={inputKelas}
          >
            {LABEL_OPSI.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Nominal (Rp)</Label>
          <input
            type="number"
            min={0}
            step={50000}
            value={netral ? 0 : draft.nominal}
            disabled={netral}
            onChange={(e) => ubah('nominal', Number(e.target.value) || 0)}
            className={`${inputKelas} ${netral ? 'opacity-40' : ''}`}
          />
          {netral && <p className="mt-1 text-[11px] text-slate-500">Tidak dipakai untuk soal diskusi.</p>}
        </div>
      </div>

      <div>
        <Label>Insight / pembahasan edukatif</Label>
        <textarea
          value={draft.insight}
          onChange={(e) => ubah('insight', e.target.value)}
          rows={4}
          className={inputKelas}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={onBatal}
          className="rounded-xl border border-slate-600 px-4 py-2.5 text-sm text-slate-300 transition hover:bg-slate-800"
        >
          Batal
        </button>
        <button
          onClick={() => onSimpan({ ...draft, nominal: netral ? 0 : draft.nominal })}
          className="ml-auto rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-900 transition hover:bg-amber-400"
        >
          Simpan Perubahan Soal Ini
        </button>
      </div>
    </div>
  )
}

const inputKelas =
  'w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-400'

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-medium text-slate-400">{children}</label>
}
