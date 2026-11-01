<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/adminStore';
import { useApi } from '@/composables/useApi';
import { TicketStatus } from '@shared/types/index';
import type { TicketStatusHistory, TicketUpdate, RepairDiagnosis, RepairQuotation, QuotationItem } from '@shared/types/index';
import {
  getStatusBadgeClass, getStatusLabel, getStatusInfo,
  formatDateTime, formatRupiah, formatPhoneDisplay, getDeviceTypeLabel,
} from '@/composables/useFormatters';

const route = useRoute();
const router = useRouter();
const adminStore = useAdminStore();
const api = useApi();
const ticketId = route.params.id as string;

const isLoading = ref(true);
const activeTab = ref<'timeline' | 'diagnosis' | 'quotation' | 'photos'>('timeline');
const statusHistory = ref<TicketStatusHistory[]>([]);
const updates = ref<TicketUpdate[]>([]);
const diagnoses = ref<RepairDiagnosis[]>([]);
const quotation = ref<(RepairQuotation & { items: QuotationItem[] }) | null>(null);

// Action modals
const showAssignModal = ref(false);
const showNoteModal = ref(false);
const selectedTechId = ref('');
const noteMessage = ref('');
const noteVisibility = ref('PUBLIC');
const actionLoading = ref(false);
const actionError = ref('');

const ticket = computed(() => adminStore.selectedTicket);

const canAssign = computed(() =>
  ticket.value && [TicketStatus.WAITING_ASSIGNMENT, TicketStatus.INTAKE].includes(ticket.value.status)
);

const canApproveQC = computed(() =>
  ticket.value?.status === TicketStatus.QUALITY_CHECK
);

const canHandover = computed(() =>
  ticket.value?.status === TicketStatus.READY_FOR_PICKUP
);

async function loadData() {
  isLoading.value = true;
  try {
    await adminStore.fetchTicketDetail(ticketId);
    // Load timeline data
    const [historyRes, updatesRes, diagRes, quotRes] = await Promise.all([
      api.get<{ data: TicketStatusHistory[] }>(`/tickets/${ticketId}/status`).catch(() => ({ data: [] })),
      api.get<{ data: TicketUpdate[] }>(`/tickets/${ticketId}/updates`).catch(() => ({ data: [] })),
      api.get<{ data: RepairDiagnosis[] }>(`/tickets/${ticketId}/diagnoses`).catch(() => ({ data: [] })),
      api.get<{ data: RepairQuotation & { items: QuotationItem[] } }>(`/tickets/${ticketId}/quotation`).catch(() => ({ data: null })),
    ]);
    statusHistory.value = historyRes.data || [];
    updates.value = updatesRes.data || [];
    diagnoses.value = diagRes.data || [];
    quotation.value = quotRes.data || null;
  } finally {
    isLoading.value = false;
  }
}

async function handleAssign() {
  if (!selectedTechId.value) return;
  actionLoading.value = true;
  actionError.value = '';
  try {
    await adminStore.assignTechnician(ticketId, selectedTechId.value);
    showAssignModal.value = false;
    await loadData();
  } catch (err: unknown) {
    const e = err as { message?: string };
    actionError.value = e.message || 'Gagal menugaskan teknisi.';
  } finally {
    actionLoading.value = false;
  }
}

async function handleApproveQC() {
  actionLoading.value = true;
  try {
    await adminStore.approveQualityCheck(ticketId);
    await loadData();
  } catch {
    // handled
  } finally {
    actionLoading.value = false;
  }
}

async function handleHandover() {
  actionLoading.value = true;
  try {
    await adminStore.confirmHandover(ticketId);
    await loadData();
  } catch {
    // handled
  } finally {
    actionLoading.value = false;
  }
}

async function submitNote() {
  if (!noteMessage.value.trim()) return;
  actionLoading.value = true;
  try {
    await adminStore.addTicketUpdate(ticketId, noteMessage.value, noteVisibility.value);
    noteMessage.value = '';
    showNoteModal.value = false;
    await loadData();
  } catch {
    // handled
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  loadData();
  adminStore.fetchTechnicians();
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex items-start gap-3">
      <button @click="router.back()" class="btn-ghost btn-icon mt-0.5">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div class="flex-1">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="text-2xl font-bold font-mono text-neon-400">{{ ticket?.ticket_number || '...' }}</h1>
          <span v-if="ticket" :class="['badge', getStatusBadgeClass(ticket.status)]">
            {{ getStatusLabel(ticket.status) }}
          </span>
        </div>
        <p class="text-sm text-aris-muted mt-1">{{ ticket?.customer?.name }} — {{ ticket?.device?.brand }} {{ ticket?.device?.model }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin"></div>
    </div>

    <template v-else-if="ticket">
      <!-- Action Buttons -->
      <div class="flex flex-wrap gap-2">
        <button v-if="canAssign" @click="showAssignModal = true" class="btn-primary btn-sm">
          Tugaskan Teknisi
        </button>
        <button v-if="canApproveQC" @click="handleApproveQC" :disabled="actionLoading" class="btn-success btn-sm">
          ✓ Approve QC
        </button>
        <button v-if="canHandover" @click="handleHandover" :disabled="actionLoading" class="btn-success btn-sm">
          Konfirmasi Serah Terima
        </button>
        <button @click="showNoteModal = true" class="btn-secondary btn-sm">
          + Catatan
        </button>
      </div>

      <!-- Info Cards Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Device Info -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Perangkat</h3></div>
          <div class="card-body space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-aris-muted">Tipe</span><span>{{ getDeviceTypeLabel(ticket.device?.device_type || '') }}</span></div>
            <div class="flex justify-between"><span class="text-aris-muted">Brand</span><span>{{ ticket.device?.brand }}</span></div>
            <div class="flex justify-between"><span class="text-aris-muted">Model</span><span>{{ ticket.device?.model }}</span></div>
            <div v-if="ticket.device?.serial_or_imei" class="flex justify-between"><span class="text-aris-muted">SN/IMEI</span><span class="font-mono text-xs">{{ ticket.device.serial_or_imei }}</span></div>
          </div>
        </div>

        <!-- Customer Info -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Pelanggan</h3></div>
          <div class="card-body space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-aris-muted">Nama</span><span>{{ ticket.customer?.name }}</span></div>
            <div class="flex justify-between"><span class="text-aris-muted">Telepon</span><span>{{ formatPhoneDisplay(ticket.customer?.phone_e164 || '') }}</span></div>
            <div v-if="ticket.customer?.email" class="flex justify-between"><span class="text-aris-muted">Email</span><span>{{ ticket.customer.email }}</span></div>
          </div>
        </div>

        <!-- Ticket Meta -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Info Tiket</h3></div>
          <div class="card-body space-y-2 text-sm">
            <div class="flex justify-between"><span class="text-aris-muted">Diterima</span><span>{{ formatDateTime(ticket.received_at || ticket.created_at) }}</span></div>
            <div class="flex justify-between"><span class="text-aris-muted">Teknisi</span><span>{{ ticket.technician?.full_name || 'Belum ditugaskan' }}</span></div>
            <div v-if="ticket.estimated_completion_at" class="flex justify-between"><span class="text-aris-muted">Estimasi</span><span>{{ formatDateTime(ticket.estimated_completion_at) }}</span></div>
          </div>
        </div>
      </div>

      <!-- Complaint & Condition -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Keluhan Pelanggan</h3></div>
          <div class="card-body"><p class="text-sm text-aris-text whitespace-pre-wrap">{{ ticket.customer_complaint }}</p></div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Kondisi Unit</h3></div>
          <div class="card-body">
            <p class="text-sm text-aris-text whitespace-pre-wrap">{{ ticket.intake_condition }}</p>
            <p v-if="ticket.accessories_received" class="text-xs text-aris-muted mt-2">Aksesoris: {{ ticket.accessories_received }}</p>
          </div>
        </div>
      </div>

      <!-- Tabs -->
      <div class="card">
        <div class="border-b border-white/[0.06] px-4">
          <nav class="flex gap-4">
            <button
              v-for="tab in (['timeline', 'diagnosis', 'quotation'] as const)"
              :key="tab"
              @click="activeTab = tab"
              :class="[
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab
                  ? 'border-neon-500 text-neon-400'
                  : 'border-transparent text-aris-muted hover:text-aris-text'
              ]"
            >
              {{ tab === 'timeline' ? 'Timeline' : tab === 'diagnosis' ? 'Diagnosis' : 'Estimasi Biaya' }}
            </button>
          </nav>
        </div>

        <div class="card-body">
          <!-- Timeline Tab -->
          <div v-if="activeTab === 'timeline'" class="space-y-4">
            <div v-if="statusHistory.length === 0 && updates.length === 0" class="text-sm text-aris-muted text-center py-4">
              Belum ada riwayat.
            </div>
            <div
              v-for="entry in statusHistory"
              :key="entry.id"
              class="flex gap-3"
            >
              <div class="flex flex-col items-center">
                <div class="w-3 h-3 rounded-full" :style="{ background: getStatusInfo(entry.new_status).color }"></div>
                <div class="w-px flex-1 bg-white/[0.06]"></div>
              </div>
              <div class="pb-4">
                <p class="text-sm">
                  <span class="font-medium text-aris-white">{{ getStatusLabel(entry.new_status) }}</span>
                  <span class="text-aris-muted"> oleh {{ entry.actor_name_snapshot }}</span>
                </p>
                <p v-if="entry.reason_or_note" class="text-xs text-aris-muted mt-0.5">{{ entry.reason_or_note }}</p>
                <p class="text-xs text-aris-muted/60 mt-0.5">{{ formatDateTime(entry.created_at) }}</p>
              </div>
            </div>
            <!-- Updates -->
            <div v-for="u in updates" :key="u.id" class="glass-sm p-3">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-medium text-aris-white">{{ u.author_name_snapshot }}</span>
                <span v-if="u.visibility === 'INTERNAL'" class="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">Internal</span>
                <span class="text-xs text-aris-muted/60 ml-auto">{{ formatDateTime(u.created_at) }}</span>
              </div>
              <p class="text-sm text-aris-text">{{ u.message }}</p>
            </div>
          </div>

          <!-- Diagnosis Tab -->
          <div v-if="activeTab === 'diagnosis'" class="space-y-3">
            <div v-if="diagnoses.length === 0" class="text-sm text-aris-muted text-center py-4">Belum ada diagnosis.</div>
            <div v-for="d in diagnoses" :key="d.id" class="glass-sm p-4">
              <h4 class="text-sm font-semibold text-aris-white mb-1">Diagnosis</h4>
              <p class="text-sm text-aris-text">{{ d.diagnosis }}</p>
              <h4 class="text-sm font-semibold text-aris-white mt-3 mb-1">Rekomendasi Tindakan</h4>
              <p class="text-sm text-aris-text">{{ d.recommended_action }}</p>
              <p class="text-xs text-aris-muted mt-2">{{ formatDateTime(d.created_at) }}</p>
            </div>
          </div>

          <!-- Quotation Tab -->
          <div v-if="activeTab === 'quotation'">
            <div v-if="!quotation" class="text-sm text-aris-muted text-center py-4">Belum ada estimasi biaya.</div>
            <div v-else class="space-y-3">
              <table class="table-dark">
                <thead>
                  <tr><th>Deskripsi</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in quotation.items" :key="item.id">
                    <td>{{ item.description }}</td>
                    <td class="text-right">{{ item.quantity }}</td>
                    <td class="text-right">{{ formatRupiah(item.unit_price) }}</td>
                    <td class="text-right">{{ formatRupiah(item.line_total) }}</td>
                  </tr>
                </tbody>
              </table>
              <div class="flex justify-end gap-6 pt-2 text-sm">
                <div><span class="text-aris-muted">Jasa: </span><span class="text-aris-white">{{ formatRupiah(quotation.labor_cost) }}</span></div>
                <div><span class="text-aris-muted">Total: </span><span class="text-neon-400 font-bold">{{ formatRupiah(quotation.total_cost) }}</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- Assign Modal -->
    <Teleport to="body">
      <div v-if="showAssignModal" class="modal-overlay" @click.self="showAssignModal = false">
        <div class="modal-content p-6 space-y-4">
          <h2 class="text-lg font-semibold text-aris-white">Tugaskan Teknisi</h2>
          <div v-if="actionError" class="text-sm text-red-400">{{ actionError }}</div>
          <select v-model="selectedTechId" class="select">
            <option value="">Pilih teknisi...</option>
            <option v-for="tech in adminStore.technicians" :key="tech.id" :value="tech.id">{{ tech.full_name }}</option>
          </select>
          <div class="flex gap-2 justify-end">
            <button @click="showAssignModal = false" class="btn-secondary btn-sm">Batal</button>
            <button @click="handleAssign" :disabled="!selectedTechId || actionLoading" class="btn-primary btn-sm">Tugaskan</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Note Modal -->
    <Teleport to="body">
      <div v-if="showNoteModal" class="modal-overlay" @click.self="showNoteModal = false">
        <div class="modal-content p-6 space-y-4">
          <h2 class="text-lg font-semibold text-aris-white">Tambah Catatan</h2>
          <textarea v-model="noteMessage" class="textarea" rows="3" placeholder="Tulis catatan..."></textarea>
          <select v-model="noteVisibility" class="select">
            <option value="PUBLIC">Publik (terlihat pelanggan)</option>
            <option value="INTERNAL">Internal (hanya staf)</option>
          </select>
          <div class="flex gap-2 justify-end">
            <button @click="showNoteModal = false" class="btn-secondary btn-sm">Batal</button>
            <button @click="submitNote" :disabled="!noteMessage.trim() || actionLoading" class="btn-primary btn-sm">Kirim</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
