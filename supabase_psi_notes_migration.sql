-- =====================================================
-- MIGRATION: Tambah kolom catatan/keterangan pada PSI
-- Jalankan script ini di SQL Editor Supabase Anda
-- =====================================================

-- Tambah kolom catatan untuk setiap dimensi PSI
ALTER TABLE public.sustainability_assessments
  ADD COLUMN IF NOT EXISTS people_notes  TEXT,
  ADD COLUMN IF NOT EXISTS process_notes TEXT,
  ADD COLUMN IF NOT EXISTS system_notes  TEXT,
  ADD COLUMN IF NOT EXISTS result_notes  TEXT;

-- Tambah kolom psi_total jika belum ada (dibutuhkan oleh saveControlPsi)
ALTER TABLE public.sustainability_assessments
  ADD COLUMN IF NOT EXISTS psi_total NUMERIC;

-- Pastikan PostgREST me-reload schema
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- Verifikasi: cek struktur tabel setelah migrasi
-- =====================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sustainability_assessments'
ORDER BY ordinal_position;
