<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/adminStore';
import { TicketStatus } from '@shared/types/index';
import { getStatusBadgeClass, getStatusLabel, formatDateTime } from '@/composables/useFormatters';

const router = useRouter();
const adminStore = useAdminStore();
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

const statusOptions = [
  { value: '', label: 'Semua Status' },
  ...Object.values(TicketStatus).map(s => ({ value: s, label: getStatusLabel(s) })),
];

watch(searchInput, (val) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    adminStore.setSearchQuery(val);
  }, 400);
});

function handleStatusChange(event: Event) {
  const target = event.target as HTMLSelectElement;
  adminStore.setStatusFilter(target.value as TicketStatus | '');
}

onMounted(() => {
  adminStore.fetchTickets(1);
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold">Semua Tiket</h1>
        <p class="text-sm text-aris-muted mt-1">{{ adminStore.totalTickets }} tiket ditemukan</p>
      </div>
      <router-link to="/admin/tickets/new" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M12 4v16m8-8H4"/>
        </svg>
        Buat Tiket
      </router-link>
    </div>

    <!-- Filters -->
    <div class="card">
      <div class="card-body flex flex-col sm:flex-row gap-3">
        <div class="flex-1 relative">
          <input
            v-model="searchInput"
            type="text"
            class="input pl-10"
            placeholder="Cari nomor tiket, nama pelanggan, atau perangkat..."
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
        <select
          class="select w-full sm:w-48"
          :value="adminStore.statusFilter"
          @change="handleStatusChange"
        >
          <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">
            {{ opt.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table -->
    <div class="card">
      <div class="card-body p-0">
        <div v-if="adminStore.isLoadingTickets" class="p-8 text-center">
          <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin mx-auto"></div>
        </div>

        <div v-else-if="adminStore.tickets.length === 0" class="p-8 text-center">
          <p class="text-sm text-aris-muted">Tidak ada tiket ditemukan.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table-dark">
            <thead>
              <tr>
                <th>No. Tiket</th>
                <th>Pelanggan</th>
                <th>Perangkat</th>
                <th>Keluhan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ticket in adminStore.tickets"
                :key="ticket.id"
                class="cursor-pointer"
                @click="router.push(`/admin/tickets/${ticket.id}`)"
              >
                <td>
                  <span class="font-mono text-neon-400 text-sm">{{ ticket.ticket_number }}</span>
                </td>
                <td class="text-aris-text">{{ ticket.customer?.name || '-' }}</td>
                <td class="text-aris-muted text-sm">{{ ticket.device?.brand }} {{ ticket.device?.model }}</td>
                <td>
                  <span class="text-aris-muted text-sm line-clamp-1 max-w-[200px]">{{ ticket.customer_complaint }}</span>
                </td>
                <td>
                  <span :class="['badge', getStatusBadgeClass(ticket.status)]">{{ getStatusLabel(ticket.status) }}</span>
                </td>
                <td class="text-aris-muted text-xs whitespace-nowrap">{{ formatDateTime(ticket.created_at) }}</td>
                <td>
                  <svg class="w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div v-if="adminStore.totalPages > 1" class="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
          <span class="text-xs text-aris-muted">
            Halaman {{ adminStore.currentPage }} dari {{ adminStore.totalPages }}
          </span>
          <div class="flex gap-2">
            <button
              @click="adminStore.fetchTickets(adminStore.currentPage - 1)"
              :disabled="adminStore.currentPage <= 1"
              class="btn-secondary btn-sm"
            >
              ← Sebelumnya
            </button>
            <button
              @click="adminStore.fetchTickets(adminStore.currentPage + 1)"
              :disabled="adminStore.currentPage >= adminStore.totalPages"
              class="btn-secondary btn-sm"
            >
              Selanjutnya →
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
