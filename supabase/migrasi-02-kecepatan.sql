-- ============================================================================
--  MIGRASI 02 — Kecepatan jawaban & penundaan pengungkapan hasil
-- ============================================================================
--  Jalankan SEKALI di SQL Editor Supabase. Aman diulang.
--
--  Kenapa perlu:
--  1. Peserta tidak boleh tahu benar/salah sebelum fasilitator reveal. Karena
--     saldo yang langsung berubah juga membocorkan jawaban, perubahan saldo
--     kini DITUNDA dan diterapkan serentak saat reveal lewat fungsi
--     terapkan_saldo_putaran().
--  2. Pemenang per putaran ditentukan dari jawaban benar TERCEPAT (ala Kahoot),
--     sehingga waktu menjawab tiap peserta perlu disimpan.
-- ============================================================================

-- Waktu menjawab dalam milidetik, dihitung sejak soal ditampilkan.
alter table jawaban add column if not exists waktu_jawab_ms int;

-- Penanda bahwa delta_saldo sudah dibukukan ke saldo peserta.
alter table jawaban add column if not exists diterapkan boolean not null default false;

-- Jawaban lama (sebelum migrasi) saldonya sudah terlanjur diterapkan.
update jawaban set diterapkan = true where diterapkan = false;


-- Menerapkan seluruh perubahan saldo satu putaran sekaligus.
-- Dipanggil fasilitator saat menekan "Reveal Jawaban" — satu query untuk
-- semua peserta, jadi tetap ringan walau pesertanya 50+.
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
