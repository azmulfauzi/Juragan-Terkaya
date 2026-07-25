-- ============================================================================
--  MIGRASI 03 — Tema Soal
-- ============================================================================
--  Jalankan SEKALI di SQL Editor Supabase. Aman diulang.
--
--  Apa yang berubah:
--  1. Bank soal tidak lagi satu tumpukan. Soal dikelompokkan ke dalam TEMA
--     yang dibuat sendiri oleh fasilitator (misal "Literasi Keuangan UMKM",
--     "Pencatatan Kas Harian"). Satu sesi memakai satu tema.
--  2. Kolom `warna` dihapus. Fungsinya sebagai label pengelompokan sudah
--     digantikan tema, jadi mempertahankan keduanya hanya menambah langkah
--     saat membuat soal.
--  3. Seluruh soal yang sudah ada dipindahkan ke tema "Literasi Keuangan UMKM"
--     — tidak ada yang hilang.
--
--  ⚠️ Jalankan tepat sebelum versi baru di-deploy. Di antara keduanya, jangan
--     membuka menu Bank Soal: versi lama masih mencoba menulis kolom `warna`
--     yang sudah tidak ada.
-- ============================================================================

-- ─────────────────────────── TABEL TEMA ───────────────────────────

create table if not exists tema (
  id          bigserial   primary key,
  nama        text        not null,
  deskripsi   text        not null default '',
  created_at  timestamptz not null default now()
);

alter table soal add column if not exists tema_id bigint references tema(id) on delete cascade;

create index if not exists idx_soal_tema on soal (tema_id);


-- ──────────────── PINDAHKAN SOAL LAMA KE TEMA DEFAULT ────────────────

do $$
declare
  v_tema_id bigint;
begin
  if exists (select 1 from soal where tema_id is null) then
    select id into v_tema_id from tema where nama = 'Literasi Keuangan UMKM' limit 1;

    if v_tema_id is null then
      insert into tema (nama, deskripsi)
      values (
        'Literasi Keuangan UMKM',
        'Bank soal bawaan: penjualan tunai, piutang, hutang, prive, dan kebiasaan mencatat harian.'
      )
      returning id into v_tema_id;
    end if;

    update soal set tema_id = v_tema_id where tema_id is null;
  end if;
end $$;


-- ──────────────────────── HAPUS KOLOM WARNA ────────────────────────
-- Tema sudah mengambil alih fungsinya.

alter table soal drop column if exists warna;


-- ─────────────────── NOMOR SOAL DIBUAT OLEH DATABASE ───────────────────
-- Sebelumnya nomor soal ditentukan dari sisi aplikasi (ambil yang terbesar,
-- tambah satu). Dengan banyak tema dan banyak soal dibuat berdekatan, cara itu
-- rawan menghasilkan nomor kembar. Biarkan database yang menomori.

create sequence if not exists soal_id_seq owned by soal.id;
select setval('soal_id_seq', coalesce((select max(id) from soal), 0) + 1, false);
alter table soal alter column id set default nextval('soal_id_seq');


-- ─────────────────── TEMA YANG SEDANG DIMAINKAN ───────────────────
-- Disimpan di status game agar seluruh perangkat tahu soal diundi dari mana.
-- on delete set null: menghapus tema tidak boleh membuat game gagal dibaca.

alter table game_state
  add column if not exists tema_id bigint references tema(id) on delete set null;


-- ─────────────────────── ROW LEVEL SECURITY ───────────────────────

alter table tema enable row level security;

drop policy if exists akses_publik on tema;
create policy akses_publik on tema
  for all to anon, authenticated
  using (true) with check (true);
