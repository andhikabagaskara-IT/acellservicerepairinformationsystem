<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTechStore } from '@/stores/techStore';
import { TicketStatus } from '@shared/types/index';
import type { RepairDiagnosis, RepairQuotation, QuotationItem } from '@shared/types/index';
import {
  getStatusBadgeClass, getStatusLabel,
  formatDateTime, formatRupiah, getDeviceTypeLabel,
} from '@/composables/useFormatters';

const route = useRoute();
const router = useRouter();
const techStore = useTechStore();
const ticketId = route.params.id as string;

const isLoading = ref(true);
const activeSection = ref<'info' | 'diagnosis' | 'quotation' | 'photos' | 'status'>('info');
const actionLoading = ref(false);
const actionMsg = ref('');
const actionError = ref('');

// Diagnosis form
const diagnosisText = ref('');
const recommendedAction = ref('');
const diagVisibility = ref('PUBLIC');
const existingDiagnoses = ref<RepairDiagnosis[]>([]);

// Quotation form
const laborCost = ref(0);
const quotationItems = ref<Array<{ description: string; quantity: number; unit_price: number }>>([
  { description: '', quantity: 1, unit_price: 0 },
]);
const existingQuotation = ref<(RepairQuotation & { items: QuotationItem[] }) | null>(null);

// Status transition
const selectedNewStatus = ref('');
const statusReason = ref('');

// Update note
const noteMessage = ref('');
const noteVisibility = ref('PUBLIC');

const ticket = computed(() => techStore.currentTicket);

// Allowed status transitions for technician
const allowedTransitions = computed(() => {
  if (!ticket.value) return [];
  const t: Array<{ value: string; label: string }> = [];
  switch (ticket.value.status) {
    case TicketStatus.INSPECTION:
      t.push({ value: TicketStatus.WAITING_PARTS, label: 'Menunggu Suku Cadang' });
      t.push({ value: TicketStatus.IN_REPAIR, label: 'Mulai Perbaikan' });
      t.push({ value: TicketStatus.NOT_PROCEEDED, label: 'Tidak Dilanjutkan' });
      break;
    case TicketStatus.WAITING_PARTS:
      t.push({ value: TicketStatus.IN_REPAIR, label: 'Mulai Perbaikan' });
      break;
    case TicketStatus.IN_REPAIR:
      t.push({ value: TicketStatus.WAITING_PARTS, label: 'Menunggu Suku Cadang' });
      t.push({ value: TicketStatus.QUALITY_CHECK, label: 'Selesai → Quality Check' });
      break;
  }
  return t;
});

const quotationTotal = computed(() => {
  const partsTotal = quotationItems.value.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  return laborCost.value + partsTotal;
});

async function loadData() {
  isLoading.value = true;
  try {
    await techStore.fetchTicketDetail(ticketId);
    const [diagRes, quotRes] = await Promise.all([
      techStore.fetchDiagnoses(ticketId).catch(() => ({ data: [] })),
      techStore.fetchQuotation(ticketId).catch(() => ({ data: null })),
    ]);
    existingDiagnoses.value = (diagRes.data as RepairDiagnosis[]) || [];
    existingQuotation.value = (quotRes.data as (RepairQuotation & { items: QuotationItem[] }) | null) || null;
  } finally {
    isLoading.value = false;
  }
}

async function submitDiagnosis() {
  if (!diagnosisText.value.trim() || !recommendedAction.value.trim()) {
    actionError.value = 'Diagnosis dan rekomendasi wajib diisi.';
    return;
  }
  actionLoading.value = true;
  actionError.value = '';
  try {
    await techStore.submitDiagnosis(ticketId, diagnosisText.value, recommendedAction.value, diagVisibility.value);
    actionMsg.value = 'Diagnosis berhasil disimpan.';
    diagnosisText.value = '';
    recommendedAction.value = '';
    await loadData();
  } catch (err: unknown) {
    const e = err as { message?: string };
    actionError.value = e.message || 'Gagal menyimpan diagnosis.';
  } finally {
    actionLoading.value = false;
  }
}

function addQuotationItem() {
  quotationItems.value.push({ description: '', quantity: 1, unit_price: 0 });
}

function removeQuotationItem(index: number) {
  if (quotationItems.value.length > 1) {
    quotationItems.value.splice(index, 1);
  }
}

async function submitQuotation() {
  const validItems = quotationItems.value.filter(i => i.description.trim() && i.unit_price > 0);
  if (validItems.length === 0 && laborCost.value <= 0) {
    actionError.value = 'Minimal isi biaya jasa atau satu item suku cadang.';
    return;
  }
  actionLoading.value = true;
  actionError.value = '';
  try {
    await techStore.submitQuotation(ticketId, laborCost.value, validItems);
    actionMsg.value = 'Estimasi biaya berhasil disimpan.';
    await loadData();
  } catch (err: unknown) {
    const e = err as { message?: string };
    actionError.value = e.message || 'Gagal menyimpan estimasi biaya.';
  } finally {
    actionLoading.value = false;
  }
}

async function submitStatusChange() {
  if (!selectedNewStatus.value) return;
  actionLoading.value = true;
  actionError.value = '';
  try {
    await techStore.updateStatus(ticketId, selectedNewStatus.value, statusReason.value || undefined);
    actionMsg.value = 'Status tiket berhasil diperbarui.';
    selectedNewStatus.value = '';
    statusReason.value = '';
    await loadData();
  } catch (err: unknown) {
    const e = err as { message?: string };
    actionError.value = e.message || 'Gagal mengubah status.';
  } finally {
    actionLoading.value = false;
  }
}

async function submitNote() {
  if (!noteMessage.value.trim()) return;
  actionLoading.value = true;
  try {
    await techStore.addUpdate(ticketId, noteMessage.value, noteVisibility.value);
    noteMessage.value = '';
    actionMsg.value = 'Catatan berhasil ditambahkan.';
  } catch {
    // handled
  } finally {
    actionLoading.value = false;
  }
}

onMounted(loadData);
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
          <h1 class="text-xl font-bold font-mono text-neon-400">{{ ticket?.ticket_number || '...' }}</h1>
          <span v-if="ticket" :class="['badge', getStatusBadgeClass(ticket.status)]">{{ getStatusLabel(ticket.status) }}</span>
        </div>
        <p class="text-sm text-aris-muted mt-0.5">
          {{ ticket?.device_brand }} {{ ticket?.device_model }} — {{ ticket?.customer_name }}
        </p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin"></div>
    </div>

    <template v-else-if="ticket">
      <!-- Messages -->
      <div v-if="actionMsg" class="p-3 rounded-lg bg-neon-500/10 border border-neon-500/20 text-neon-400 text-sm animate-slide-down">
        {{ actionMsg }}
      </div>
      <div v-if="actionError" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
        {{ actionError }}
      </div>

      <!-- Section Tabs -->
      <div class="flex flex-wrap gap-2">
        <button
          v-for="sec in [
            { key: 'info', label: 'Info' },
            { key: 'diagnosis', label: 'Diagnosis' },
            { key: 'quotation', label: 'Estimasi Biaya' },
            { key: 'status', label: 'Ubah Status' },
          ]"
          :key="sec.key"
          @click="activeSection = sec.key as typeof activeSection"
          :class="[
            'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
            activeSection === sec.key
              ? 'bg-neon-500/10 text-neon-400 border border-neon-500/20'
              : 'text-aris-muted hover:text-aris-white glass-sm'
          ]"
        >
          {{ sec.label }}
        </button>
      </div>

      <!-- Info Section -->
      <div v-if="activeSection === 'info'" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="card">
            <div class="card-header"><h3 class="text-sm font-semibold">Perangkat</h3></div>
            <div class="card-body space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-aris-muted">Tipe</span><span>{{ getDeviceTypeLabel(ticket.device_type || '') }}</span></div>
              <div class="flex justify-between"><span class="text-aris-muted">Brand/Model</span><span>{{ ticket.device_brand }} {{ ticket.device_model }}</span></div>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><h3 class="text-sm font-semibold">Pelanggan</h3></div>
            <div class="card-body space-y-2 text-sm">
              <div class="flex justify-between"><span class="text-aris-muted">Nama</span><span>{{ ticket.customer_name }}</span></div>
              <div class="flex justify-between"><span class="text-aris-muted">Telepon</span><span>{{ ticket.customer_phone }}</span></div>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Keluhan</h3></div>
          <div class="card-body">
            <p class="text-sm text-aris-text whitespace-pre-wrap">{{ ticket.customer_complaint }}</p>
            <div class="divider"></div>
            <p class="text-xs text-aris-muted"><strong>Kondisi Unit:</strong> {{ ticket.intake_condition }}</p>
            <p v-if="ticket.accessories_received" class="text-xs text-aris-muted mt-1"><strong>Aksesoris:</strong> {{ ticket.accessories_received }}</p>
            <p v-if="ticket.device_pin_or_passcode" class="text-xs text-aris-muted mt-1"><strong>PIN:</strong> {{ ticket.device_pin_or_passcode }}</p>
          </div>
        </div>

        <!-- Quick Note -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Tambah Catatan</h3></div>
          <div class="card-body space-y-3">
            <textarea v-model="noteMessage" class="textarea" rows="2" placeholder="Tulis catatan atau update..."></textarea>
            <div class="flex items-center gap-3">
              <select v-model="noteVisibility" class="select w-auto">
                <option value="PUBLIC">Publik</option>
                <option value="INTERNAL">Internal</option>
              </select>
              <button @click="submitNote" :disabled="!noteMessage.trim() || actionLoading" class="btn-primary btn-sm">Kirim</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Diagnosis Section -->
      <div v-if="activeSection === 'diagnosis'" class="space-y-4">
        <!-- Existing Diagnoses -->
        <div v-if="existingDiagnoses.length > 0" class="space-y-3">
          <h3 class="text-sm font-semibold text-aris-muted uppercase tracking-wide">Diagnosis Sebelumnya</h3>
          <div v-for="d in existingDiagnoses" :key="d.id" class="glass-sm p-4">
            <p class="text-sm text-aris-text"><strong class="text-aris-white">Diagnosis:</strong> {{ d.diagnosis }}</p>
            <p class="text-sm text-aris-text mt-2"><strong class="text-aris-white">Rekomendasi:</strong> {{ d.recommended_action }}</p>
            <p class="text-xs text-aris-muted mt-2">{{ formatDateTime(d.created_at) }}</p>
          </div>
        </div>

        <!-- New Diagnosis Form -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">Buat Diagnosis Baru</h3></div>
          <div class="card-body space-y-3">
            <div>
              <label class="label">Hasil Pemeriksaan *</label>
              <textarea v-model="diagnosisText" class="textarea" rows="3" placeholder="Deskripsikan hasil pemeriksaan..."></textarea>
            </div>
            <div>
              <label class="label">Rekomendasi Tindakan *</label>
              <textarea v-model="recommendedAction" class="textarea" rows="2" placeholder="Langkah perbaikan yang direkomendasikan..."></textarea>
            </div>
            <div class="flex items-center gap-3">
              <select v-model="diagVisibility" class="select w-auto">
                <option value="PUBLIC">Publik</option>
                <option value="INTERNAL">Internal</option>
              </select>
              <button @click="submitDiagnosis" :disabled="actionLoading" class="btn-primary btn-sm">Simpan Diagnosis</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Quotation Section -->
      <div v-if="activeSection === 'quotation'" class="space-y-4">
        <!-- Existing Quotation -->
        <div v-if="existingQuotation" class="card">
          <div class="card-header flex items-center justify-between">
            <h3 class="text-sm font-semibold">Estimasi Biaya (Versi {{ existingQuotation.version }})</h3>
            <span :class="['badge', existingQuotation.status === 'PUBLISHED' ? 'badge-completed' : 'badge-waiting-assignment']">
              {{ existingQuotation.status }}
            </span>
          </div>
          <div class="card-body">
            <table class="table-dark">
              <thead><tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th></tr></thead>
              <tbody>
                <tr v-for="item in existingQuotation.items" :key="item.id">
                  <td>{{ item.description }}</td>
                  <td class="text-right">{{ item.quantity }}</td>
                  <td class="text-right">{{ formatRupiah(item.unit_price) }}</td>
                  <td class="text-right">{{ formatRupiah(item.line_total) }}</td>
                </tr>
              </tbody>
            </table>
            <div class="flex justify-end gap-6 pt-3 text-sm border-t border-white/[0.06] mt-3">
              <div><span class="text-aris-muted">Jasa: </span><span>{{ formatRupiah(existingQuotation.labor_cost) }}</span></div>
              <div><span class="text-aris-muted">Total: </span><span class="text-neon-400 font-bold">{{ formatRupiah(existingQuotation.total_cost) }}</span></div>
            </div>
          </div>
        </div>

        <!-- Quotation Form -->
        <div class="card">
          <div class="card-header"><h3 class="text-sm font-semibold">{{ existingQuotation ? 'Revisi Estimasi Biaya' : 'Buat Estimasi Biaya' }}</h3></div>
          <div class="card-body space-y-4">
            <div>
              <label class="label">Biaya Jasa (Rp)</label>
              <input v-model.number="laborCost" type="number" min="0" step="1000" class="input" placeholder="0" />
            </div>

            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="label mb-0">Suku Cadang / Material</label>
                <button @click="addQuotationItem" class="btn-ghost btn-sm text-xs text-neon-400">+ Tambah Item</button>
              </div>
              <div v-for="(item, idx) in quotationItems" :key="idx" class="flex gap-2 mb-2 items-end">
                <div class="flex-1">
                  <input v-model="item.description" type="text" class="input" :placeholder="`Item ${idx + 1}`" />
                </div>
                <div class="w-20">
                  <input v-model.number="item.quantity" type="number" min="1" class="input text-center" placeholder="Qty" />
                </div>
                <div class="w-32">
                  <input v-model.number="item.unit_price" type="number" min="0" step="1000" class="input" placeholder="Harga" />
                </div>
                <button
                  v-if="quotationItems.length > 1"
                  @click="removeQuotationItem(idx)"
                  class="btn-ghost btn-icon p-2 text-red-400"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                  </svg>
                </button>
              </div>
            </div>

            <div class="flex items-center justify-between pt-2 border-t border-white/[0.06]">
              <span class="text-sm text-aris-muted">Total Estimasi:</span>
              <span class="text-lg font-bold text-neon-400">{{ formatRupiah(quotationTotal) }}</span>
            </div>

            <button @click="submitQuotation" :disabled="actionLoading" class="btn-primary">
              {{ existingQuotation ? 'Kirim Revisi' : 'Simpan Estimasi Biaya' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Status Transition Section -->
      <div v-if="activeSection === 'status'" class="space-y-4">
        <div class="card">
          <div class="card-header">
            <h3 class="text-sm font-semibold">Ubah Status Tiket</h3>
            <p class="text-xs text-aris-muted mt-1">Status saat ini: <span class="text-neon-400">{{ getStatusLabel(ticket.status) }}</span></p>
          </div>
          <div class="card-body space-y-3">
            <div v-if="allowedTransitions.length === 0" class="text-sm text-aris-muted text-center py-4">
              Tidak ada perubahan status yang tersedia untuk status ini.
            </div>
            <template v-else>
              <div>
                <label class="label">Status Baru</label>
                <select v-model="selectedNewStatus" class="select">
                  <option value="">Pilih status...</option>
                  <option v-for="t in allowedTransitions" :key="t.value" :value="t.value">{{ t.label }}</option>
                </select>
              </div>
              <div>
                <label class="label">Catatan (opsional)</label>
                <textarea v-model="statusReason" class="textarea" rows="2" placeholder="Alasan atau catatan perubahan status..."></textarea>
              </div>
              <button @click="submitStatusChange" :disabled="!selectedNewStatus || actionLoading" class="btn-primary btn-sm">
                Perbarui Status
              </button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
