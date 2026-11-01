import { UserRole, DeviceType, TicketStatus, Visibility, QuotationStatus } from '@shared/types/index';
import type {
  Profile, Customer, Device, RepairTicket,
  TicketStatusHistory, TicketUpdate, RepairDiagnosis, RepairQuotation, QuotationItem,
} from '@shared/types/index';

// ─── Staff Accounts ──────────────────────────────────────────────────────────
export const MOCK_PROFILES: Profile[] = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    full_name: 'Rian Manager Acell',
    role: UserRole.ADMIN,
    phone_e164: '+628111222333',
    is_active: true,
    created_at: '2026-10-15T08:00:00Z',
    updated_at: '2026-10-15T08:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000001',
    full_name: 'Budi Santoso',
    role: UserRole.TECHNICIAN,
    phone_e164: '+62811444555',
    is_active: true,
    created_at: '2026-10-16T08:00:00Z',
    updated_at: '2026-10-16T08:00:00Z',
  },
  {
    id: 'b0000000-0000-0000-0000-000000000002',
    full_name: 'Andi Wijaya',
    role: UserRole.TECHNICIAN,
    phone_e164: '+62811666777',
    is_active: true,
    created_at: '2026-10-16T08:00:00Z',
    updated_at: '2026-10-16T08:00:00Z',
  },
];

export const MOCK_STAFF_CREDENTIALS: Record<string, { profile: Profile; password: string }> = {
  'admin@acellservice.com': {
    profile: MOCK_PROFILES[0],
    password: 'AcellService2026!',
  },
  'budi.tech@acellservice.com': {
    profile: MOCK_PROFILES[1],
    password: 'AcellService2026!',
  },
  'andi.tech@acellservice.com': {
    profile: MOCK_PROFILES[2],
    password: 'AcellService2026!',
  },
};

// ─── Customers ───────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c0000000-0000-0000-0000-000000000001',
    name: 'Rahmat Hidayat',
    phone_e164: '+6281234567890',
    email: 'rahmat.hidayat@gmail.com',
    notes: 'Pelanggan tetap toko, prefer dihubungi lewat WhatsApp',
    created_at: '2026-10-20T09:00:00Z',
    updated_at: '2026-10-20T09:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000002',
    name: 'Siti Aminah',
    phone_e164: '+6285712345678',
    email: 'siti.aminah@yahoo.com',
    notes: 'Minta dicek tuntas karena untuk keperluan skripsi',
    created_at: '2026-10-22T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: 'c0000000-0000-0000-0000-000000000003',
    name: 'Dewi Lestari',
    phone_e164: '+6281987654321',
    email: 'dewi.lestari@outlook.com',
    notes: 'Unit kantor, butuh nota resmi',
    created_at: '2026-10-25T11:00:00Z',
    updated_at: '2026-10-25T11:00:00Z',
  },
];

// ─── Devices ─────────────────────────────────────────────────────────────────
export const MOCK_DEVICES: Device[] = [
  {
    id: 'd0000000-0000-0000-0000-000000000001',
    customer_id: 'c0000000-0000-0000-0000-000000000001',
    device_type: DeviceType.SMARTPHONE,
    brand: 'Samsung',
    model: 'Galaxy S22 Ultra',
    serial_or_imei: '354928109823451',
    color: 'Phantom Black',
    created_at: '2026-10-20T09:00:00Z',
    updated_at: '2026-10-20T09:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000002',
    customer_id: 'c0000000-0000-0000-0000-000000000002',
    device_type: DeviceType.SMARTPHONE,
    brand: 'Apple',
    model: 'iPhone 13 Pro',
    serial_or_imei: 'DNPGN878MD6M',
    color: 'Sierra Blue',
    created_at: '2026-10-22T10:00:00Z',
    updated_at: '2026-10-22T10:00:00Z',
  },
  {
    id: 'd0000000-0000-0000-0000-000000000003',
    customer_id: 'c0000000-0000-0000-0000-000000000003',
    device_type: DeviceType.LAPTOP,
    brand: 'ASUS',
    model: 'ROG Zephyrus G14',
    serial_or_imei: 'M4NRCX001928374',
    color: 'Moonlight White',
    created_at: '2026-10-25T11:00:00Z',
    updated_at: '2026-10-25T11:00:00Z',
  },
];

// ─── Tickets ─────────────────────────────────────────────────────────────────
export const MOCK_TICKETS: RepairTicket[] = [
  {
    id: 'e0000000-0000-0000-0000-000000000001',
    ticket_number: 'AC-2026-000001',
    customer_id: 'c0000000-0000-0000-0000-000000000001',
    device_id: 'd0000000-0000-0000-0000-000000000001',
    created_by: 'a0000000-0000-0000-0000-000000000001',
    assigned_technician_id: null,
    status: TicketStatus.WAITING_ASSIGNMENT,
    customer_complaint: 'Layar sentuh retak parah setelah terjatuh, garis hijau muncul di sisi kiri.',
    intake_condition: 'Fisik baret pada bezel bawah, backdoor mulus, layar pecah retak seribu tapi masih menampilkan gambar.',
    accessories_received: 'Unit handphone saja tanpa charger.',
    device_pin_or_passcode: '123456',
    estimated_completion_at: '2026-11-03T18:00:00Z',
    received_at: '2026-11-01T08:30:00Z',
    completed_at: null,
    created_at: '2026-11-01T08:30:00Z',
    updated_at: '2026-11-01T08:30:00Z',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000002',
    ticket_number: 'AC-2026-000002',
    customer_id: 'c0000000-0000-0000-0000-000000000002',
    device_id: 'd0000000-0000-0000-0000-000000000002',
    created_by: 'a0000000-0000-0000-0000-000000000001',
    assigned_technician_id: 'b0000000-0000-0000-0000-000000000001',
    status: TicketStatus.INSPECTION,
    customer_complaint: 'Baterai cepat drop dari 80% langsung 10%, suhu cepat panas saat browsing.',
    intake_condition: 'Kondisi fisik mulus, battery health terbaca service di pengaturan.',
    accessories_received: 'Unit + Softcase silikon.',
    device_pin_or_passcode: null,
    estimated_completion_at: '2026-11-02T16:00:00Z',
    received_at: '2026-10-31T10:00:00Z',
    completed_at: null,
    created_at: '2026-10-31T10:00:00Z',
    updated_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'e0000000-0000-0000-0000-000000000003',
    ticket_number: 'AC-2026-000003',
    customer_id: 'c0000000-0000-0000-0000-000000000003',
    device_id: 'd0000000-0000-0000-0000-000000000003',
    created_by: 'a0000000-0000-0000-0000-000000000001',
    assigned_technician_id: 'b0000000-0000-0000-0000-000000000002',
    status: TicketStatus.IN_REPAIR,
    customer_complaint: 'Laptop mendadak mati saat render video dan kipas mengeluarkan bunyi gesekan keras.',
    intake_condition: 'Kipas berdebu tebal, pasta pendingin kering, keyboard normal.',
    accessories_received: 'Unit laptop + Adaptor Charger 180W original.',
    device_pin_or_passcode: '9988',
    estimated_completion_at: '2026-11-04T12:00:00Z',
    received_at: '2026-10-30T14:00:00Z',
    completed_at: null,
    created_at: '2026-10-30T14:00:00Z',
    updated_at: '2026-11-01T10:30:00Z',
  },
];

// ─── Status Histories ────────────────────────────────────────────────────────
export const MOCK_STATUS_HISTORIES: TicketStatusHistory[] = [
  {
    id: 'h1',
    ticket_id: 'e0000000-0000-0000-0000-000000000001',
    old_status: null,
    new_status: TicketStatus.INTAKE,
    changed_by_type: 'ADMIN' as any,
    changed_by_id: 'a0000000-0000-0000-0000-000000000001',
    actor_name_snapshot: 'Rian Manager Acell',
    reason_or_note: 'Unit diterima di counter servis',
    created_at: '2026-11-01T08:30:00Z',
  },
  {
    id: 'h2',
    ticket_id: 'e0000000-0000-0000-0000-000000000001',
    old_status: TicketStatus.INTAKE,
    new_status: TicketStatus.WAITING_ASSIGNMENT,
    changed_by_type: 'SYSTEM' as any,
    changed_by_id: null,
    actor_name_snapshot: 'Sistem ARIS',
    reason_or_note: 'Masuk antrean teknisi umum',
    created_at: '2026-11-01T08:30:00Z',
  },
  {
    id: 'h3',
    ticket_id: 'e0000000-0000-0000-0000-000000000002',
    old_status: TicketStatus.WAITING_ASSIGNMENT,
    new_status: TicketStatus.INSPECTION,
    changed_by_type: 'ADMIN' as any,
    changed_by_id: 'a0000000-0000-0000-0000-000000000001',
    actor_name_snapshot: 'Rian Manager Acell',
    reason_or_note: 'Ditugaskan ke teknisi Budi Santoso',
    created_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 'h4',
    ticket_id: 'e0000000-0000-0000-0000-000000000003',
    old_status: TicketStatus.INSPECTION,
    new_status: TicketStatus.IN_REPAIR,
    changed_by_type: 'TECHNICIAN' as any,
    changed_by_id: 'b0000000-0000-0000-0000-000000000002',
    actor_name_snapshot: 'Andi Wijaya',
    reason_or_note: 'Persetujuan estimasi biaya diterima, pengerjaan dimulai',
    created_at: '2026-11-01T10:30:00Z',
  },
];

// ─── Diagnoses ───────────────────────────────────────────────────────────────
export const MOCK_DIAGNOSES: RepairDiagnosis[] = [
  {
    id: 'diag-1',
    ticket_id: 'e0000000-0000-0000-0000-000000000002',
    technician_id: 'b0000000-0000-0000-0000-000000000001',
    diagnosis: 'Kapasitas sel baterai telah mengalami degradasi fisik sebesar 45%. Jalur IC charge normal.',
    recommended_action: 'Penggantian modul baterai Original Equipment Manufacturer (OEM) + kalibrasi BMS.',
    visibility: Visibility.PUBLIC,
    created_at: '2026-11-01T09:15:00Z',
    updated_at: '2026-11-01T09:15:00Z',
  },
  {
    id: 'diag-2',
    ticket_id: 'e0000000-0000-0000-0000-000000000003',
    technician_id: 'b0000000-0000-0000-0000-000000000002',
    diagnosis: 'Thermal throttling ekstrem akibat pasta termal mengering dan bearing fan GPU aus.',
    recommended_action: 'Repaste Liquid Metal/Thermal Paste high-performance & penggantian kipas fan GPU original.',
    visibility: Visibility.PUBLIC,
    created_at: '2026-10-31T11:00:00Z',
    updated_at: '2026-10-31T11:00:00Z',
  },
];

// ─── Quotations ──────────────────────────────────────────────────────────────
export const MOCK_QUOTATIONS: Array<RepairQuotation & { items: QuotationItem[] }> = [
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    ticket_id: 'e0000000-0000-0000-0000-000000000003',
    version: 1,
    labor_cost: 150000,
    parts_cost: 350000,
    total_cost: 500000,
    status: QuotationStatus.PUBLISHED,
    created_by: 'b0000000-0000-0000-0000-000000000002',
    created_at: '2026-10-31T11:30:00Z',
    items: [
      {
        id: 'qi-1',
        quotation_id: 'f0000000-0000-0000-0000-000000000003',
        description: 'Jasa Cleaning Heatsink & Repaste Termal',
        quantity: 1,
        unit_price: 150000,
        line_total: 150000,
      },
      {
        id: 'qi-2',
        quotation_id: 'f0000000-0000-0000-0000-000000000003',
        description: 'Kipas Fan GPU ASUS ROG Zephyrus G14 Original',
        quantity: 1,
        unit_price: 350000,
        line_total: 350000,
      },
    ],
  },
];

// ─── Updates ─────────────────────────────────────────────────────────────────
export const MOCK_UPDATES: TicketUpdate[] = [
  {
    id: 'upd-1',
    ticket_id: 'e0000000-0000-0000-0000-000000000003',
    author_id: 'b0000000-0000-0000-0000-000000000002',
    author_name_snapshot: 'Andi Wijaya',
    message: 'Komponen kipas pengganti telah tiba dan saat ini sedang dilakukan pemasangan serta pengujian benchmark suhu.',
    visibility: Visibility.PUBLIC,
    created_at: '2026-11-01T10:45:00Z',
  },
  {
    id: 'upd-2',
    ticket_id: 'e0000000-0000-0000-0000-000000000003',
    author_id: 'b0000000-0000-0000-0000-000000000002',
    author_name_snapshot: 'Andi Wijaya',
    message: 'Catatan internal: thermal pad VRAM masih dalam kondisi baik, tidak perlu diganti.',
    visibility: Visibility.INTERNAL,
    created_at: '2026-11-01T10:46:00Z',
  },
];
