import { useEffect, useRef, useState } from 'react'
import { DAFTAR_WARNA, WARNA_META } from '../lib/config'
import type { Warna } from '../lib/types'

interface Props {
  /** Warna hasil spin. Roda akan berhenti tepat di segmen ini. */
  hasil: Warna | null
  /** Naikkan angka ini untuk memicu animasi putaran baru. */
  pemicu: number
  ukuran?: number
  onSelesai?: () => void
}

const DURASI_PUTAR_MS = 3500

/** Membuat path SVG berbentuk potongan pie. */
function potonganPie(cx: number, cy: number, r: number, mulaiDeg: number, akhirDeg: number): string {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(mulaiDeg))
  const y1 = cy + r * Math.sin(rad(mulaiDeg))
  const x2 = cx + r * Math.cos(rad(akhirDeg))
  const y2 = cy + r * Math.sin(rad(akhirDeg))
  const busurBesar = akhirDeg - mulaiDeg > 180 ? 1 : 0
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${busurBesar} 1 ${x2} ${y2} Z`
}

export default function SpinWheel({ hasil, pemicu, ukuran = 280, onSelesai }: Props) {
  const [rotasi, setRotasi] = useState(0)
  const [berputar, setBerputar] = useState(false)
  const pemicuSebelumnya = useRef(pemicu)

  useEffect(() => {
    if (pemicu === pemicuSebelumnya.current) return
    pemicuSebelumnya.current = pemicu
    if (!hasil) return

    const indeks = DAFTAR_WARNA.indexOf(hasil)
    const sudutSegmen = 360 / DAFTAR_WARNA.length
    // Sudut rotasi agar tengah segmen berhenti tepat di penunjuk (atas).
    const targetDasar = 360 - (indeks * sudutSegmen + sudutSegmen / 2)
    const sisaKeTarget = ((targetDasar - (rotasi % 360)) + 360) % 360

    setBerputar(true)
    setRotasi(rotasi + 5 * 360 + sisaKeTarget)

    const timer = setTimeout(() => {
      setBerputar(false)
      onSelesai?.()
    }, DURASI_PUTAR_MS)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pemicu, hasil])

  const cx = ukuran / 2
  const cy = ukuran / 2
  const r = ukuran / 2 - 6
  const sudutSegmen = 360 / DAFTAR_WARNA.length

  return (
    <div className="relative inline-block" style={{ width: ukuran, height: ukuran + 16 }}>
      {/* Penunjuk di atas roda */}
      <div
        className="absolute left-1/2 top-0 z-10 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '12px solid transparent',
          borderRight: '12px solid transparent',
          borderTop: '20px solid #f8fafc',
          filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.5))',
        }}
      />

      <svg
        width={ukuran}
        height={ukuran}
        style={{
          marginTop: 16,
          transform: `rotate(${rotasi}deg)`,
          transition: berputar ? `transform ${DURASI_PUTAR_MS}ms cubic-bezier(.17,.67,.2,1)` : 'none',
        }}
      >
        {DAFTAR_WARNA.map((warna, i) => {
          const mulai = i * sudutSegmen
          const akhir = mulai + sudutSegmen
          const tengah = ((mulai + akhir) / 2 - 90) * (Math.PI / 180)
          return (
            <g key={warna}>
              <path
                d={potonganPie(cx, cy, r, mulai, akhir)}
                fill={WARNA_META[warna].hex}
                stroke="#0f172a"
                strokeWidth={3}
              />
              <text
                x={cx + r * 0.62 * Math.cos(tengah)}
                y={cy + r * 0.62 * Math.sin(tengah)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={ukuran * 0.1}
              >
                {WARNA_META[warna].emoji}
              </text>
            </g>
          )
        })}
        <circle cx={cx} cy={cy} r={ukuran * 0.09} fill="#0f172a" stroke="#f8fafc" strokeWidth={3} />
      </svg>
    </div>
  )
}
