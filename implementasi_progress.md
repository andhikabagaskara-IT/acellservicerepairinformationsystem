# DOKUMEN PROGRES IMPLEMENTASI
## ACELL SERVICE REPAIR MONITORING SYSTEM (ARIS)

**Versi Dokumen:** 1.5  
**Tanggal Update Terakhir:** 1 November 2026  
**Referensi Utama:** `implementasi_plan.md` & `Acell_Service_PRD.txt`

---

## 1. STATUS RINGKAS FASE

| Fase | Deskripsi | Status | Progress | Keterangan |
|---|---|---|---|---|
| **Fase 1** | Inisialisasi Struktur Proyek & Environment | 🟢 Selesai (100%) | 10/10 Task | Monorepo setup, shared types, Zod schemas, Vite+Vue 3, Tailwind, Router, Layouts & Views placeholder, Netlify config, build verifikasi 0 error. |
| **Fase 2** | Database Schema, RLS, & Storage (Supabase) | 🟢 Selesai (100%) | 4/4 Task | DDL 14 tabel relasional, triggers atomik (sequence tiket, audit status, auto-revocation token), RLS menyeluruh, private storage bucket, seed data. |
| **Fase 3** | Backend Development (Netlify Functions) | 🟢 Selesai (100%) | 7/7 Modul | 20 endpoint Netlify Functions, 6 shared utilities/middlewares, validasi Zod runtime, HMAC token session customer, type-check tervalidasi 0 error. |
| **Fase 4** | Frontend Development (Vue 3 + Pinia + Tailwind) | 🟢 Selesai (100%) | 10/10 Modul | Tema teknologi hitam-hijau neon modern, glassmorphism animations, Pinia stores, router guards, UI Admin lengkap, UI Teknisi workspace, UI Portal Pelanggan + Smart Polling, build verified 0 error. |
| **Fase 5** | Testing, Hardening, & Verifikasi Bisnis | ⚪ Siap Dimulai | 0% | Pengujian E2E & validasi keamanan data. |
| **Fase 6** | Deployment & Go-Live Terbatas | ⚪ Antrean | 0% | Setup Netlify & Supabase production. |

---

## 2. DETAIL PROGRES IMPLEMENTASI

### FASE 1: Inisialisasi Struktur Proyek & Environment
**Status: SELESAI (100%)**
- Setup monorepo `package.json`, `netlify.toml`, `.gitignore`, `.env.example`.
- Shared module `shared/types/index.ts` (7 enum, 14 database entity models, DTOs).
- Shared validators `shared/validators/index.ts` (Zod schemas, format E.164, regex tiket, `normalizePhoneToE164()`).
- Arsitektur frontend Vue 3 + TypeScript + TailwindCSS + Pinia + Vue Router di folder `frontend/`.
- 4 komponen layout (`AuthLayout`, `AdminLayout`, `TechnicianLayout`, `CustomerLayout`) dan 12 view placeholder.
- Seluruh dependencies terpasang dan build tervalidasi sukses 100%.

---

### FASE 2: Database Schema, RLS, dan Storage (Supabase)
**Status: SELESAI (100%)**
- **Migration SQL DDL (`supabase/migrations/001_initial_schema.sql`):**
  - 7 Custom enums: `user_role`, `device_type`, `ticket_status`, `assignment_type`, `visibility_type`, `quotation_status`, `actor_type`.
  - 14 Tabel Relasional: `profiles`, `customers`, `devices`, `repair_tickets`, `ticket_assignments`, `repair_diagnoses`, `repair_quotations`, `quotation_items`, `quotation_negotiations`, `ticket_status_histories`, `ticket_updates`, `ticket_attachments`, `customer_ticket_access_sessions`, `audit_logs`.
  - 18 Database indexes untuk query performa tinggi.
- **Triggers & Stored Procedures Atomik:**
  - `generate_ticket_number()` + `ticket_number_seq` (format `AC-YYYY-000001`).
  - `trg_set_ticket_number` (auto-generate nomor tiket saat insert).
  - `trg_auto_log_ticket_intake` (auto-record status awal `INTAKE`).
  - `trg_auto_log_ticket_status_change` (auto-log perubahan status ke `ticket_status_histories`).
  - `trg_auto_revoke_customer_sessions` (auto-revocation token customer saat status `COMPLETED`).
- **Row Level Security & Storage:**
  - RLS aktif pada seluruh 14 tabel dengan kebijakan granular.
  - Bucket privat `repair-attachments` (limit 3 MB, image types) + RLS storage objects.
- **Data Seed & Panduan:**
  - `supabase/seed.sql` berisi 3 mock accounts, 3 customers, 3 devices, 3 sample tickets, diagnosis, quotation, dan updates.
  - Panduan lengkap eksekusi di `supabase/README.md`.

---

### FASE 3: Backend Development (Netlify Functions)
**Status: SELESAI (100%)**

#### 1. Core Utilities & Middlewares (`netlify/functions/_shared/`)
- [x] **`supabaseClient.ts`**: Inisialisasi Supabase client dengan `SUPABASE_SERVICE_ROLE_KEY` (bypass RLS terpusat dengan pemeriksaan otorisasi ketat di layer handler).
- [x] **`authMiddleware.ts`**: Verifikasi Bearer token Supabase Auth untuk staf internal, pengecekan keaktifan akun (`is_active = true`), dan helper pembatasan peran `authenticateAdmin()`.
- [x] **`customerAuthMiddleware.ts`**: Verifikasi cookie `aris_customer_session`, hashing token HMAC-SHA256 dengan pepper, validasi expiry (maks 7 hari), validasi status belum `COMPLETED`, serta helper generator cookie HttpOnly/SameSite=Lax.
- [x] **`responseHelper.ts`**: Standarisasi respons format JSON (`success`, `error`, `paginated`, `methodNotAllowed`).
- [x] **`phoneHelper.ts`**: Normalisasi nomor telepon format lokal ke standar internasional E.164 (`08xx` / `628xx` -> `+628xx`).
- [x] **`auditLogger.ts`**: Pencatatan jejak audit sistem ke tabel `audit_logs` secara non-blocking.

#### 2. Endpoints Modul Auth & Data Master Staf
- [x] **`me.ts` (`GET /api/me`)**: Mengambil profil dan peran staf terautentikasi.
- [x] **`customers.ts`**:
  - `GET /api/customers`: Pencarian pelanggan berdasarkan nama atau nomor telepon (limit 20).
  - `POST /api/customers`: Pendaftaran profil pelanggan baru dengan validasi Zod dan normalisasi E.164 (mencegah duplikasi).
- [x] **`devices.ts`**:
  - `GET /api/devices`: Daftar perangkat berdasarkan `customer_id`.
  - `POST /api/devices`: Pendaftaran perangkat baru terhubung ke pelanggan.

#### 3. Endpoints Modul Tiket & Antrean
- [x] **`tickets.ts` (`POST /api/tickets`)**: Intake tiket baru. Menyimpan data keluhan, kondisi fisik, aksesoris, PIN opsional. Jika teknisi dipilih, tiket langsung ditugaskan (`INSPECTION`); jika tidak, masuk antrean `WAITING_ASSIGNMENT`.
- [x] **`admin-tickets.ts` (`GET /api/admin/tickets`)**: Daftar tiket lengkap dengan pagination, filter status, filter teknisi, serta join ke relasi pelanggan dan perangkat.
- [x] **`admin-assign.ts` (`POST /api/admin/tickets/:id/assign`)**: Admin menugaskan/memindahkan teknisi (`ADMIN_MANUAL` / `REASSIGNED`) dan memajukan tiket ke status `INSPECTION`.
- [x] **`technician-assignments.ts` (`GET /api/technician/assignments`)**: Daftar pekerjaan aktif yang sedang ditugaskan ke teknisi login.
- [x] **`technician-queue.ts` (`GET /api/technician/queue`)**: Daftar antrean tiket bebas tanpa teknisi (`WAITING_ASSIGNMENT`).
- [x] **`technician-self-assign.ts` (`POST /api/technician/tickets/:id/self-assign`)**: Aksi teknisi mengambil tiket mandiri dari antrean bebas -> status beralih ke `INSPECTION`.

#### 4. Endpoints Modul Alur Kerja (Diagnosis, Quotation, QC, & Handover)
- [x] **`ticket-diagnoses.ts`**:
  - `GET /api/tickets/:id/diagnoses`: Daftar hasil diagnosis teknis.
  - `POST /api/tickets/:id/diagnoses`: Penyimpanan diagnosis dan rekomendasi tindakan (visibilitas `PUBLIC` atau `INTERNAL`).
- [x] **`ticket-quotation.ts`**:
  - `GET /api/tickets/:id/quotation`: Mengambil rincian penawaran biaya aktif, item suku cadang, dan riwayat negosiasi.
  - `POST /api/tickets/:id/quotation`: Menerbitkan penawaran biaya baru (`PUBLISHED`), menghitung otomatis subtotal suku cadang dan total biaya, serta mengubah versi sebelumnya menjadi `SUPERSEDED`.
- [x] **`ticket-status.ts` (`POST /api/tickets/:id/status`)**: Transisi status berbasis FSM (Finite State Machine). Membatasi teknisi hanya untuk tiket tugasnya dan mencatat riwayat perubahan status.
- [x] **`ticket-updates.ts`**:
  - `GET /api/tickets/:id/updates`: Riwayat catatan progres perbaikan.
  - `POST /api/tickets/:id/updates`: Pembuatan catatan progres baru (`PUBLIC` atau `INTERNAL`).
- [x] **`ticket-attachments.ts`**:
  - `GET /api/tickets/:id/attachments`: Daftar foto perbaikan dengan signed download URL berumur 30 menit.
  - `POST /api/tickets/:id/attachments`: Validasi tipe MIME & ukuran (maks 3 MB) dan pembuatan signed upload URL ke Supabase Storage.
- [x] **`ticket-quality-check.ts` (`POST /api/tickets/:id/quality-check`)**: Konfirmasi QC pasca-perbaikan. Jika LULUS -> `READY_FOR_PICKUP`; jika GAGAL -> kembali ke `IN_REPAIR` dengan catatan perbaikan ulang.
- [x] **`ticket-handover.ts` (`POST /api/tickets/:id/handover`)**: Konfirmasi serah terima unit ke pelanggan -> mengubah status menjadi `COMPLETED`, mencatat nama penerima, dan otomatis mencabut seluruh sesi monitoring pelanggan via trigger database.

#### 5. Endpoints Modul Portal Pelanggan
- [x] **`customer-login.ts` (`POST /api/customer/access/login`)**: Validasi kombinasi nomor tiket + nomor WhatsApp. Menghasilkan token kriptografis acak, menyimpan hash di database, dan mengirimkan cookie HttpOnly/Secure/SameSite=Lax.
- [x] **`customer-session.ts` (`GET /api/customer/access/session`)**: Pengecekan keaktifan sesi pelanggan dan ringkasan status tiket.
- [x] **`customer-logout.ts` (`POST /api/customer/access/logout`)**: Pencabutan sesi di database (`revoked_at = NOW()`) dan pembersihan cookie browser.
- [x] **`customer-ticket.ts` (`GET /api/customer/ticket`)**: Mengambil detail perangkat, keluhan awal, kondisi penerimaan, dan estimasi waktu selesai.
- [x] **`customer-timeline.ts` (`GET /api/customer/ticket/timeline`)**: Jejak riwayat status resmi, catatan progres publik, diagnosis publik, dan foto publik dengan signed URL singkat (15 menit).
- [x] **`customer-quotation.ts` (`GET /api/customer/ticket/quotation`)**: Rincian biaya jasa dan suku cadang yang telah dipublikasikan beserta riwayat negosiasi.
- [x] **`customer-negotiation.ts` (`POST /api/customer/ticket/negotiation`)**: Pelanggan mengirimkan pesan masukan/tawar-menawar harga perbaikan.
- [x] **`customer-attachment-url.ts` (`GET /api/customer/ticket/attachments/:id/signed-url`)**: Menghasilkan signed download URL berumur 15 menit untuk foto berlabel `PUBLIC`.

#### 6. Routing & Verifikasi Kompilasi
- [x] **`netlify.toml`**: Pemetaan 20 rewrite rules RESTful dari path Clean URL (`/api/admin/tickets`, `/api/customer/ticket`, dll.) ke Netlify Functions.
- [x] **Type-check Kompilasi**: `node ../../frontend/node_modules/typescript/bin/tsc --noEmit` lolos **0 error**.
- [x] **Frontend Build**: `npm run build` tervalidasi lolos **0 error**.

---

### FASE 4: Frontend Development (Vue 3 + Pinia + TailwindCSS)
**Status: SELESAI (100%)**

#### 1. Desain Sistem Tema Teknologi (Black & Green + Glassmorphism)
- [x] **`tailwind.config.js`**:
  - Palet warna kustom: `aris` (black `#0a0a0a`, dark `#111111`, panel `#161616`, card `#1a1a1a`, surface `#222222`, border `#2a2a2a`) & `neon` (spektrum hijau neon `50`–`950`, primer `#00e05a` / `#00ff66`).
  - Font: `Inter` (sans) & `JetBrains Mono` (mono data/nomor tiket).
  - Background styling: Pola grid sirkuit (`grid-bg`) & radial glow neon (`bg-glow-radial`).
  - Efek bayangan neon & glass: `shadow-neon`, `shadow-neon-lg`, `shadow-neon-sm`, `shadow-glass`.
  - Animasi transisi: `pulse-neon`, `slide-up`, `slide-down`, `fade-in`, `scale-in`, `glow`.
- [x] **`src/assets/main.css`**:
  - Utilitas glassmorphism: `.glass`, `.glass-sm`, `.glass-strong`, `.glass-neon` dengan backdrop-filter blur 16–24px.
  - Komponen antarmuka tema gelap: `.card`, `.metric-card`, `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.btn-ghost`, `.input`, `.select`, `.textarea`, `.table-dark`, `.nav-item`, `.dot-pulse`, `.modal-overlay`, `.modal-content`.
  - Badges status tiket bergradasi dark & neon untuk 10 status FSM.

#### 2. Composables Terpusat (`src/composables/`)
- [x] **`useApi.ts`**: Wrapper HTTP client fleksibel untuk endpoint `/api/*`. Otomatis menyematkan header `Authorization: Bearer <token>` untuk akun staf internal, serta mendukung `withCredentials: true` (`customerGet`, `customerPost`) untuk cookie session pelanggan.
- [x] **`useSmartPolling.ts`**: Polling pintar otomatis berdasar visibilitas tab browser (`document.visibilityState`): 30 detik saat tab aktif, 120 detik saat di background, serta auto-stop ketika tiket telah berstatus terminal (`COMPLETED` / `CANCELLED` / `NOT_PROCEEDED`).
- [x] **`useFormatters.ts`**: Formatter mata uang Rupiah (`formatRupiah`), tanggal/waktu lokal Indonesia (`formatDate`, `formatDateTime`, `formatTimeAgo`), nomor telepon E.164 ke lokal (`formatPhoneDisplay`), serta pemetaan label & kelas badge untuk seluruh status tiket ARIS.

#### 3. State Management (Pinia Stores di `src/stores/`)
- [x] **`authStore.ts`**: Otentikasi staf via Supabase Auth (email/password), sinkronisasi profil dari endpoint `GET /api/me`, getter peran (`isAdmin`, `isTechnician`), serta persistensi status sesi staf.
- [x] **`adminStore.ts`**: Manajemen operasional admin mencakup pengambilan daftar tiket dengan filter & paginasi, statistik dashboard reaktif, penugasan teknisi, pendaftaran data master pelanggan dan perangkat, serta aksi approval QC & konfirmasi serah terima.
- [x] **`techStore.ts`**: Manajemen pekerjaan teknisi mencakup daftar penugasan aktif, antrean bebas (`queue`), aksi self-assign mandiri, form pengisian diagnosis teknis, quotation builder, dan transisi status tiket berbasis aturan FSM.
- [x] **`customerStore.ts`**: Manajemen sesi portal publik pelanggan via token cookie HttpOnly, pengambilan detail tiket, timeline gabungan (status + update publik), rincian estimasi biaya (quotation), dan pengiriman masukan negosiasi harga.

#### 4. Navigasi, Proteksi Route, & Layout Dinamis
- [x] **`src/router/index.ts`**:
  - Konfigurasi rute Admin (`/admin`, `/admin/tickets`, `/admin/tickets/new`, `/admin/tickets/:id`, `/admin/customers`), Teknisi (`/technician`, `/technician/tickets/:id`, `/technician/queue`), dan Pelanggan (`/customer`, `/customer/monitor`).
  - Navigation Guard `router.beforeEach`: Memverifikasi token login staf, pembatasan otorisasi peran (`ADMIN` vs `TECHNICIAN`), dan pengecekan sesi cookie pelanggan sebelum mengakses halaman monitoring.
- [x] **`src/App.vue`**: Switcher layout dinamis berbasis rute metadata (`AuthLayout`, `AdminLayout`, `TechnicianLayout`, `CustomerLayout`).
- [x] **`src/layouts/`**:
  - `AuthLayout.vue`: Background pola grid gelap dengan orbs neon bercahaya dan card tengah glassmorphism.
  - `AdminLayout.vue`: Sidebar desktop responsif (bisa ciut/melebar) + mobile drawer nav, logo neon, profil pengguna, dan tombol logout.
  - `TechnicianLayout.vue`: Header navigasi ringkas atas dengan tab pekerjaan & antrean, badge notifikasi, dan tombol logout cepat.
  - `CustomerLayout.vue`: Tampilan portal bersih berfokus pada perangkat mobile dengan indikator nomor tiket aktif.

#### 5. Modul Halaman Lengkap (`src/views/`)
- [x] **Auth (`views/auth/LoginPage.vue`)**: Form login staf dengan ikon menyala, input email/password dengan toggle visibilitas, penanganan error, dan tautan langsung ke portal cek servis pelanggan.
- [x] **Admin Module (`views/admin/`)**:
  - `DashboardPage.vue`: Kartu metrik beranimasi titik pulse (Menunggu Teknisi, Sedang Dikerjakan, Quality Check, Siap Diambil, Selesai) dan tabel tiket terbaru.
  - `TicketsPage.vue`: Filter pencarian real-time (nomor tiket, nama, perangkat), dropdown filter status, dan navigasi paginasi.
  - `NewTicketPage.vue`: Form wizard intake 3 langkah (Pilih/Buat Pelanggan -> Pilih/Tambah Perangkat -> Detail Keluhan, Kondisi Fisik, Aksesoris, PIN & Estimasi).
  - `TicketDetailPage.vue`: Informasi lengkap perangkat & pelanggan, tab switcher (Timeline, Diagnosis, Estimasi Biaya), modal penugasan teknisi, modal tambah catatan internal/publik, tombol aksi Lulus QC & Serah Terima.
  - `CustomersPage.vue`: Direktori pelanggan dengan pencarian cepat nama/telepon dan tanggal pendaftaran.
- [x] **Technician Module (`views/technician/`)**:
  - `DashboardPage.vue`: Tab "Pekerjaan Saya" dan "Antrean Bebas" dengan badge kuantitas pekerjaan aktif.
  - `QueuePage.vue`: Tampilan kartu tiket belum bertuan dengan tombol satu klik "Ambil Tiket Ini" (self-assign).
  - `TicketWorkspacePage.vue`: Workspace perbaikan multi-seksi (Info & Catatan Cepat, Form Diagnosis & Rekomendasi, Form Quotation Builder dengan kalkulasi otomatis subtotal suku cadang + biaya jasa, serta Dropdown Transisi Status FSM yang dibatasi secara aman).
- [x] **Customer Portal (`views/customer/`)**:
  - `LoginPage.vue`: Form akses mandiri pelanggan menggunakan nomor tiket (format `SRV-xxx` / `AC-xxx`) dan nomor WhatsApp dengan tombol contoh tiket demo 1-klik.
  - `MonitorPage.vue`: **Redesain Menyeluruh Bertema Emerald Dark & Modern Tech Mobile-First**:
    - **Header & Atmosfer Glow**: Top gradient glow (`#113a23` -> `#0e2718`), simulasi status bar dengan jam real-time dinamis, branding logo neon "Acell Service • ARIS", badge tiket dengan titik pulse animasi, dan greeting personal ("Halo [Nama Pelanggan], ini status perbaikan perangkat Anda").
    - **Quick Info Card**: Estimasi total biaya dengan ikon mata uang, estimasi waktu selesai, dan tombol aksi "+ Ajukan Negosiasi" dengan shadow glow neon.
    - **Hero Progress Card**: Status badges terkini, detail identitas perangkat & waktu penerimaan di toko, **Radial Circular Gauge** (meter progres persentase SVG dinamis & indikator Tahap X/7), serta **7-Stage Visual Pipeline Tracker** vertikal interaktif (Intake -> Menunggu Teknisi -> Diagnosa & Pemeriksaan -> Perbaikan Perangkat -> Quality Check -> Siap Diambil -> Selesai) lengkap dengan ikon centang selesai, tahap aktif beranimasi ping, dan tahap mendatang.
    - **Standout Technician Note Banner**: Desain bergradasi neon dengan badge teknisi tersertifikasi, avatar inisial teknisi, nama teknisi, serta kutipan catatan teknis/diagnosa paling mutakhir.
    - **Rincian & Komponen**: Kartu suku cadang OEM (LCD/baterai/komponen) & jasa kalibrasi lengkap dengan badge garansi dan harga.
    - **Interactive Negotiation Bottom Sheet Modal**: Modal bottom-sheet slide-up beranimasi halus, menampilkan ringkasan biaya saat ini, input tawaran harga numerik, pilihan radio alasan negosiasi (Budget terbatas, Ada part yang tidak perlu diganti, Lainnya), textarea catatan tambahan, serta tombol Batal dan Kirim Pengajuan dengan feedback status pengiriman reaktif.
    - **Action Bottom Bar**: Navigasi bawah melayang (floating bar) dengan tombol "Keluar" (logout & bersihkan sesi) dan tombol "Hubungi Teknisi" langsung ke WhatsApp/telepon dengan indikator live online.
    - **Smart Polling**: Terintegrasi otomatis memperbarui data tiap 30 detik (aktif) / 120 detik (background) dan auto-stop saat status tiket telah selesai.
- [x] **Not Found (`views/NotFoundPage.vue`)**: Halaman 404 berdesain senada dengan tombol navigasi kembali dan ke beranda.

#### 6. Fitur Demo / Mock Mode Lokal (Pra-Testing Database)
- [x] **`src/mock/mockData.ts`**: Menyediakan data seed lokal lengkap yang merefleksikan `supabase/seed.sql` (3 akun staf Admin & Teknisi, 3 profil pelanggan, 3 perangkat, 3 tiket beragam status, diagnosis, quotation, dan riwayat status).
- [x] **`src/mock/mockServer.ts`**: Simulator backend mock lokal terpadu yang memproses seluruh operasi API internal tanpa membutuhkan database live eksternal (Customer login/session/logout/timeline/negotiation, Admin tickets/customers/devices/assign/QC/handover, Teknisi assignments/queue/self-assign/diagnosis/quotation).
- [x] **Interseptor API & Auth**: Terintegrasi otomatis pada `useApi.ts` dan `authStore.ts` saat kredensial Supabase di `.env` masih berstatus template/placeholder.
- [x] **Tombol Akses Cepat Demo (1-Click Login)**:
  - Pada `/login`: Tombol instan login sebagai Admin (Rian), Teknisi (Budi), dan Teknisi (Andi).
  - Pada `/customer`: Tombol instan cek status tiket `AC-2026-000001` (Menunggu Teknisi), `AC-2026-000002` (Pemeriksaan), dan `AC-2026-000003` (Sedang Dikerjakan + Quotation).

#### 7. Verifikasi Kompilasi & Build
- [x] `src/vite-env.d.ts` ditambahkan untuk pengetikan tipe lingkungan Vite.
- [x] Kompilasi CSS PostCSS terverifikasi bersih tanpa peringatan.
- [x] `npm run build` (`vue-tsc -b && vite build`): **Lolos 100% tanpa error** (exit code 0).
- [x] Netlify functions TypeScript check: **Lolos 100% tanpa error** (exit code 0).

---

## 3. CHECKPOINT & LANGKAH KERJA FASE 5

Pekerjaan berikutnya adalah **FASE 5: Testing, Hardening, & Verifikasi Bisnis**:

0. **Koneksi Database Supabase Asli (Langkah Awal Fase 5):**
   - Panduan terperinci telah ditambahkan pada awal Fase 5 di file `implementasi_plan.md`:
     1. Pembuatan proyek baru di Supabase.
     2. Eksekusi `supabase/migrations/001_initial_schema.sql` dan `supabase/seed.sql` di SQL Editor.
     3. Pembaruan kredensial API (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) di file `.env`.
     4. Verifikasi live link antara backend Netlify Functions dan Supabase.

1. **Uji Alur Lengkap E2E (End-to-End):**
   - Skenario Intake Tiket oleh Admin -> Tiket masuk antrean bebas.
   - Skenario Self-Assign oleh Teknisi -> Status berubah ke `INSPECTION`.
   - Skenario Pengisian Diagnosis & Penerbitan Quotation oleh Teknisi.
   - Skenario Akses Portal Pelanggan -> Memeriksa riwayat & mengajukan negosiasi harga.
   - Skenario Transisi Status ke `IN_REPAIR` -> Selesai perbaikan -> `QUALITY_CHECK`.
   - Skenario Approval QC oleh Admin -> `READY_FOR_PICKUP`.
   - Skenario Konfirmasi Serah Terima oleh Admin -> `COMPLETED` -> Verifikasi otomatis pencabutan sesi cookie pelanggan.
2. **Validasi Batasan Keamanan & Otorisasi:**
   - Verifikasi isolasi data catatan internal dari endpoint customer.
   - Pengujian otorisasi perizinan role Admin vs Teknisi.
   - Pengujian pembatasan signed URL unduh lampiran foto Supabase Storage.
