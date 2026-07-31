# Arsitektur Keamanan Siber (Cybersecurity) dan Manajemen Trafik SIBIMKON

Dokumen ini menjelaskan secara teknis maupun konseptual mengenai lapisan keamanan (cybersecurity) dan manajemen lalu lintas data (traffic management) yang diterapkan pada aplikasi SIBIMKON (Smart Productive). Dokumen ini dapat digunakan sebagai referensi untuk audit IT, presentasi kepada klien, maupun panduan bagi tim pengembang.

---

## 🛡️ 1. Keamanan Siber (Cybersecurity)

Keamanan pada SIBIMKON dibangun menggunakan arsitektur **Multi-layered Security** (Keamanan Berlapis), yang memastikan pelindungan dari tiga sisi utama: Database, Server/API, dan Browser (Klien).

### A. Keamanan Level Database (Supabase RLS)
*   **Penggunaan di Software:** Seluruh data krusial (profil perusahaan, piagam proyek, kuesioner, hasil analisis AI) disimpan di dalam tabel PostgreSQL (via Supabase).
*   **Fungsi & Cara Kerja (Row Level Security - RLS):** 
    Tugas RLS adalah mengunci setiap baris data. Setiap pengguna yang login diberikan token JWT unik. Database secara otomatis mencocokkan token ini dengan ID pemilik data. 
    *Contoh praktis:* Jika pengguna dari Perusahaan A mencoba mengubah URL API untuk menarik data Perusahaan B, database akan menolaknya secara mutlak di level terdalam. Data 100% terisolasi per pengguna/perusahaan.
*   **Manajemen Kredensial:** Aplikasi **tidak** menyimpan password secara mentah. Autentikasi ditangani oleh modul Supabase Auth, yang melakukan *hashing* dengan algoritma Bcrypt yang aman dari pencurian data.

### B. Keamanan Level Server & API (Middleware)
*   **Penggunaan di Software:** Diimplementasikan melalui file `middleware.ts` pada kerangka kerja Next.js.
*   **Fungsi & Cara Kerja:** 
    Berfungsi sebagai satpam penjaga gerbang. Setiap kali pengguna mencoba mengakses halaman tertutup (seperti `/dashboard` atau `/projects`), server akan mengecek validitas token sesi pengguna sebelum mengirimkan halaman HTML ke browser. Jika pengguna belum login, middleware secara instan membuang (*redirect*) mereka ke halaman login. Hal ini mencegah *hacker* mem-bypass tampilan frontend.

### C. Keamanan Level Browser (OWASP HTTP Security Headers)
*   **Penggunaan di Software:** Dikonfigurasi ganda di dalam `next.config.ts` dan `middleware.ts`.
*   **Fungsi & Cara Kerja:** 
    Aplikasi memaksa browser klien untuk mematuhi aturan keamanan ketat, meliputi:
    *   **Strict-Transport-Security (HSTS):** Memastikan seluruh data dikirim melalui jalur terenkripsi (HTTPS). Menangkal serangan intersepsi (*Man-in-the-Middle*).
    *   **X-Frame-Options (SAMEORIGIN):** Mencegah serangan *Clickjacking*. Situs web penipu tidak akan bisa menanam (embed) halaman SIBIMKON di situs mereka untuk mencuri klik.
    *   **X-Content-Type-Options (nosniff):** Menangkal eksekusi file jahat yang disamarkan sebagai file gambar atau teks.

---

## 🚦 2. Manajemen Trafik & Stabilitas (Traffic & Scalability)

Sistem dirancang untuk *High Availability* (ketersediaan tinggi), menghindari *downtime*, dan melindungi sistem dari serangan penyalahgunaan (spam) atau *Distributed Denial of Service* (DDoS).

### A. Ketahanan Server (Vercel Serverless Architecture)
*   **Penggunaan di Software:** SIBIMKON di-hosting pada ekosistem Vercel menggunakan fitur Serverless / Edge Computing.
*   **Fungsi & Cara Kerja:** 
    Aplikasi tidak bergantung pada satu server tunggal yang dapat kehabisan kapasitas RAM atau CPU. Saat ada lonjakan pengunjung yang masuk secara bersamaan, Vercel secara otomatis menyalakan instance server baru dalam hitungan milidetik (*Auto-Scaling*). Dengan kata lain, kapasitas server menyesuaikan secara dinamis mengikuti kepadatan pengunjung. File statis (gambar, font, desain) juga disebar secara global melalui *Content Delivery Network* (CDN) sehingga waktu muat (loading) tetap instan dari wilayah mana pun.

### B. Manajemen Koneksi Database (Connection Pooling)
*   **Penggunaan di Software:** Di-handle oleh fitur Supabase PgBouncer.
*   **Fungsi & Cara Kerja:**
    PostgreSQL memiliki batasan berapa banyak orang yang dapat "terhubung" sekaligus. *PgBouncer* mengatur antrean ini di belakang layar. Alih-alih membuat koneksi baru dari nol setiap kali ada klik, sistem menggunakan ulang koneksi yang sedang menganggur. Ini mencegah database mengalami *crash* karena kelebihan koneksi saat banyak proyek dianalisis secara bersamaan.

### C. Pencegahan Spam dan Perlindungan Kuota AI (Rate Limiting)
*   **Penggunaan di Software:** Diimplementasikan di dalam `middleware.ts` menggunakan utilitas kustom `rate-limiter.ts` (Sliding Window Algorithm).
*   **Fungsi & Cara Kerja:**
    API AI (seperti analisis masalah dan *action plan*) membutuhkan biaya komputasi yang mahal dan memakan waktu (OpenAI/Groq). Tanpa pelindungan, bot bisa menembak API tersebut ribuan kali dalam satu detik.
    *   **Limitasi API AI:** Sistem membatasi maksimal **15 request per 60 detik** dari alamat IP yang sama. Jika lewat dari itu, sistem menolak request tersebut (HTTP 429) tanpa memproses ke provider AI.
    *   **Limitasi Login:** Dibatasi maksimal **10 percobaan login per 15 menit**. Ini secara efektif mematikan upaya serangan *brute-force* (menebak password menggunakan bot).
