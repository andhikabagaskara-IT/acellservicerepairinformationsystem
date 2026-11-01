import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApi } from '@/composables/useApi';
import { TicketStatus } from '@shared/types/index';
import type {
  RepairTicket, RepairQuotation, QuotationItem,
  TicketStatusHistory, TicketUpdate, TicketAttachment,
  ApiResponse,
} from '@shared/types/index';

// Combined ticket detail for customer portal
export interface CustomerTicketDetail extends RepairTicket {
  customer_name?: string;
  device_brand?: string;
  device_model?: string;
  device_type?: string;
  device_color?: string;
}

export interface CustomerTimeline {
  status_history: TicketStatusHistory[];
  updates: TicketUpdate[];
}

export const useCustomerStore = defineStore('customer', () => {
  const api = useApi();

  // ─── State ──────────────────────────────────────────────────────────────────
  const isSessionActive = ref(false);
  const ticket = ref<CustomerTicketDetail | null>(null);
  const timeline = ref<CustomerTimeline | null>(null);
  const quotation = ref<(RepairQuotation & { items: QuotationItem[] }) | null>(null);
  const attachments = ref<TicketAttachment[]>([]);
  const isLoading = ref(false);
  const loginError = ref<string | null>(null);

  // ─── Computed ───────────────────────────────────────────────────────────────
  const isCompleted = computed(() =>
    ticket.value?.status === TicketStatus.COMPLETED ||
    ticket.value?.status === TicketStatus.CANCELLED ||
    ticket.value?.status === TicketStatus.NOT_PROCEEDED
  );

  const ticketNumber = computed(() => ticket.value?.ticket_number || '');

  // ─── Actions ────────────────────────────────────────────────────────────────

  /** Login pelanggan dengan nomor tiket + nomor WhatsApp */
  async function login(ticketNumber: string, phoneE164: string) {
    isLoading.value = true;
    loginError.value = null;
    try {
      const data = await api.customerPost<ApiResponse>('/customer/access/login', {
        ticket_number: ticketNumber,
        phone_e164: phoneE164,
      });
      if (data.success) {
        isSessionActive.value = true;
        await fetchTicketDetail();
        return true;
      }
      loginError.value = 'Nomor tiket atau nomor WhatsApp tidak valid.';
      return false;
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      loginError.value = apiErr.message || 'Terjadi kesalahan saat login.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /** Cek apakah session cookie masih valid */
  async function checkSession() {
    try {
      const data = await api.customerGet<ApiResponse>('/customer/access/session');
      isSessionActive.value = !!data.success;
      return data.success;
    } catch {
      isSessionActive.value = false;
      return false;
    }
  }

  /** Logout (hapus cookie session) */
  async function logout() {
    try {
      await api.customerPost('/customer/access/logout');
    } catch {
      // ignore
    }
    isSessionActive.value = false;
    ticket.value = null;
    timeline.value = null;
    quotation.value = null;
    attachments.value = [];
  }

  /** Fetch detail tiket dari customer endpoint */
  async function fetchTicketDetail() {
    try {
      const data = await api.customerGet<ApiResponse<CustomerTicketDetail>>('/customer/ticket');
      ticket.value = data.data || null;
    } catch {
      // handled
    }
  }

  /** Fetch timeline (status history + public updates) */
  async function fetchTimeline() {
    try {
      const data = await api.customerGet<ApiResponse<CustomerTimeline>>('/customer/ticket/timeline');
      timeline.value = data.data || null;
    } catch {
      // handled
    }
  }

  /** Fetch quotation */
  async function fetchQuotation() {
    try {
      const data = await api.customerGet<ApiResponse<RepairQuotation & { items: QuotationItem[] }>>('/customer/ticket/quotation');
      quotation.value = data.data || null;
    } catch {
      // handled
    }
  }

  /** Submit negosiasi */
  async function submitNegotiation(message: string) {
    return api.customerPost<ApiResponse>('/customer/ticket/negotiation', { message });
  }

  /** Fetch attachments (public photos) */
  async function fetchAttachments() {
    try {
      const data = await api.customerGet<ApiResponse<TicketAttachment[]>>('/customer/ticket/attachments');
      attachments.value = data.data || [];
    } catch {
      // handled
    }
  }

  /** Get signed URL for an attachment */
  async function getAttachmentUrl(attachmentId: string) {
    const data = await api.customerGet<ApiResponse<{ url: string }>>(`/customer/ticket/attachments/${attachmentId}/signed-url`);
    return data.data?.url || null;
  }

  /** Fetch semua data sekaligus */
  async function fetchAllData() {
    isLoading.value = true;
    try {
      await Promise.all([
        fetchTicketDetail(),
        fetchTimeline(),
        fetchQuotation(),
        fetchAttachments(),
      ]);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    isSessionActive,
    ticket,
    timeline,
    quotation,
    attachments,
    isLoading,
    loginError,
    // Computed
    isCompleted,
    ticketNumber,
    // Actions
    login,
    checkSession,
    logout,
    fetchTicketDetail,
    fetchTimeline,
    fetchQuotation,
    submitNegotiation,
    fetchAttachments,
    getAttachmentUrl,
    fetchAllData,
  };
});
