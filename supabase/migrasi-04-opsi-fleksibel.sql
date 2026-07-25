-- ============================================================================
--  MIGRASI 04 — Opsi fleksibel, jawaban ganda, dan soal aktif/nonaktif
-- ============================================================================
--  Jalankan SEKALI di SQL Editor Supabase. Aman diulang.
--
--  Apa yang berubah:
--  1. Jumlah pilihan jawaban tidak lagi terkunci di 3. Satu soal boleh punya
--     2 sampai 6 opsi (A–F).
--  2. Jawaban benar bisa lebih dari satu, misal "A & C". Karena itu kolom
--     `jawaban` (satu huruf) diganti `jawaban_benar` (daftar huruf).
--  3. Pilihan peserta ikut jadi daftar, karena satu peserta bisa memilih
--     beberapa opsi sekaligus pada soal berjawaban ganda.
--  4. Soal bisa dinonaktifkan tanpa dihapus — fasilitator mencentang soal mana
--     saja yang ikut diundi pada sesi berjalan.
--
--  ⚠️ Jalankan tepat sebelum versi baru di-deploy. Versi lama masih membaca
--     kolom `jawaban` dan `pilihan` yang dihapus di sini.
-- ============================================================================

-- ───────────── 1. JAWABAN BENAR JADI DAFTAR ─────────────

alter table soal add column if not exists jawaban_benar jsonb;

do $$
begin
  -- Hanya dijalankan bila kolom lama masih ada (migrasi belum pernah jalan).
  if exists (
    select 1 from information_schema.columns
    where table_name = 'soal' and column_name = 'jawaban'
  ) then
    update soal
       set jawaban_benar = jsonb_build_array(jawaban)
     where jawaban_benar is null;

    alter table soal drop column jawaban;
  end if;
end $$;

-- Jaring pengaman bila ada baris yang entah bagaimana masih kosong.
update soal set jawaban_benar = '["A"]'::jsonb where jawaban_benar is null;

alter table soal alter column jawaban_benar set default '["A"]'::jsonb;
alter table soal alter column jawaban_benar set not null;


-- ───────────── 2. SOAL BISA DINONAKTIFKAN ─────────────
-- Soal nonaktif tetap tersimpan tapi tidak ikut diundi ke peserta.

alter table soal add column if not exists aktif boolean not null default true;


-- ───────────── 3. PILIHAN PESERTA JADI DAFTAR ─────────────
-- null  = tidak menjawab sampai waktu habis
-- []    = mengirim tanpa memilih apa pun (tidak seharusnya terjadi, tapi aman)
-- ["A"] = memilih satu opsi

alter table jawaban add column if not exists pilihan_ganda jsonb;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'jawaban' and column_name = 'pilihan'
  ) then
    update jawaban
       set pilihan_ganda = jsonb_build_array(pilihan)
     where pilihan_ganda is null
       and pilihan is not null;

    alter table jawaban drop column pilihan;
  end if;
end $$;
