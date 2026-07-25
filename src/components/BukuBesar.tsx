import { MODAL_AWAL } from '../lib/config'
import { rupiah, selisih } from '../lib/format'
import type { BukuBesar as TBukuBesar } from '../lib/bukuBesar'

/**
 * Isi buku besar satu peserta. Dipakai bersama oleh dashboard fasilitator
 * (di dalam kartu lipat) dan halaman peserta, supaya angka yang dilihat
 * keduanya tidak mungkin berbeda.
 */
export default function BukuBesar({
  buku,
  milikSaya,
}: {
  buku: TBukuBesar
  /** Mengubah kalimat kosong jadi sudut pandang orang pertama. */
  milikSaya?: boolean
}) {
  return (
    <div className="text-sm">
      <BarisBuku label="Saldo awal" nilai={MODAL_AWAL} netral />

      {buku.baris.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">
          {milikSaya ? 'Kamu belum menjawab satu soal pun.' : 'Belum ada jawaban yang masuk.'}
        </p>
      ) : (
        <div className="my-2 space-y-2 border-y border-slate-700 py-2">
          {buku.baris.map((r) => (
            <div key={r.jawaban.id}>
              <p className="text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Transaksi {r.urut}</span> · Putaran{' '}
                {r.jawaban.putaran} · Soal #{r.jawaban.soal_id} ·{' '}
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
                    r.perubahan > 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {selisih(r.perubahan)}
                </span>
              </div>
              {r.soal && r.soal.efek !== 'netral' && (
                <p className="text-[11px] text-slate-500">
                  Nilai transaksi {rupiah(r.soal.nominal)} — tidak mempengaruhi saldo
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <BarisBuku label={`Bonus jawaban benar (${buku.jumlahBenar}×)`} nilai={buku.totalBonus} />
      <BarisBuku label={`Denda jawaban salah (${buku.jumlahSalah}×)`} nilai={-buku.totalDenda} />

      <div className="mt-2 border-t border-slate-600 pt-2">
        <BarisBuku label="Saldo akhir" nilai={buku.saldoAkhir} netral tebal />
      </div>

      {buku.selisihHitung !== 0 && (
        <p className="mt-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] leading-relaxed text-amber-300">
          ⚠️ Saldo tersimpan berbeda {selisih(buku.selisihHitung)} dari hasil hitung ulang.
          {milikSaya
            ? ' Coba muat ulang halaman; kalau tetap berbeda, laporkan ke fasilitator.'
            : ' Biasanya karena data dibuat dengan aturan skor lama, atau ditulis oleh halaman peserta versi kedaluwarsa. Lakukan Reset sebelum sesi baru.'}
        </p>
      )}
    </div>
  )
}

export function BarisBuku({
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
