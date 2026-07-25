-- ============================================================================
--  JURAGAN TERKAYA — Skema Database Supabase
-- ============================================================================
--  Cara pakai:
--  1. Buka project Supabase kamu -> menu "SQL Editor" -> "New query"
--  2. Copy-paste SELURUH isi file ini, lalu klik "Run"
--  3. Skrip ini aman dijalankan berulang kali (idempotent)
--
--  Bank soal TIDAK di-seed di sini — aplikasi akan membuat tema bawaan
--  "Literasi Keuangan UMKM" beserta 30 soalnya dari src/data/soal.ts saat
--  halaman fasilitator pertama kali dibuka pada database yang masih kosong.
-- ============================================================================

-- ─────────────────────────── TABEL ───────────────────────────

-- Tema soal: wadah pengelompokan yang dibuat fasilitator.
-- Satu sesi permainan memakai satu tema.
create table if not exists tema (
  id          bigserial   primary key,
  nama        text        not null,
  deskripsi   text        not null default '',
  created_at  timestamptz not null default now()
);

-- Status game global. Hanya ada 1 baris (id = 1).
create table if not exists game_state (
  id            int primary key,
  berjalan      boolean     not null default false,
  fase          text        not null default 'menunggu',
  putaran       int         not null default 0,
  tema_id       bigint      references tema(id) on delete set null,
  soal_id       int,
  fase_mulai    timestamptz,
  reveal        boolean     not null default false,
  show_insight  boolean     not null default false,
  riwayat_soal  jsonb       not null default '[]'::jsonb,
  constraint game_state_hanya_satu_baris check (id = 1)
);

create table if not exists peserta (
  id          uuid        primary key default gen_random_uuid(),
  nama        text        not null,
  saldo       bigint      not null default 10000000,
  created_at  timestamptz not null default now()
);

-- Jawaban peserta per putaran.
create table if not exists jawaban (
  id             bigserial primary key,
  peserta_id     uuid    not null references peserta(id) on delete cascade,
  putaran        int     not null,
  soal_id        int     not null,
  pilihan        text,                      -- null = tidak menjawab (timeout)
  benar          boolean not null default false,
  wajib          boolean not null default false,
  delta_saldo    bigint  not null default 0,
  -- Lama menjawab sejak soal tampil; dipakai menentukan pemenang tercepat.
  waktu_jawab_ms int,
  -- delta_saldo baru dibukukan saat fasilitator reveal, agar peserta tidak
  -- bisa menebak benar/salah dari saldonya yang berubah duluan.
  diterapkan     boolean not null default false,
  created_at     timestamptz not null default now(),
  unique (peserta_id, putaran)
);

-- Catatan transaksi yang diisi peserta.
create table if not exists transaksi (
  id          bigserial primary key,
  peserta_id  uuid   not null references peserta(id) on delete cascade,
  putaran     int    not null,
  keterangan  text   not null,
  jumlah      bigint not null,
  arah        text   not null,              -- 'masuk' | 'keluar'
  created_at  timestamptz not null default now()
);

-- Bank soal (dapat diedit penuh lewat menu Bank Soal di UI fasilitator).
-- Nomor soal dibuat database agar tidak kembar saat soal ditambahkan berdekatan.
create table if not exists soal (
  id        bigserial primary key,
  tema_id   bigint references tema(id) on delete cascade,
  teks      text   not null,
  opsi      jsonb  not null,
  jawaban   text   not null,
  nominal   bigint not null default 0,
  efek      text   not null,
  insight   text   not null default ''
);

-- Pastikan baris status game selalu ada.
insert into game_state (id) values (1) on conflict (id) do nothing;

-- Index untuk mempercepat query dashboard saat peserta banyak.
create index if not exists idx_soal_tema on soal (tema_id);
create index if not exists idx_jawaban_putaran       on jawaban (putaran);
create index if not exists idx_transaksi_putaran     on transaksi (putaran desc);


-- ─────────────────────── ROW LEVEL SECURITY ───────────────────────
-- Game ini tidak memakai sistem login (peserta cukup isi nama), sehingga semua
-- akses memakai anon key. Kebijakan di bawah sengaja permisif.
--
-- ⚠️  KONSEKUENSI: siapa pun yang punya link + anon key secara teknis bisa
--     menulis data. PIN fasilitator hanya melindungi TAMPILAN, bukan database.
--     Ini dapat diterima untuk game presentasi internal. Jangan simpan data
--     sensitif di project Supabase ini.

alter table tema          enable row level security;
alter table game_state    enable row level security;
alter table peserta       enable row level security;
alter table jawaban       enable row level security;
alter table transaksi     enable row level security;
alter table soal          enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['game_state','peserta','jawaban','transaksi','soal','tema']
  loop
    execute format('drop policy if exists akses_publik on %I', t);
    execute format(
      'create policy akses_publik on %I for all to anon, authenticated using (true) with check (true)', t
    );
  end loop;
end $$;


-- ───────────────────────── REALTIME ─────────────────────────
-- Daftarkan tabel ke publication realtime agar perubahan terkirim otomatis
-- ke semua perangkat tanpa perlu polling.

alter table game_state    replica identity full;
alter table peserta       replica identity full;
alter table jawaban       replica identity full;
alter table transaksi     replica identity full;

do $$
declare
  t text;
begin
  foreach t in array array['game_state','peserta','jawaban','transaksi']
  loop
    begin
      execute format('alter publication supabase_realtime add table %I', t);
    exception
      when duplicate_object then null;   -- sudah terdaftar, lewati
    end;
  end loop;
end $$;


-- ─────────────────── FUNGSI RESET (untuk sesi baru) ───────────────────
-- Menghapus seluruh data peserta & riwayat, tapi TIDAK menghapus bank soal.

create or replace function reset_game()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Klausa "where true" wajib ada: Supabase mengaktifkan pg_safeupdate yang
  -- menolak DELETE tanpa WHERE (error 21000) sebagai pengaman.
  delete from transaksi     where true;
  delete from jawaban       where true;
  delete from peserta       where true;

  -- tema_id sengaja TIDAK dikosongkan: fasilitator biasanya menjalankan
  -- beberapa kelompok berturut-turut dengan tema yang sama.
  update game_state
     set berjalan     = false,
         fase         = 'menunggu',
         putaran      = 0,
         soal_id      = null,
         fase_mulai   = null,
         reveal       = false,
         show_insight = false,
         riwayat_soal = '[]'::jsonb
   where id = 1;
end;
$$;

grant execute on function reset_game() to anon, authenticated;


-- ──────────────── PEMBUKUAN SALDO SAAT REVEAL ────────────────
-- Menerapkan seluruh perubahan saldo satu putaran sekaligus dalam satu query,
-- dipanggil fasilitator saat menekan "Reveal Jawaban".

create or replace function terapkan_saldo_putaran(p_putaran int)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update peserta p
     set saldo = p.saldo + j.delta_saldo
    from jawaban j
   where j.peserta_id = p.id
     and j.putaran    = p_putaran
     and j.diterapkan = false;

  update jawaban
     set diterapkan = true
   where putaran = p_putaran
     and diterapkan = false;
end;
$$;

grant execute on function terapkan_saldo_putaran(int) to anon, authenticated;


-- ─────────────────── WAKTU SERVER (sinkronisasi timer) ───────────────────
-- Jam di HP peserta bisa meleset beberapa menit. Semua klien mengukur selisih
-- jamnya terhadap fungsi ini sekali di awal, agar hitungan mundur 10 dan 30
-- detik berjalan serempak di semua perangkat.

create or replace function waktu_server()
returns timestamptz
language sql
stable
as $$ select now() $$;

grant execute on function waktu_server() to anon, authenticated;
