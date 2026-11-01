import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useApi } from '@/composables/useApi';
import type {
  RepairTicket, Customer, Device, Profile,
  ApiResponse, PaginatedResponse,
} from '@shared/types/index';
import { TicketStatus } from '@shared/types/index';

// Extended ticket with joined data
export interface TicketWithDetails extends RepairTicket {
  customer?: Customer;
  device?: Device;
  technician?: Profile;
}

export const useAdminStore = defineStore('admin', () => {
  const api = useApi();

  // ─── State ──────────────────────────────────────────────────────────────────
  const tickets = ref<TicketWithDetails[]>([]);
  const totalTickets = ref(0);
  const currentPage = ref(1);
  const perPage = ref(15);
  const totalPages = ref(1);
  const statusFilter = ref<TicketStatus | ''>('');
  const searchQuery = ref('');

  const customers = ref<Customer[]>([]);
  const technicians = ref<Profile[]>([]);
  const selectedTicket = ref<TicketWithDetails | null>(null);

  const isLoadingTickets = ref(false);
  const isLoadingCustomers = ref(false);

  // ─── Dashboard Stats ────────────────────────────────────────────────────────
  const dashboardStats = computed(() => {
    // Will be computed from a dedicated endpoint or calculated from tickets
    return {
      menungguTeknisi: tickets.value.filter(t => t.status === TicketStatus.WAITING_ASSIGNMENT).length,
      sedangDikerjakan: tickets.value.filter(t =>
        [TicketStatus.INSPECTION, TicketStatus.IN_REPAIR, TicketStatus.WAITING_PARTS].includes(t.status)
      ).length,
      qualityCheck: tickets.value.filter(t => t.status === TicketStatus.QUALITY_CHECK).length,
      siapDiambil: tickets.value.filter(t => t.status === TicketStatus.READY_FOR_PICKUP).length,
      selesai: tickets.value.filter(t => t.status === TicketStatus.COMPLETED).length,
    };
  });

  // ─── Actions ────────────────────────────────────────────────────────────────

  async function fetchTickets(page: number = 1) {
    isLoadingTickets.value = true;
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        per_page: perPage.value,
      };
      if (statusFilter.value) params.status = statusFilter.value;
      if (searchQuery.value) params.search = searchQuery.value;

      const data = await api.get<PaginatedResponse<TicketWithDetails>>('/admin/tickets', params);
      tickets.value = data.data || [];
      totalTickets.value = data.total || 0;
      totalPages.value = data.total_pages || 1;
      currentPage.value = page;
    } catch {
      // Error handled by api composable
    } finally {
      isLoadingTickets.value = false;
    }
  }

  async function fetchTicketDetail(ticketId: string) {
    try {
      const data = await api.get<ApiResponse<TicketWithDetails>>(`/tickets/${ticketId}`);
      selectedTicket.value = data.data || null;
      return data.data;
    } catch {
      return null;
    }
  }

  async function createTicket(ticketData: Record<string, unknown>) {
    const data = await api.post<ApiResponse<RepairTicket>>('/tickets', ticketData);
    if (data.data) {
      await fetchTickets(currentPage.value);
    }
    return data;
  }

  async function assignTechnician(ticketId: string, technicianId: string) {
    const data = await api.post<ApiResponse>(`/admin/tickets/${ticketId}/assign`, {
      technician_id: technicianId,
    });
    if (data.success) {
      await fetchTicketDetail(ticketId);
    }
    return data;
  }

  async function fetchCustomers() {
    isLoadingCustomers.value = true;
    try {
      const data = await api.get<ApiResponse<Customer[]>>('/customers');
      customers.value = data.data || [];
    } catch {
      // handled
    } finally {
      isLoadingCustomers.value = false;
    }
  }

  async function createCustomer(customerData: Record<string, unknown>) {
    const data = await api.post<ApiResponse<Customer>>('/customers', customerData);
    if (data.data) {
      customers.value.unshift(data.data);
    }
    return data;
  }

  async function fetchDevices(customerId: string) {
    const data = await api.get<ApiResponse<Device[]>>('/devices', { customer_id: customerId });
    return data.data || [];
  }

  async function createDevice(deviceData: Record<string, unknown>) {
    const data = await api.post<ApiResponse<Device>>('/devices', deviceData);
    return data;
  }

  async function fetchTechnicians() {
    // Fetch active technicians from /api/me endpoint or a dedicated list
    // For now, we'll use a simple approach
    try {
      const data = await api.get<ApiResponse<Profile[]>>('/admin/tickets', { technicians_only: true });
      if (data.data) {
        technicians.value = data.data as unknown as Profile[];
      }
    } catch {
      // handled
    }
  }

  // ─── Ticket Actions ─────────────────────────────────────────────────────────

  async function updateTicketStatus(ticketId: string, newStatus: TicketStatus, reason?: string) {
    return api.post<ApiResponse>(`/tickets/${ticketId}/status`, {
      new_status: newStatus,
      reason_or_note: reason,
    });
  }

  async function approveQualityCheck(ticketId: string) {
    return api.post<ApiResponse>(`/tickets/${ticketId}/quality-check`, {});
  }

  async function confirmHandover(ticketId: string) {
    return api.post<ApiResponse>(`/tickets/${ticketId}/handover`, {});
  }

  async function addTicketUpdate(ticketId: string, message: string, visibility: string = 'PUBLIC') {
    return api.post<ApiResponse>(`/tickets/${ticketId}/updates`, { message, visibility });
  }

  function setStatusFilter(status: TicketStatus | '') {
    statusFilter.value = status;
    fetchTickets(1);
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query;
    fetchTickets(1);
  }

  return {
    // State
    tickets,
    totalTickets,
    currentPage,
    perPage,
    totalPages,
    statusFilter,
    searchQuery,
    customers,
    technicians,
    selectedTicket,
    isLoadingTickets,
    isLoadingCustomers,
    // Computed
    dashboardStats,
    // Actions
    fetchTickets,
    fetchTicketDetail,
    createTicket,
    assignTechnician,
    fetchCustomers,
    createCustomer,
    fetchDevices,
    createDevice,
    fetchTechnicians,
    updateTicketStatus,
    approveQualityCheck,
    confirmHandover,
    addTicketUpdate,
    setStatusFilter,
    setSearchQuery,
  };
});
