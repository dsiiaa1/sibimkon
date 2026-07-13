-- 1. Membuat Storage Bucket baru bernama "measure_files"
-- Bucket ini di-set private (public = false) agar hanya pengguna aplikasi yang bisa akses
INSERT INTO storage.buckets (id, name, public)
VALUES ('measure_files', 'measure_files', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Menyiapkan RLS (Row Level Security) Policies untuk Bucket
-- Izinkan user yang sudah login (authenticated) untuk MENGUNGGAH file
CREATE POLICY "Allow authenticated uploads to measure_files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK ( bucket_id = 'measure_files' );

-- Izinkan user yang sudah login (authenticated) untuk MELIHAT/MENGUNDUH file
CREATE POLICY "Allow authenticated to view measure_files"
ON storage.objects FOR SELECT TO authenticated
USING ( bucket_id = 'measure_files' );

-- Izinkan user yang sudah login (authenticated) untuk MENGHAPUS file mereka
CREATE POLICY "Allow authenticated to delete measure_files"
ON storage.objects FOR DELETE TO authenticated
USING ( bucket_id = 'measure_files' );

-- 3. Menambahkan kolom `file_url` ke tabel measure_data_requirements
-- Kolom ini berguna untuk menyimpan link (URL atau path) dari file yang di-upload ke bucket
ALTER TABLE public.measure_data_requirements 
ADD COLUMN IF NOT EXISTS file_url TEXT;
