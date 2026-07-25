/**
 * Peringatan bahwa halaman ini menjalankan versi lama.
 *
 * Sengaja mencolok dan lengket di atas: klien yang kedaluwarsa pernah membuka
 * kunci jawaban lebih awal dan menghitung saldo dengan aturan lama, sehingga
 * datanya bentrok dengan sisa peserta.
 */
export default function BannerVersi() {
  return (
    <div className="sticky top-0 z-50 mb-3 rounded-xl border border-amber-400 bg-amber-500/20 p-3 shadow-lg backdrop-blur">
      <p className="text-sm font-bold text-amber-200">🔄 Versi baru tersedia</p>
      <p className="mt-0.5 text-xs leading-relaxed text-amber-100/80">
        Halaman ini masih menjalankan versi lama. Muat ulang agar skor dan tampilan jawabanmu
        mengikuti aturan terbaru.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 w-full rounded-lg bg-amber-500 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-400 active:scale-[.98]"
      >
        Muat Ulang Sekarang
      </button>
    </div>
  )
}
