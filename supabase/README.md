# Supabase Database & Storage Setup (ARIS)

Dokumen ini memuat panduan penerapan skema database PostgreSQL, triggers, RLS, Storage, dan data seed untuk **Acell Service Repair Monitoring System (ARIS)**.

---

## 1. Struktur File
- `supabase/migrations/001_initial_schema.sql`: Berisi DDL 14 tabel relasional, enum, index, triggers atomik, policies RLS, dan registrasi private storage bucket `repair-attachments`.
- `supabase/seed.sql`: Data awal pengguna (1 Admin, 2 Teknisi), pelanggan, perangkat, tiket uji coba, diagnosis, quotation, dan catatan progres.

---

## 2. Cara Eksekusi Migrasi

### Opsi A: Menggunakan Supabase Dashboard (Web SQL Editor)
1. Buka dashboard proyek Supabase Anda di browser (`https://supabase.com/dashboard/project/<PROJECT-ID>`).
2. Masuk ke menu **SQL Editor**.
3. Buka file `supabase/migrations/001_initial_schema.sql`, salin seluruh isinya, tempel ke editor SQL, lalu klik **Run**.
4. Buka file `supabase/seed.sql`, salin seluruh isinya, tempel ke editor SQL, lalu klik **Run**.
5. Masuk ke menu **Storage** untuk memastikan bucket privat `repair-attachments` sudah terdaftar dengan status Private.

### Opsi B: Menggunakan Supabase CLI (Lokal / CI-CD)
Jika menggunakan Supabase CLI:
```bash
# Login dan hubungkan ke remote project
supabase login
supabase link --project-ref <PROJECT-ID>

# Terapkan migrasi ke database
supabase db push

# Atau jika di lingkungan lokal development:
supabase start
supabase db reset
```

---

## 3. Akun Pengguna Bawaan (Seed Data)

Semua akun seed memiliki password default: **`AcellService2026!`**

| Email | Peran | Nama Lengkap | Keterangan |
|---|---|---|---|
| `admin@acellservice.com` | `ADMIN` | Rian Manager Acell | Akses penuh dashboard, manajemen tiket, dan audit log. |
| `budi.tech@acellservice.com` | `TECHNICIAN` | Budi Santoso | Teknisi 1 (meja kerja perbaikan, self-assign). |
| `andi.tech@acellservice.com` | `TECHNICIAN` | Andi Wijaya | Teknisi 2 (meja kerja perbaikan, quotation). |

---

## 4. Tiket Uji Coba Bawaan (Seed Data)

| Nomor Tiket | Perangkat | Status | Pelanggan | Nomor WA |
|---|---|---|---|---|
| `AC-2026-000001` | Samsung Galaxy S22 Ultra | `WAITING_ASSIGNMENT` | Rahmat Hidayat | `+6281234567890` |
| `AC-2026-000002` | iPhone 13 Pro | `INSPECTION` | Siti Aminah | `+6285712345678` |
| `AC-2026-000003` | ASUS ROG Zephyrus G14 | `IN_REPAIR` | Dewi Lestari | `+6281987654321` |

Data di atas dapat langsung digunakan untuk menguji alur login staf maupun login portal monitoring pelanggan pada fase-fase berikutnya.
