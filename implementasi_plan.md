# RENCANA IMPLEMENTASI RUNTUT
## ACELL SERVICE REPAIR MONITORING SYSTEM (ARIS)
**Versi Dokumen:** 1.0  
**Tanggal:** 1 November 2026  
**Referensi:** `Acell_Service_PRD.txt` (v1.0 Confirmed) & `Acell_Service_Flowchart.mmd`  

---

## 1. RINGKASAN ARSITEKTUR & PRINSIP PENGEMBANGAN

Sistem dikembangkan menggunakan arsitektur **Serverless Full-Stack**:
- **Database & Storage:** Supabase PostgreSQL (Free Tier) + Supabase Private Storage Bucket.
- **Backend:** Netlify Functions (TypeScript) sebagai REST API gateway terpusat yang menjalankan business logic, otorisasi, session token management, dan RLS/service role wrapper.
- **Frontend:** Vue.js 3 (Composition API) + Vite + TypeScript + Pinia + TailwindCSS.
- **Deployment:** Netlify Continuous Deployment terhubung ke repositori GitHub.

### Prinsip Eksekusi Runtut:
Pengerjaan dilakukan secara bertahap dan berurutan dari **Database Schema -> Backend Functions -> Frontend UI & Integration -> Testing & Hardening**. Setiap fase memiliki kriteria pengujian (checkpoint) sebelum melangkah ke fase berikutnya.

```
[FASE 1: Setup Proyek] 
        ↓
[FASE 2: Database & Storage (Supabase)]
        ↓
[FASE 3: Backend API (Netlify Functions)]
        ↓
[FASE 4: Frontend (Vue.js 3 + Pinia + Tailwind)]
        ↓
[FASE 5: Pengujian E2E & Validasi Bisnis]
        ↓
[FASE 6: Deployment & Handover]
```

---

## 2. BREAKDOWN TAHAPAN IMPLEMENTASI

### FASE 1: INISIALISASI STRUKTUR PROYEK & ENVIRONMENT
**Target:** Lingkungan proyek lokal siap dibangun dengan konfigurasi TypeScript, Vite, Netlify, dan Tailwind yang konsisten.

1. **Inisialisasi Monorepo Sederhana:**
   - Setup project root dengan `package.json`.
   - Setup frontend: `npm create vite@latest . -- --template vue-ts` (atau struktur terpadu).
   - Konfigurasi TailwindCSS + PostCSS + Lucide Icons (untuk ikon UI modern).
   - Konfigurasi Netlify CLI (`netlify.toml`) untuk build frontend dan routing Functions.
2. **Setup Direktori Bersama (`shared/`):**
   - Buat modul tipe data TypeScript (`shared/types/`): ENUM status, interface tabel database, request/response DTOs.
   - Buat skema validasi Zod (`shared/validators/`): nomor telepon E.164, nomor tiket, payload intake, payload diagnosis, payload quotation, payload negosiasi.
3. **Environment Setup:**
   - `.env.example` untuk frontend (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL`).
   - `.env` lokal untuk Netlify Functions (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CUSTOMER_SESSION_PEPPER`).
   - Verifikasi `.gitignore` agar `.env` dan credential tidak pernah ter-commit.

---

### FASE 2: DATABASE SCHEMA, RLS, DAN STORAGE (SUPABASE)
**Target:** Seluruh tabel, relasi, constraint, trigger atomik, dan private storage bucket siap digunakan.

1. **Migration SQL DDL (`supabase/migrations/`):**
   - `profiles`: `id (UUID FK auth.users)`, `full_name`, `role (ADMIN / TECHNICIAN)`, `phone_e164`, `is_active`, `created_at`, `updated_at`.
   - `customers`: `id (UUID)`, `name`, `phone_e164 (UNIQUE)`, `email`, `notes`, `created_at`, `updated_at`.
   - `devices`: `id (UUID)`, `customer_id (FK)`, `device_type (SMARTPHONE / LAPTOP / OTHER)`, `brand`, `model`, `serial_or_imei`, `color`, `created_at`, `updated_at`.
   - `repair_tickets`:
     - `id (UUID)`, `ticket_number (UNIQUE, misal AC-2026-000001)`.
     - `customer_id (FK)`, `device_id (FK)`, `created_by (FK profiles)`, `assigned_technician_id (FK profiles, nullable)`.
     - `status (ENUM 10 status)`, `customer_complaint`, `intake_condition`, `accessories_received`, `device_pin_or_passcode (nullable)`.
     - `estimated_completion_at`, `received_at`, `completed_at`, `created_at`, `updated_at`.
   - `ticket_assignments`:
     - `id`, `ticket_id`, `technician_id`, `assigned_by (nullable)`, `assignment_type (ADMIN_MANUAL / SELF_ASSIGNED / REASSIGNED)`, `assigned_at`.
   - `repair_diagnoses`:
     - `id`, `ticket_id`, `technician_id`, `diagnosis`, `recommended_action`, `visibility (PUBLIC / INTERNAL)`, `created_at`, `updated_at`.
   - `repair_quotations`:
     - `id`, `ticket_id`, `version`, `labor_cost`, `parts_cost`, `total_cost`, `status (DRAFT / PUBLISHED / SUPERSEDED)`, `created_by`, `created_at`.
   - `quotation_items`:
     - `id`, `quotation_id (FK)`, `description`, `quantity`, `unit_price`, `line_total`.
   - `quotation_negotiations`:
     - `id`, `quotation_id (FK)`, `ticket_id (FK)`, `customer_session_id (FK)`, `message`, `created_at`.
   - `ticket_status_histories`:
     - `id`, `ticket_id (FK)`, `old_status`, `new_status`, `changed_by_type (ADMIN / TECHNICIAN / SYSTEM)`, `changed_by_id`, `actor_name_snapshot`, `reason_or_note`, `created_at`.
   - `ticket_updates`:
     - `id`, `ticket_id`, `author_id`, `author_name_snapshot`, `message`, `visibility (PUBLIC / INTERNAL)`, `created_at`.
   - `ticket_attachments`:
     - `id`, `ticket_id`, `uploader_id`, `storage_bucket`, `object_path`, `original_file_name`, `mime_type`, `file_size`, `visibility (PUBLIC / INTERNAL)`, `created_at`.
   - `customer_ticket_access_sessions`:
     - `id`, `ticket_id (FK)`, `token_hash (UNIQUE)`, `created_at`, `last_seen_at`, `expires_at`, `revoked_at`.
   - `audit_logs`:
     - `id`, `actor_type`, `actor_id`, `action`, `entity_type`, `entity_id`, `metadata (JSONB)`, `created_at`.

2. **Database Functions & Triggers:**
   - **Ticket Number Generator Sequence:** Fungsi otomatis `generate_ticket_number()` berbasis tahun dan nomor urut sequential (e.g. `AC-2026-000001`).
   - **Status History Auto-Logger Trigger:** Memastikan perubahan status tiket selalu mencatat record baru di `ticket_status_histories` dalam transaksi atomik.
   - **Customer Session Revocation Trigger:** Trigger saat `repair_tickets.status` berubah menjadi `COMPLETED`, otomatis mengeset `revoked_at = NOW()` pada seluruh sesi di tabel `customer_ticket_access_sessions` untuk tiket tersebut.

3. **Supabase Storage Configuration:**
   - Buat bucket privat: `repair-attachments` (public access disabled).
   - Aturan ukuran maksimal per file (3 MB) dan mime type (`image/jpeg`, `image/png`, `image/webp`).

4. **Seed Data (`supabase/seed.sql`):**
   - Akun Admin default.
   - 2 Akun Teknisi default.
   - Data pelanggan dan perangkat contoh untuk validasi lokal.

---

### FASE 3: BACKEND DEVELOPMENT (NETLIFY FUNCTIONS DENGAN TYPESCRIPT)
**Target:** API RESTful aman dengan validasi Zod, verifikasi Bearer Token Supabase Auth untuk staf, dan HttpOnly Cookie Session untuk pelanggan.

1. **Core Utilities & Middlewares (`netlify/functions/_shared/`):**
   - `supabaseClient.ts`: Inisialisasi Supabase client dengan `SUPABASE_SERVICE_ROLE_KEY`.
   - `authMiddleware.ts`: Ekstrak token Supabase Auth, validasi ke Supabase, periksa keaktifan akun dan role di `profiles`.
   - `customerAuthMiddleware.ts`: Ekstrak cookie `aris_customer_session`, verifikasi hash ke database, cek `expires_at`, cek `revoked_at`, dan cek tiket belum `COMPLETED`.
   - `responseHelper.ts`: Standarisasi respons sukses dan format error (HTTP status, error message, validation details).
   - `phoneHelper.ts`: Normalisasi nomor telepon ke format internasional E.164 (misal: `0812...` -> `+62812...`).
   - `auditLogger.ts`: Fungsi penyimpan histori ke tabel `audit_logs`.

2. **Endpoints Modul Auth:**
   - `GET /api/me`: Mengambil profil dan role staf aktif.

3. **Endpoints Modul Pelanggan & Perangkat (Admin & Teknisi):**
   - `GET /api/customers`: Pencarian pelanggan via nomor telepon atau nama.
   - `POST /api/customers`: Pendaftaran profil pelanggan baru.
   - `POST /api/devices`: Pendaftaran perangkat baru untuk pelanggan.

4. **Endpoints Modul Tiket & Antrean:**
   - `POST /api/tickets`: Intake tiket baru (dapat dilakukan Admin maupun Teknisi). Menyimpan kondisi fisik, keluhan, kelengkapan, opsional foto & PIN, menghasilkan tiket unik. Jika admin memilih teknisi, langsung buat assignment; jika tidak, masuk antrean `WAITING_ASSIGNMENT`.
   - `GET /api/admin/tickets`: Daftar tiket dengan filter status, teknisi, tanggal, pagination.
   - `GET /api/technician/assignments`: Daftar tiket aktif yang ditugaskan ke teknisi login.
   - `GET /api/technician/queue`: Daftar tiket tanpa penugasan (`assigned_technician_id IS NULL` & status `WAITING_ASSIGNMENT`).
   - `POST /api/technician/tickets/:id/self-assign`: Aksi teknisi mengambil tiket dari antrean secara mandiri -> status berpindah ke `INSPECTION`.
   - `POST /api/admin/tickets/:id/assign`: Admin menugaskan teknisi -> status berpindah ke `INSPECTION`.

5. **Endpoints Modul Diagnosis & Quotation:**
   - `POST /api/tickets/:id/diagnoses`: Simpan diagnosis dan rekomendasi teknis.
   - `POST /api/tickets/:id/quotation`: Simpan estimasi biaya (jasa + daftar suku cadang) dengan status `PUBLISHED`. Wajib sebelum reparasi dilanjutkan.
   - `GET /api/tickets/:id/quotation`: Ambil rincian quotation dan riwayat negosiasi.

6. **Endpoints Modul Progres & Status:**
   - `POST /api/tickets/:id/status`: Transisi status (mengikuti FSM: `WAITING_PARTS`, `IN_REPAIR`, `NOT_PROCEEDED`, dll.).
   - `POST /api/tickets/:id/updates`: Buat catatan progres (visibilitas `PUBLIC` atau `INTERNAL`).
   - `POST /api/tickets/:id/attachments/upload-url`: Generate signed upload URL Supabase Storage untuk foto progres.
   - `POST /api/tickets/:id/quality-check`: Konfirmasi hasil QC lulus/gagal (bisa oleh Admin atau Teknisi). Jika lulus -> `READY_FOR_PICKUP`.
   - `POST /api/tickets/:id/handover`: Konfirmasi serah terima perangkat ke pelanggan (bisa oleh Admin atau Teknisi). Mencatat nama pengonfirmasi, mengubah tiket ke `COMPLETED`, dan otomatis mencabut sesi customer.

7. **Endpoints Modul Portal Pelanggan:**
   - `POST /api/customer/access/login`: Validasi nomor tiket + nomor WhatsApp (E.164). Buat token kriptografis acak, simpan hash di database dengan masa berlaku aktif, kirim cookie `HttpOnly; Secure; SameSite=Lax`.
   - `GET /api/customer/access/session`: Cek validitas sesi aktif.
   - `POST /api/customer/access/logout`: Cabut sesi dan hapus cookie.
   - `GET /api/customer/ticket`: Ambil detail perangkat, keluhan, status saat ini, estimasi selesai.
   - `GET /api/customer/ticket/timeline`: Ambil riwayat status publik & catatan bertanda `PUBLIC`.
   - `GET /api/customer/ticket/quotation`: Ambil rincian biaya yang dipublikasikan.
   - `POST /api/customer/ticket/negotiation`: Kirim masukan negosiasi harga beserta pesan alasan.
   - `GET /api/customer/ticket/attachments/:id/signed-url`: Ambil signed download URL berumur pendek untuk foto bertanda `PUBLIC`.

---

### FASE 4: FRONTEND DEVELOPMENT (VUE.JS 3 + PINIA + TAILWIND)
**Target:** Antarmuka responsif, modern, mobile-first, dan terpisah secara visual antara peran Admin, Teknisi, dan Pelanggan.

1. **Routing & Layout Architecture (`src/`):**
   - `layouts/AuthLayout.vue`: Halaman login staf.
   - `layouts/AdminLayout.vue`: Navigasi sidebar/topbar admin, alert antrean unassigned.
   - `layouts/TechnicianLayout.vue`: Tampilan mobile-friendly untuk teknisi di meja kerja.
   - `layouts/CustomerLayout.vue`: Tampilan bersih untuk pelanggan (tanpa sidebar yang membingungkan).
   - Navigation Guards di `router/index.ts`: Memastikan proteksi role admin/teknisi dan validitas sesi tiket customer.

2. **State Management (Pinia Stores):**
   - `useAuthStore`: Mengelola sesi Supabase Auth staf, profile, dan token API.
   - `useAdminStore`: Mengelola daftar tiket, metrik ringkasan, antrean penugasan, data pelanggan.
   - `useTechStore`: Mengelola pekerjaan aktif teknisi, antrean self-assign, draft diagnosis & quotation.
   - `useCustomerStore`: Mengelola data tiket publik, riwayat timeline, quotation, dan smart polling.

3. **Modul Antarmuka Admin (`src/views/admin/`):**
   - **Dashboard:** Ringkasan metrik (Menunggu Teknisi, Sedang Dikerjakan, Menunggu Suku Cadang, Siap Diambil, Selesai), daftar tiket terbaru.
   - **Intake / Buat Tiket:** Formulir pencarian/pembuatan pelanggan cepat, input data perangkat (HP/Laptop), keluhan, kelengkapan, opsi unggah foto awal & PIN, serta pemilihan teknisi atau masuk antrean unassigned.
   - **Detail Tiket Admin:** Tampilan lengkap timeline, catatan internal vs publik, data teknisi yang bertugas, rincian biaya, tombol konfirmasi QC & Serah Terima.
   - **Manajemen Pelanggan & Teknisi:** Daftar dan penelusuran.

4. **Modul Antarmuka Teknisi (`src/views/technician/`):**
   - **Dashboard Teknisi:** Tab "Pekerjaan Saya" dan Tab "Antrean Tiket Bebas" (Self-assignment).
   - **Ruang Kerja Tiket:** 
     - Tombol cepat ambil tiket (self-assign).
     - Form diagnosis & rekomendasi perbaikan.
     - Form quotation wajib (input biaya jasa dan item komponen).
     - Kotak notifikasi negosiasi jika pelanggan mengirim masukan harga.
     - Upload foto sebelum/sesudah perbaikan (terintegrasi kompresi client-side sebelum upload ke signed URL).
     - Pengatur status kerja (`WAITING_PARTS`, `IN_REPAIR`, ajukan `QUALITY_CHECK`).
     - Form konfirmasi QC & Serah Terima (jika teknisi langsung menyerahkan ke pelanggan).

5. **Modul Portal Monitoring Pelanggan (`src/views/customer/`):**
   - **Halaman Login Tiket:** Form input nomor tiket (e.g. `AC-2026-000001`) dan nomor WhatsApp.
   - **Tampilan Monitoring Perangkat:**
     - Kartu identitas perangkat & status terkini dengan badge warna informatif.
     - Komponen Visual Timeline: jejak riwayat status dari penerimaan hingga serah terima.
     - Kartu Estimasi Biaya (Quotation): rincian biaya jasa & suku cadang.
     - Tombol & Dialog "Ajukan Negosiasi Biaya": form input alasan jika biaya dirasa terlalu tinggi.
     - Galeri Dokumentasi Foto: foto pengerjaan yang dibagikan secara publik.
   - **Smart Polling Composable (`useSmartPolling.ts`):**
     - Polling data tiap 30 detik saat tab browser aktif.
     - Polling melambat jadi tiap 120 detik saat tab di-minimize/background (`document.hidden`).
     - Polling otomatis dimatikan saat tiket mencapai status `COMPLETED` atau sesi kedaluwarsa.

---

### FASE 5: TESTING, HARDENING, & VERIFIKASI
**Target:** Seluruh alur bebas bug, database live terhubung, keamanan otorisasi teruji, dan data sensitif terlindungi.

0. **Koneksi Database Supabase Asli (Langkah Awal Fase 5):**
   - **Pembuatan Proyek Supabase:**
     1. Masuk ke [supabase.com](https://supabase.com) dan buat proyek baru (free tier).
     2. Catat database password yang dibuat.
   - **Eksekusi Skema & Data Seed:**
     1. Buka menu **SQL Editor** pada Supabase Dashboard.
     2. Eksekusi script DDL migration dari file `supabase/migrations/001_initial_schema.sql` (membuat 14 tabel, triggers sequence tiket, RLS, dan storage bucket `repair-attachments`).
     3. Eksekusi script seed dari file `supabase/seed.sql` (mengisi akun staf awal, customer, device, dan 3 sample ticket).
   - **Konfigurasi Environment Variables (`.env`):**
     1. Buka menu **Project Settings -> API** di Supabase Dashboard.
     2. Salin `Project URL` ke `VITE_SUPABASE_URL` dan `SUPABASE_URL`.
     3. Salin `anon / public key` ke `VITE_SUPABASE_ANON_KEY`.
     4. Salin `service_role key` (secret) ke `SUPABASE_SERVICE_ROLE_KEY`.
     5. Generate string 32-karakter acak untuk `CUSTOMER_SESSION_PEPPER`.
   - **Verifikasi Koneksi:**
     - Jalankan Netlify dev dan uji koneksi langsung antara backend functions, frontend, dan database Supabase live.

1. **Security & Authorization Test:**
   - Uji isolasi data: Pelanggan Tiket A tidak dapat mengakses data Tiket B via manipulasi parameter.
   - Uji data privat: Catatan `INTERNAL` dan margin biaya tidak bocor ke respons endpoint customer.
   - Uji file storage: File pada Supabase Storage tidak dapat diakses tanpa signed URL yang valid.
   - Uji pencabutan sesi: Pastikan sesi customer langsung revoked saat status tiket menjadi `COMPLETED`.
   - Uji pembatasan teknisi: Teknisi tidak dapat mengubah tiket milik teknisi lain yang bukan di antrean umum.

2. **End-to-End Workflow Test (Data Dummy):**
   - Skenario A: Admin buat tiket -> assign teknisi -> teknisi diagnosa & buat quotation -> pelanggan pantau -> pengerjaan -> QC -> serah terima selesai.
   - Skenario B: Teknisi buat tiket -> masuk antrean -> teknisi self-assign -> diagnosa -> buat quotation -> pelanggan ajukan negosiasi -> teknisi sesuaikan biaya -> selesai.
   - Skenario C: Quotation tidak disepakati -> Admin/Teknisi batalkan tiket (`NOT_PROCEEDED`).

---

### FASE 6: DEPLOYMENT & CHECKLIST GO-LIVE TERBATAS
**Target:** Aplikasi live di Netlify dengan database Supabase terhubung stabil.

1. **Konfigurasi Production Netlify:**
   - Setup Environment Variables di Netlify Dashboard.
   - Konfigurasi rewrite rules untuk SPA routing (`_redirects` atau `netlify.toml`).
2. **Konfigurasi Supabase Production:**
   - Pastikan RLS aktif pada seluruh tabel.
   - Pasang scheduled backup PostgreSQL atau backup mandiri.
3. **Checklist Kesiapan Operasional:**
   - Verifikasi format nomor tiket unik di environment production.
   - Verifikasi penanganan error jika koneksi Supabase terputus.
   - Pembuatan panduan operasional ringkas untuk Admin dan Teknisi Acell Service.

---

## 3. ESTIMASI URUTAN PENGERJAAN TEKNIS (STEP-BY-STEP)

| Langkah | Komponen | Fokus Pengerjaan | Target Luaran |
|---|---|---|---|
| **Step 1** | Project Init | Inisialisasi Vite + Vue 3 + Tailwind + Netlify config + shared types & Zod schemas | Skeleton project & dependency lengkap |
| **Step 2** | Database | Eksekusi migration SQL Supabase: tabel, triggers sequence tiket, RLS, storage bucket, seed | Database & storage Supabase live |
| **Step 3** | Backend Core | Helper Netlify Functions: auth middleware, customer cookie session, DB client, Zod validation | Pondasi API Netlify Functions |
| **Step 4** | Backend Tickets | Endpoint pembuatan tiket, penugasan admin, dan self-assign teknisi | Tiket dapat dibuat & ditugaskan |
| **Step 5** | Backend Workflow | Endpoint diagnosis, quotation, negosiasi, update publik, QC, dan Serah Terima | Workflow status lengkap di backend |
| **Step 6** | Backend Customer | Endpoint login nomor tiket + WA, session generator, customer ticket timeline | API portal pelanggan siap |
| **Step 7** | Frontend Auth & Layout | Setup Pinia, router guards, Layout Admin, Layout Teknisi, Layout Customer | Struktur navigasi & proteksi route |
| **Step 8** | Frontend Admin | UI Dashboard Admin, Form Intake Tiket/Pelanggan, Monitoring Tiket, Action Modal | Admin siap operasional |
| **Step 9** | Frontend Teknisi | UI Dashboard Teknisi, Antrean Self-Assign, Form Diagnosis & Quotation, Upload Foto | Teknisi siap operasional |
| **Step 10** | Frontend Customer | UI Login Portal, Visual Timeline, Detail Quotation & Form Negosiasi, Smart Polling | Pelanggan dapat memantau mandiri |
| **Step 11** | E2E Testing | Pengujian skenario lengkap dari awal sampai selesai serah terima & periksa keamanan | Bug fixing & validasi aturan bisnis |
| **Step 12** | Deployment | Deploy ke Netlify, konfigurasi env production, uji live | Sistem siap uji coba terbatas |

---
*Dokumen ini merupakan panduan implementasi resmi yang menjadi acuan pengerjaan setiap baris kode pada sistem ARIS.*
