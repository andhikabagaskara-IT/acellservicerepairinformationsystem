import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useApi } from '@/composables/useApi';
import type {
  RepairTicket, RepairDiagnosis, RepairQuotation, QuotationItem,
  ApiResponse,
} from '@shared/types/index';

// Extended ticket for technician workspace
export interface TechTicket extends RepairTicket {
  customer_name?: string;
  customer_phone?: string;
  device_brand?: string;
  device_model?: string;
  device_type?: string;
  diagnoses?: RepairDiagnosis[];
  quotation?: RepairQuotation & { items?: QuotationItem[] };
}

export const useTechStore = defineStore('tech', () => {
  const api = useApi();

  // ─── State ──────────────────────────────────────────────────────────────────
  const assignments = ref<TechTicket[]>([]);
  const queue = ref<TechTicket[]>([]);
  const currentTicket = ref<TechTicket | null>(null);
  const isLoadingAssignments = ref(false);
  const isLoadingQueue = ref(false);

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function fetchAssignments() {
    isLoadingAssignments.value = true;
    try {
      const data = await api.get<ApiResponse<TechTicket[]>>('/technician/assignments');
      assignments.value = data.data || [];
    } catch {
      // handled
    } finally {
      isLoadingAssignments.value = false;
    }
  }

  async function fetchQueue() {
    isLoadingQueue.value = true;
    try {
      const data = await api.get<ApiResponse<TechTicket[]>>('/technician/queue');
      queue.value = data.data || [];
    } catch {
      // handled
    } finally {
      isLoadingQueue.value = false;
    }
  }

  async function fetchTicketDetail(ticketId: string) {
    try {
      const data = await api.get<ApiResponse<TechTicket>>(`/tickets/${ticketId}`);
      currentTicket.value = data.data || null;
      return data.data;
    } catch {
      return null;
    }
  }

  async function selfAssign(ticketId: string) {
    const data = await api.post<ApiResponse>(`/technician/self-assign`, { ticket_id: ticketId });
    if (data.success) {
      // Refresh both lists
      await Promise.all([fetchAssignments(), fetchQueue()]);
    }
    return data;
  }

  // ─── Diagnosis ──────────────────────────────────────────────────────────────

  async function submitDiagnosis(ticketId: string, diagnosis: string, recommendedAction: string, visibility: string = 'PUBLIC') {
    return api.post<ApiResponse>(`/tickets/${ticketId}/diagnoses`, {
      diagnosis,
      recommended_action: recommendedAction,
      visibility,
    });
  }

  async function fetchDiagnoses(ticketId: string) {
    return api.get<ApiResponse<RepairDiagnosis[]>>(`/tickets/${ticketId}/diagnoses`);
  }

  // ─── Quotation ──────────────────────────────────────────────────────────────

  async function submitQuotation(ticketId: string, laborCost: number, items: Array<{ description: string; quantity: number; unit_price: number }>) {
    return api.post<ApiResponse>(`/tickets/${ticketId}/quotation`, {
      labor_cost: laborCost,
      items,
    });
  }

  async function fetchQuotation(ticketId: string) {
    return api.get<ApiResponse<RepairQuotation & { items: QuotationItem[] }>>(`/tickets/${ticketId}/quotation`);
  }

  // ─── Status Transitions ─────────────────────────────────────────────────────

  async function updateStatus(ticketId: string, newStatus: string, reason?: string) {
    const data = await api.post<ApiResponse>(`/tickets/${ticketId}/status`, {
      new_status: newStatus,
      reason_or_note: reason,
    });
    if (data.success) {
      await fetchTicketDetail(ticketId);
    }
    return data;
  }

  // ─── Updates / Notes ────────────────────────────────────────────────────────

  async function addUpdate(ticketId: string, message: string, visibility: string = 'PUBLIC') {
    return api.post<ApiResponse>(`/tickets/${ticketId}/updates`, { message, visibility });
  }

  async function fetchUpdates(ticketId: string) {
    return api.get<ApiResponse>(`/tickets/${ticketId}/updates`);
  }

  // ─── Attachments ────────────────────────────────────────────────────────────

  async function getUploadUrl(ticketId: string, fileName: string, mimeType: string, visibility: string = 'PUBLIC') {
    return api.post<ApiResponse<{ signed_url: string; object_path: string }>>(`/tickets/${ticketId}/attachments`, {
      file_name: fileName,
      mime_type: mimeType,
      visibility,
    });
  }

  async function fetchAttachments(ticketId: string) {
    return api.get<ApiResponse>(`/tickets/${ticketId}/attachments`);
  }

  return {
    // State
    assignments,
    queue,
    currentTicket,
    isLoadingAssignments,
    isLoadingQueue,
    // Actions
    fetchAssignments,
    fetchQueue,
    fetchTicketDetail,
    selfAssign,
    submitDiagnosis,
    fetchDiagnoses,
    submitQuotation,
    fetchQuotation,
    updateStatus,
    addUpdate,
    fetchUpdates,
    getUploadUrl,
    fetchAttachments,
  };
});
