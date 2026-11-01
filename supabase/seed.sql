-- ============================================================================
-- ARIS - Acell Service Repair Monitoring System
-- Database Seed Data (supabase/seed.sql)
-- ============================================================================

-- ─── Fixed UUIDs for Mock Accounts ──────────────────────────────────────────
-- Admin:      a0000000-0000-0000-0000-000000000001
-- Teknisi 1:  b0000000-0000-0000-0000-000000000001
-- Teknisi 2:  b0000000-0000-0000-0000-000000000002

-- ─── 1. Auth Users (Supabase Auth Mock) ─────────────────────────────────────
-- Password default untuk akun seed lokal: "AcellService2026!"
-- BCrypt hash: $2a$10$w85v9dE3g6VlX2xPnqv7ceJg3XN6Ocmj0h9V6lK2oP4h7K4h8c4qC
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role,
  aud
) VALUES
  (
    'a0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'admin@acellservice.com',
    '$2a$10$w85v9dE3g6VlX2xPnqv7ceJg3XN6Ocmj0h9V6lK2oP4h7K4h8c4qC',
    timezone('utc', now()),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Maulana Andhika", "role": "ADMIN"}',
    timezone('utc', now()),
    timezone('utc', now()),
    'authenticated',
    'authenticated'
  ),
  (
    'b0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'bagas.tech@acellservice.com',
    '$2a$10$w85v9dE3g6VlX2xPnqv7ceJg3XN6Ocmj0h9V6lK2oP4h7K4h8c4qC',
    timezone('utc', now()),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Bagaskara", "role": "TECHNICIAN"}',
    timezone('utc', now()),
    timezone('utc', now()),
    'authenticated',
    'authenticated'
  ),
  (
    'b0000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'andi.tech@acellservice.com',
    '$2a$10$w85v9dE3g6VlX2xPnqv7ceJg3XN6Ocmj0h9V6lK2oP4h7K4h8c4qC',
    timezone('utc', now()),
    '{"provider": "email", "providers": ["email"]}',
    '{"full_name": "Andi Wijaya", "role": "TECHNICIAN"}',
    timezone('utc', now()),
    timezone('utc', now()),
    'authenticated',
    'authenticated'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Profiles ────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, full_name, role, phone_e164, is_active)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Rian Manager Acell', 'ADMIN', '+628111222333', true),
  ('b0000000-0000-0000-0000-000000000001', 'Budi Santoso', 'TECHNICIAN', '+62811444555', true),
  ('b0000000-0000-0000-0000-000000000002', 'Andi Wijaya', 'TECHNICIAN', '+62811666777', true)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  phone_e164 = EXCLUDED.phone_e164,
  is_active = EXCLUDED.is_active;

-- ─── 3. Customers ───────────────────────────────────────────────────────────
-- Customer 1: Rahmat Hidayat (+6281234567890)
-- Customer 2: Siti Aminah    (+6285712345678)
-- Customer 3: Dewi Lestari   (+6281987654321)
INSERT INTO public.customers (id, name, phone_e164, email, notes)
VALUES
  (
    'c0000000-0000-0000-0000-000000000001',
    'Rahmat Hidayat',
    '+6281234567890',
    'rahmat.hidayat@gmail.com',
    'Pelanggan tetap toko, prefer dihubungi lewat WhatsApp'
  ),
  (
    'c0000000-0000-0000-0000-000000000002',
    'Siti Aminah',
    '+6285712345678',
    'siti.aminah@yahoo.com',
    'Minta dicek tuntas karena untuk keperluan skripsi'
  ),
  (
    'c0000000-0000-0000-0000-000000000003',
    'Dewi Lestari',
    '+6281987654321',
    'dewi.lestari@outlook.com',
    'Unit kantor, butuh nota resmi'
  )
ON CONFLICT (phone_e164) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  notes = EXCLUDED.notes;

-- ─── 4. Devices ─────────────────────────────────────────────────────────────
INSERT INTO public.devices (id, customer_id, device_type, brand, model, serial_or_imei, color)
VALUES
  (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'SMARTPHONE',
    'Samsung',
    'Galaxy S22 Ultra',
    '354928109823451',
    'Phantom Black'
  ),
  (
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    'SMARTPHONE',
    'Apple',
    'iPhone 13 Pro',
    'DNPGN878MD6M',
    'Sierra Blue'
  ),
  (
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    'LAPTOP',
    'ASUS',
    'ROG Zephyrus G14',
    'M4NRCX001928374',
    'Moonlight White'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 5. Repair Tickets ──────────────────────────────────────────────────────
-- Tiket 1: Samsung S22 - Status WAITING_ASSIGNMENT (Antrean bebas untuk teknisi)
-- Tiket 2: iPhone 13 Pro - Status INSPECTION (Ditugaskan ke Budi)
-- Tiket 3: ASUS ROG - Status IN_REPAIR (Ditugaskan ke Andi, dengan Quotation)
INSERT INTO public.repair_tickets (
  id,
  ticket_number,
  customer_id,
  device_id,
  created_by,
  assigned_technician_id,
  status,
  customer_complaint,
  intake_condition,
  accessories_received,
  device_pin_or_passcode,
  estimated_completion_at,
  received_at
) VALUES
  (
    'e0000000-0000-0000-0000-000000000001',
    'AC-2026-000001',
    'c0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    NULL,
    'WAITING_ASSIGNMENT',
    'Layar sentuh retak parah setelah terjatuh, garis hijau muncul di sisi kiri.',
    'Fisik baret pada bezel bawah, backdoor mulus, layar pecah retak seribu tapi masih menampilkan gambar.',
    'Unit handphone saja tanpa charger.',
    '123456',
    timezone('utc', now() + INTERVAL '2 days'),
    timezone('utc', now() - INTERVAL '3 hours')
  ),
  (
    'e0000000-0000-0000-0000-000000000002',
    'AC-2026-000002',
    'c0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000002',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    'INSPECTION',
    'Baterai cepat drop dari 80% langsung 10%, suhu cepat panas saat browsing.',
    'Kondisi fisik mulus, battery health terbaca service di pengaturan.',
    'Unit + Softcase silikon.',
    NULL,
    timezone('utc', now() + INTERVAL '1 day'),
    timezone('utc', now() - INTERVAL '1 day')
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'AC-2026-000003',
    'c0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000003',
    'a0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000002',
    'IN_REPAIR',
    'Laptop mendadak mati saat render video dan kipas mengeluarkan bunyi gesekan keras.',
    'Kipas berdebu tebal, pasta pendingin kering, keyboard normal.',
    'Unit laptop + Adaptor Charger 180W original.',
    '9988',
    timezone('utc', now() + INTERVAL '3 days'),
    timezone('utc', now() - INTERVAL '2 days')
  )
ON CONFLICT (ticket_number) DO NOTHING;

-- ─── 6. Ticket Assignments ──────────────────────────────────────────────────
INSERT INTO public.ticket_assignments (
  ticket_id,
  technician_id,
  assigned_by,
  assignment_type,
  assigned_at
) VALUES
  (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'ADMIN_MANUAL',
    timezone('utc', now() - INTERVAL '20 hours')
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    NULL,
    'SELF_ASSIGNED',
    timezone('utc', now() - INTERVAL '1 day')
  )
ON CONFLICT DO NOTHING;

-- ─── 7. Repair Diagnoses ────────────────────────────────────────────────────
INSERT INTO public.repair_diagnoses (
  ticket_id,
  technician_id,
  diagnosis,
  recommended_action,
  visibility
) VALUES
  (
    'e0000000-0000-0000-0000-000000000002',
    'b0000000-0000-0000-0000-000000000001',
    'Kapasitas sel baterai telah mengalami degradasi fisik sebesar 45%. Jalur IC charge normal.',
    'Penggantian modul baterai Original Equipment Manufacturer (OEM) + kalibrasi BMS.',
    'PUBLIC'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Thermal throttling ekstrem akibat pasta termal mengering dan bearing fan GPU aus.',
    'Repaste Liquid Metal/Thermal Paste high-performance & penggantian kipas fan GPU original.',
    'PUBLIC'
  )
ON CONFLICT DO NOTHING;

-- ─── 8. Repair Quotations & Items ───────────────────────────────────────────
INSERT INTO public.repair_quotations (
  id,
  ticket_id,
  version,
  labor_cost,
  parts_cost,
  total_cost,
  status,
  created_by
) VALUES
  (
    'f0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000003',
    1,
    150000.00,
    350000.00,
    500000.00,
    'PUBLISHED',
    'b0000000-0000-0000-0000-000000000002'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.quotation_items (
  quotation_id,
  description,
  quantity,
  unit_price,
  line_total
) VALUES
  (
    'f0000000-0000-0000-0000-000000000003',
    'Jasa Cleaning Heatsink & Repaste Termal',
    1,
    150000.00,
    150000.00
  ),
  (
    'f0000000-0000-0000-0000-000000000003',
    'Kipas Fan GPU ASUS ROG Zephyrus G14 Original',
    1,
    350000.00,
    350000.00
  )
ON CONFLICT DO NOTHING;

-- ─── 9. Ticket Updates ──────────────────────────────────────────────────────
INSERT INTO public.ticket_updates (
  ticket_id,
  author_id,
  author_name_snapshot,
  message,
  visibility
) VALUES
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Andi Wijaya',
    'Komponen kipas pengganti telah tiba dan saat ini sedang dilakukan pemasangan serta pengujian benchmark suhu.',
    'PUBLIC'
  ),
  (
    'e0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000002',
    'Andi Wijaya',
    'Catatan internal: thermal pad VRAM masih dalam kondisi baik, tidak perlu diganti.',
    'INTERNAL'
  )
ON CONFLICT DO NOTHING;
