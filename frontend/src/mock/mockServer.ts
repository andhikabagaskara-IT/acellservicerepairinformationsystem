import {
  MOCK_PROFILES,
  MOCK_CUSTOMERS,
  MOCK_DEVICES,
  MOCK_TICKETS,
  MOCK_STATUS_HISTORIES,
  MOCK_DIAGNOSES,
  MOCK_QUOTATIONS,
  MOCK_UPDATES,
} from './mockData';
import { TicketStatus, UserRole, Visibility, QuotationStatus } from '@shared/types/index';
import type { RepairTicket, Customer, Device, TicketStatusHistory, TicketUpdate, RepairDiagnosis, RepairQuotation, QuotationItem } from '@shared/types/index';

// ─── Reactive in-memory state for mock mode ──────────────────────────────────
const customers = [...MOCK_CUSTOMERS];
const devices = [...MOCK_DEVICES];
const tickets: RepairTicket[] = [...MOCK_TICKETS];
const statusHistories = [...MOCK_STATUS_HISTORIES];
const diagnoses = [...MOCK_DIAGNOSES];
const quotations = [...MOCK_QUOTATIONS];
const updates = [...MOCK_UPDATES];

// Customer session state
let activeCustomerTicketId: string | null = sessionStorage.getItem('aris_mock_customer_ticket_id');

export function isMockMode(): boolean {
  // Mock mode is enabled if VITE_SUPABASE_URL contains placeholder or if VITE_USE_MOCK=true
  const url = import.meta.env.VITE_SUPABASE_URL || '';
  return !url || url.includes('your-project-id') || url.includes('placeholder') || import.meta.env.VITE_USE_MOCK === 'true';
}

function normalizePhone(p: string): string {
  let cleaned = p.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('08')) cleaned = '+62' + cleaned.slice(1);
  else if (cleaned.startsWith('628')) cleaned = '+' + cleaned;
  return cleaned;
}

export function handleMockRequest<T>(
  endpoint: string,
  method: string = 'GET',
  body?: unknown,
  params?: Record<string, any>
): { handled: boolean; data?: T; status?: number; error?: string } {
  // Parse clean endpoint path
  const urlPath = endpoint.split('?')[0];

  // 1. Customer Auth
  if (urlPath === '/customer/access/login' && method === 'POST') {
    const { ticket_number, phone_e164 } = (body as any) || {};
    const normPhone = normalizePhone(phone_e164 || '');

    const t = tickets.find(
      (tk) => tk.ticket_number.toUpperCase() === (ticket_number || '').toUpperCase().trim()
    );
    if (!t) {
      return { handled: true, status: 404, error: 'Nomor tiket tidak ditemukan.' };
    }

    const c = customers.find((cust) => cust.id === t.customer_id);
    if (!c || normalizePhone(c.phone_e164) !== normPhone) {
      return { handled: true, status: 401, error: 'Nomor WhatsApp tidak cocok dengan data pendaftaran tiket.' };
    }

    activeCustomerTicketId = t.id;
    sessionStorage.setItem('aris_mock_customer_ticket_id', t.id);
    return { handled: true, data: { success: true, message: 'Login berhasil (Mock Mode)' } as any };
  }

  if (urlPath === '/customer/access/session' && method === 'GET') {
    if (!activeCustomerTicketId) {
      return { handled: true, data: { success: false } as any };
    }
    const t = tickets.find((tk) => tk.id === activeCustomerTicketId);
    if (!t) {
      activeCustomerTicketId = null;
      sessionStorage.removeItem('aris_mock_customer_ticket_id');
      return { handled: true, data: { success: false } as any };
    }
    return { handled: true, data: { success: true, data: { ticket_id: t.id, ticket_number: t.ticket_number, status: t.status } } as any };
  }

  if (urlPath === '/customer/access/logout' && method === 'POST') {
    activeCustomerTicketId = null;
    sessionStorage.removeItem('aris_mock_customer_ticket_id');
    return { handled: true, data: { success: true } as any };
  }

  if (urlPath === '/customer/ticket' && method === 'GET') {
    if (!activeCustomerTicketId) {
      return { handled: true, status: 401, error: 'Sesi pelanggan tidak aktif.' };
    }
    const t = tickets.find((tk) => tk.id === activeCustomerTicketId);
    if (!t) return { handled: true, status: 404, error: 'Tiket tidak ditemukan.' };
    const c = customers.find((cust) => cust.id === t.customer_id);
    const d = devices.find((dev) => dev.id === t.device_id);

    return {
      handled: true,
      data: {
        success: true,
        data: {
          ...t,
          customer_name: c?.name,
          customer_phone: c?.phone_e164,
          device_brand: d?.brand,
          device_model: d?.model,
          device_type: d?.device_type,
          device_color: d?.color,
        },
      } as any,
    };
  }

  if (urlPath === '/customer/ticket/timeline' && method === 'GET') {
    if (!activeCustomerTicketId) {
      return { handled: true, status: 401, error: 'Sesi tidak aktif.' };
    }
    const th = statusHistories.filter((h) => h.ticket_id === activeCustomerTicketId);
    const up = updates.filter((u) => u.ticket_id === activeCustomerTicketId && u.visibility === Visibility.PUBLIC);
    return {
      handled: true,
      data: {
        success: true,
        data: {
          status_history: th,
          updates: up,
        },
      } as any,
    };
  }

  if (urlPath === '/customer/ticket/quotation' && method === 'GET') {
    if (!activeCustomerTicketId) {
      return { handled: true, status: 401, error: 'Sesi tidak aktif.' };
    }
    const q = quotations.find((quot) => quot.ticket_id === activeCustomerTicketId && quot.status === QuotationStatus.PUBLISHED);
    return { handled: true, data: { success: true, data: q || null } as any };
  }

  if (urlPath === '/customer/ticket/negotiation' && method === 'POST') {
    const { message } = (body as any) || {};
    if (activeCustomerTicketId && message) {
      updates.push({
        id: `upd-neg-${Date.now()}`,
        ticket_id: activeCustomerTicketId,
        author_id: 'customer',
        author_name_snapshot: 'Pelanggan',
        message: `[Negosiasi Biaya]: ${message}`,
        visibility: Visibility.PUBLIC,
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true, message: 'Masukan berhasil terkirim.' } as any };
  }

  if (urlPath === '/customer/ticket/attachments' && method === 'GET') {
    return { handled: true, data: { success: true, data: [] } as any };
  }

  // 2. Staff Me
  if (urlPath === '/me' && method === 'GET') {
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[0];
    return { handled: true, data: { success: true, data: profile } as any };
  }

  // 3. Admin Tickets List
  if (urlPath === '/admin/tickets' && method === 'GET') {
    if (params?.technicians_only) {
      const techList = MOCK_PROFILES.filter((p) => p.role === UserRole.TECHNICIAN);
      return { handled: true, data: { success: true, data: techList } as any };
    }

    let result = tickets.map((t) => {
      const c = customers.find((cust) => cust.id === t.customer_id);
      const d = devices.find((dev) => dev.id === t.device_id);
      const tech = MOCK_PROFILES.find((p) => p.id === t.assigned_technician_id);
      return {
        ...t,
        customer: c,
        device: d,
        technician: tech,
      };
    });

    if (params?.status) {
      result = result.filter((t) => t.status === params.status);
    }
    if (params?.search) {
      const q = String(params.search).toLowerCase();
      result = result.filter(
        (t) =>
          t.ticket_number.toLowerCase().includes(q) ||
          t.customer?.name.toLowerCase().includes(q) ||
          t.device?.model.toLowerCase().includes(q)
      );
    }

    const page = Number(params?.page) || 1;
    const perPage = Number(params?.per_page) || 15;
    const total = result.length;
    const paginated = result.slice((page - 1) * perPage, page * perPage);

    return {
      handled: true,
      data: {
        success: true,
        data: paginated,
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage) || 1,
      } as any,
    };
  }

  // 4. Ticket Detail
  const ticketDetailMatch = urlPath.match(/^\/tickets\/([^/]+)$/);
  if (ticketDetailMatch && method === 'GET') {
    const tId = ticketDetailMatch[1];
    const t = tickets.find((tk) => tk.id === tId);
    if (!t) return { handled: true, status: 404, error: 'Tiket tidak ditemukan.' };
    const c = customers.find((cust) => cust.id === t.customer_id);
    const d = devices.find((dev) => dev.id === t.device_id);
    const tech = MOCK_PROFILES.find((p) => p.id === t.assigned_technician_id);

    return {
      handled: true,
      data: {
        success: true,
        data: {
          ...t,
          customer: c,
          customer_name: c?.name,
          customer_phone: c?.phone_e164,
          device: d,
          device_brand: d?.brand,
          device_model: d?.model,
          device_type: d?.device_type,
          technician: tech,
        },
      } as any,
    };
  }

  // 5. Create Ticket
  if (urlPath === '/tickets' && method === 'POST') {
    const payload = (body as any) || {};
    const newSeq = String(tickets.length + 1).padStart(6, '0');
    const newTicket: RepairTicket = {
      id: `e-mock-${Date.now()}`,
      ticket_number: `AC-2026-${newSeq}`,
      customer_id: payload.customer_id,
      device_id: payload.device_id,
      created_by: MOCK_PROFILES[0].id,
      assigned_technician_id: payload.assigned_technician_id || null,
      status: payload.assigned_technician_id ? TicketStatus.INSPECTION : TicketStatus.WAITING_ASSIGNMENT,
      customer_complaint: payload.customer_complaint,
      intake_condition: payload.intake_condition,
      accessories_received: payload.accessories_received || null,
      device_pin_or_passcode: payload.device_pin_or_passcode || null,
      estimated_completion_at: payload.estimated_completion_at || null,
      received_at: new Date().toISOString(),
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    tickets.unshift(newTicket);
    statusHistories.push({
      id: `h-mock-${Date.now()}`,
      ticket_id: newTicket.id,
      old_status: null,
      new_status: TicketStatus.INTAKE,
      changed_by_type: 'ADMIN' as any,
      changed_by_id: MOCK_PROFILES[0].id,
      actor_name_snapshot: MOCK_PROFILES[0].full_name,
      reason_or_note: 'Unit intake di counter',
      created_at: new Date().toISOString(),
    });
    return { handled: true, data: { success: true, data: newTicket } as any };
  }

  // 6. Assign Technician
  const assignMatch = urlPath.match(/^\/admin\/tickets\/([^/]+)\/assign$/);
  if (assignMatch && method === 'POST') {
    const tId = assignMatch[1];
    const { technician_id } = (body as any) || {};
    const t = tickets.find((tk) => tk.id === tId);
    if (t) {
      t.assigned_technician_id = technician_id;
      t.status = TicketStatus.INSPECTION;
      t.updated_at = new Date().toISOString();
      const tech = MOCK_PROFILES.find((p) => p.id === technician_id);
      statusHistories.push({
        id: `h-assign-${Date.now()}`,
        ticket_id: tId,
        old_status: TicketStatus.WAITING_ASSIGNMENT,
        new_status: TicketStatus.INSPECTION,
        changed_by_type: 'ADMIN' as any,
        changed_by_id: MOCK_PROFILES[0].id,
        actor_name_snapshot: MOCK_PROFILES[0].full_name,
        reason_or_note: `Ditugaskan ke teknisi ${tech?.full_name || 'Teknisi'}`,
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true } as any };
  }

  // 7. Customers CRUD
  if (urlPath === '/customers' && method === 'GET') {
    return { handled: true, data: { success: true, data: customers } as any };
  }
  if (urlPath === '/customers' && method === 'POST') {
    const payload = (body as any) || {};
    const newCust: Customer = {
      id: `c-mock-${Date.now()}`,
      name: payload.name,
      phone_e164: normalizePhone(payload.phone_e164),
      email: payload.email || null,
      notes: payload.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    customers.unshift(newCust);
    return { handled: true, data: { success: true, data: newCust } as any };
  }

  // 8. Devices CRUD
  if (urlPath === '/devices' && method === 'GET') {
    let result = devices;
    if (params?.customer_id) {
      result = result.filter((d) => d.customer_id === params.customer_id);
    }
    return { handled: true, data: { success: true, data: result } as any };
  }
  if (urlPath === '/devices' && method === 'POST') {
    const payload = (body as any) || {};
    const newDev: Device = {
      id: `d-mock-${Date.now()}`,
      customer_id: payload.customer_id,
      device_type: payload.device_type,
      brand: payload.brand,
      model: payload.model,
      serial_or_imei: payload.serial_or_imei || null,
      color: payload.color || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    devices.unshift(newDev);
    return { handled: true, data: { success: true, data: newDev } as any };
  }

  // 9. Technician Endpoints
  if (urlPath === '/technician/assignments' && method === 'GET') {
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[1];
    const techTickets = tickets
      .filter((tk) => tk.assigned_technician_id === profile.id && tk.status !== TicketStatus.COMPLETED)
      .map((tk) => {
        const c = customers.find((cust) => cust.id === tk.customer_id);
        const d = devices.find((dev) => dev.id === tk.device_id);
        return {
          ...tk,
          customer_name: c?.name,
          customer_phone: c?.phone_e164,
          device_brand: d?.brand,
          device_model: d?.model,
          device_type: d?.device_type,
        };
      });
    return { handled: true, data: { success: true, data: techTickets } as any };
  }

  if (urlPath === '/technician/queue' && method === 'GET') {
    const queueTickets = tickets
      .filter((tk) => !tk.assigned_technician_id && tk.status === TicketStatus.WAITING_ASSIGNMENT)
      .map((tk) => {
        const c = customers.find((cust) => cust.id === tk.customer_id);
        const d = devices.find((dev) => dev.id === tk.device_id);
        return {
          ...tk,
          customer_name: c?.name,
          customer_phone: c?.phone_e164,
          device_brand: d?.brand,
          device_model: d?.model,
          device_type: d?.device_type,
        };
      });
    return { handled: true, data: { success: true, data: queueTickets } as any };
  }

  if (urlPath === '/technician/self-assign' && method === 'POST') {
    const { ticket_id } = (body as any) || {};
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[1];
    const t = tickets.find((tk) => tk.id === ticket_id);
    if (t) {
      t.assigned_technician_id = profile.id;
      t.status = TicketStatus.INSPECTION;
      t.updated_at = new Date().toISOString();
      statusHistories.push({
        id: `h-self-${Date.now()}`,
        ticket_id,
        old_status: TicketStatus.WAITING_ASSIGNMENT,
        new_status: TicketStatus.INSPECTION,
        changed_by_type: 'TECHNICIAN' as any,
        changed_by_id: profile.id,
        actor_name_snapshot: profile.full_name,
        reason_or_note: `Self-assign oleh teknisi ${profile.full_name}`,
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true } as any };
  }

  // 10. Status History & Status Update
  const statusMatch = urlPath.match(/^\/tickets\/([^/]+)\/status$/);
  if (statusMatch && method === 'GET') {
    const tId = statusMatch[1];
    const th = statusHistories.filter((h) => h.ticket_id === tId);
    return { handled: true, data: { success: true, data: th } as any };
  }
  if (statusMatch && method === 'POST') {
    const tId = statusMatch[1];
    const { new_status, reason_or_note } = (body as any) || {};
    const t = tickets.find((tk) => tk.id === tId);
    if (t) {
      const oldStatus = t.status;
      t.status = new_status;
      t.updated_at = new Date().toISOString();
      const raw = sessionStorage.getItem('aris_mock_staff');
      const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[0];
      statusHistories.push({
        id: `h-st-${Date.now()}`,
        ticket_id: tId,
        old_status: oldStatus,
        new_status,
        changed_by_type: profile.role,
        changed_by_id: profile.id,
        actor_name_snapshot: profile.full_name,
        reason_or_note: reason_or_note || null,
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true } as any };
  }

  // 11. Updates
  const updatesMatch = urlPath.match(/^\/tickets\/([^/]+)\/updates$/);
  if (updatesMatch && method === 'GET') {
    const tId = updatesMatch[1];
    const up = updates.filter((u) => u.ticket_id === tId);
    return { handled: true, data: { success: true, data: up } as any };
  }
  if (updatesMatch && method === 'POST') {
    const tId = updatesMatch[1];
    const { message, visibility } = (body as any) || {};
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[0];
    const newUpd: TicketUpdate = {
      id: `upd-mock-${Date.now()}`,
      ticket_id: tId,
      author_id: profile.id,
      author_name_snapshot: profile.full_name,
      message,
      visibility: visibility || Visibility.PUBLIC,
      created_at: new Date().toISOString(),
    };
    updates.push(newUpd);
    return { handled: true, data: { success: true, data: newUpd } as any };
  }

  // 12. Diagnoses
  const diagMatch = urlPath.match(/^\/tickets\/([^/]+)\/diagnoses$/);
  if (diagMatch && method === 'GET') {
    const tId = diagMatch[1];
    const dg = diagnoses.filter((d) => d.ticket_id === tId);
    return { handled: true, data: { success: true, data: dg } as any };
  }
  if (diagMatch && method === 'POST') {
    const tId = diagMatch[1];
    const { diagnosis, recommended_action, visibility } = (body as any) || {};
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[1];
    const newDiag: RepairDiagnosis = {
      id: `diag-mock-${Date.now()}`,
      ticket_id: tId,
      technician_id: profile.id,
      diagnosis,
      recommended_action,
      visibility: visibility || Visibility.PUBLIC,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    diagnoses.push(newDiag);
    return { handled: true, data: { success: true, data: newDiag } as any };
  }

  // 13. Quotation
  const quotMatch = urlPath.match(/^\/tickets\/([^/]+)\/quotation$/);
  if (quotMatch && method === 'GET') {
    const tId = quotMatch[1];
    const q = quotations.find((quot) => quot.ticket_id === tId);
    return { handled: true, data: { success: true, data: q || null } as any };
  }
  if (quotMatch && method === 'POST') {
    const tId = quotMatch[1];
    const { labor_cost, items } = (body as any) || {};
    const raw = sessionStorage.getItem('aris_mock_staff');
    const profile = raw ? JSON.parse(raw) : MOCK_PROFILES[1];
    const qItems: QuotationItem[] = (items || []).map((it: any, idx: number) => ({
      id: `qi-mock-${Date.now()}-${idx}`,
      quotation_id: `q-mock-${Date.now()}`,
      description: it.description,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      line_total: (Number(it.quantity) || 1) * (Number(it.unit_price) || 0),
    }));
    const partsCost = qItems.reduce((acc, it) => acc + it.line_total, 0);
    const totalCost = Number(labor_cost || 0) + partsCost;

    const newQuot = {
      id: `q-mock-${Date.now()}`,
      ticket_id: tId,
      version: 1,
      labor_cost: Number(labor_cost) || 0,
      parts_cost: partsCost,
      total_cost: totalCost,
      status: QuotationStatus.PUBLISHED,
      created_by: profile.id,
      created_at: new Date().toISOString(),
      items: qItems,
    };
    const existingIdx = quotations.findIndex((q) => q.ticket_id === tId);
    if (existingIdx >= 0) {
      newQuot.version = quotations[existingIdx].version + 1;
      quotations[existingIdx] = newQuot;
    } else {
      quotations.push(newQuot);
    }
    return { handled: true, data: { success: true, data: newQuot } as any };
  }

  // 14. Quality Check & Handover
  const qcMatch = urlPath.match(/^\/tickets\/([^/]+)\/quality-check$/);
  if (qcMatch && method === 'POST') {
    const tId = qcMatch[1];
    const t = tickets.find((tk) => tk.id === tId);
    if (t) {
      t.status = TicketStatus.READY_FOR_PICKUP;
      t.updated_at = new Date().toISOString();
      statusHistories.push({
        id: `h-qc-${Date.now()}`,
        ticket_id: tId,
        old_status: TicketStatus.QUALITY_CHECK,
        new_status: TicketStatus.READY_FOR_PICKUP,
        changed_by_type: 'ADMIN' as any,
        changed_by_id: MOCK_PROFILES[0].id,
        actor_name_snapshot: MOCK_PROFILES[0].full_name,
        reason_or_note: 'Quality check LULUS. Unit siap diambil.',
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true } as any };
  }

  const handoverMatch = urlPath.match(/^\/tickets\/([^/]+)\/handover$/);
  if (handoverMatch && method === 'POST') {
    const tId = handoverMatch[1];
    const t = tickets.find((tk) => tk.id === tId);
    if (t) {
      t.status = TicketStatus.COMPLETED;
      t.completed_at = new Date().toISOString();
      t.updated_at = new Date().toISOString();
      statusHistories.push({
        id: `h-handover-${Date.now()}`,
        ticket_id: tId,
        old_status: TicketStatus.READY_FOR_PICKUP,
        new_status: TicketStatus.COMPLETED,
        changed_by_type: 'ADMIN' as any,
        changed_by_id: MOCK_PROFILES[0].id,
        actor_name_snapshot: MOCK_PROFILES[0].full_name,
        reason_or_note: 'Unit telah diserahkan kepada pelanggan. Servis selesai.',
        created_at: new Date().toISOString(),
      });
    }
    return { handled: true, data: { success: true } as any };
  }

  // 15. Attachments
  const attachMatch = urlPath.match(/^\/tickets\/([^/]+)\/attachments$/);
  if (attachMatch) {
    return { handled: true, data: { success: true, data: [] } as any };
  }

  return { handled: false };
}
