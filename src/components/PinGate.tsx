import { useEffect, useState, type FormEvent } from 'react'
import { FASILITATOR_PIN } from '../lib/config'

interface Props {
  onBerhasil: () => void
}

export default function PinGate({ onBerhasil }: Props) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!error) return
    const timer = setTimeout(() => setError(false), 2500)
    return () => clearTimeout(timer)
  }, [error])

  function kirim(e: FormEvent) {
    e.preventDefault()
    if (pin === FASILITATOR_PIN) {
      onBerhasil()
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form
        onSubmit={kirim}
        className="w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-800/60 p-8 shadow-xl"
      >
        <div className="mb-6 text-center">
          <div className="mb-2 text-4xl">🔐</div>
          <h1 className="text-xl font-bold text-slate-100">Akses Fasilitator</h1>
          <p className="mt-1 text-sm text-slate-400">Masukkan PIN untuk mengendalikan game</p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          placeholder="••••"
          className="w-full rounded-xl border border-slate-600 bg-slate-900 px-4 py-3 text-center text-2xl tracking-[0.4em] text-slate-100 outline-none focus:border-amber-400"
        />

        {error && (
          <p className="animasi-muncul mt-3 text-center text-sm text-red-400">
            PIN salah, coba lagi.
          </p>
        )}

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-amber-500 py-3 font-semibold text-slate-900 transition hover:bg-amber-400 active:scale-[.98]"
        >
          Masuk
        </button>
      </form>
    </div>
  )
}
