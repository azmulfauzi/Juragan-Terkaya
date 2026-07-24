import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * true jika kredensial Supabase sudah diisi dengan benar di file .env.
 * Dipakai untuk menampilkan panduan setup alih-alih layar error saat belum dikonfigurasi.
 */
export const supabaseSiap =
  Boolean(url) &&
  Boolean(anonKey) &&
  !url.includes('xxxxxxxx') &&
  url.startsWith('http')

export const supabase = createClient(
  supabaseSiap ? url : 'http://localhost',
  supabaseSiap ? anonKey : 'kunci-belum-diisi',
  {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 10 } },
  },
)
