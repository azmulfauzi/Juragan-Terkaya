interface Props {
  sisa: number
  total: number
  ukuran?: number
  label?: string
}

/** Hitung mundur berbentuk cincin. Warna berubah hijau → kuning → merah. */
export default function TimerRing({ sisa, total, ukuran = 96, label }: Props) {
  const tebal = 8
  const radius = (ukuran - tebal) / 2
  const keliling = 2 * Math.PI * radius
  const rasio = total > 0 ? Math.max(0, Math.min(1, sisa / total)) : 0

  const warna = rasio > 0.5 ? '#22c55e' : rasio > 0.25 ? '#eab308' : '#ef4444'

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: ukuran, height: ukuran }}>
      <svg width={ukuran} height={ukuran} className="-rotate-90">
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth={tebal}
        />
        <circle
          cx={ukuran / 2}
          cy={ukuran / 2}
          r={radius}
          fill="none"
          stroke={warna}
          strokeWidth={tebal}
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - rasio)}
          style={{ transition: 'stroke-dashoffset 0.25s linear, stroke 0.3s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold tabular-nums" style={{ color: warna }}>
          {sisa}
        </span>
        {label && <span className="text-[10px] uppercase tracking-wide text-slate-400">{label}</span>}
      </div>
    </div>
  )
}
