import { Link } from 'react-router-dom'
import { POIN_MAKS } from '../lib/config'
import { formatPoin } from '../lib/skor'

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-3 text-6xl">💰</div>
        <h1 className="text-3xl font-extrabold text-amber-400">Games Literasi Keuangan</h1>
        <p className="mt-2 text-sm text-slate-400">
          Kuis interaktif untuk UMKM — jawab dengan tepat dan cepat. Tiap jawaban benar bernilai
          hingga {formatPoin(POIN_MAKS)} poin, makin cepat makin besar.
        </p>

        <div className="mt-8 space-y-3">
          <Link
            to="/peserta"
            className="block rounded-2xl bg-amber-500 px-6 py-4 text-lg font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98]"
          >
            🙋 Saya Peserta
          </Link>
          <Link
            to="/fasilitator"
            className="block rounded-2xl border border-slate-600 bg-slate-800 px-6 py-4 font-semibold text-slate-200 transition hover:bg-slate-700 active:scale-[.98]"
          >
            🎤 Saya Fasilitator
          </Link>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          Peserta cukup memasukkan nama. Halaman fasilitator dilindungi PIN.
        </p>
      </div>
    </div>
  )
}
