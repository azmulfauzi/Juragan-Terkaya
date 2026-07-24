/** Ditampilkan saat kredensial Supabase belum diisi di file .env. */
export default function SetupBanner() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-xl rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6">
        <h1 className="mb-3 flex items-center gap-2 text-lg font-bold text-amber-300">
          ⚙️ Supabase belum dikonfigurasi
        </h1>
        <p className="mb-4 text-sm text-slate-300">
          Game ini butuh database Supabase agar semua peserta bisa terhubung. Langkahnya:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-slate-300">
          <li>
            Buat project gratis di{' '}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noreferrer"
              className="text-amber-300 underline"
            >
              supabase.com/dashboard
            </a>
          </li>
          <li>
            Buka <b>SQL Editor</b>, jalankan seluruh isi file{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5">supabase/schema.sql</code>
          </li>
          <li>
            Buka <b>Project Settings → Data API</b>, salin <b>Project URL</b> dan <b>anon key</b>
          </li>
          <li>
            Salin file <code className="rounded bg-slate-800 px-1.5 py-0.5">.env.example</code>{' '}
            menjadi <code className="rounded bg-slate-800 px-1.5 py-0.5">.env</code>, isi kedua nilai
            tersebut
          </li>
          <li>Jalankan ulang perintah <code className="rounded bg-slate-800 px-1.5 py-0.5">npm run dev</code></li>
        </ol>
      </div>
    </div>
  )
}
