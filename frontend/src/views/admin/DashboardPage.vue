<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/adminStore';
import { formatTimeAgo } from '@/composables/useFormatters';
import { getStatusBadgeClass, getStatusLabel } from '@/composables/useFormatters';

const router = useRouter();
const adminStore = useAdminStore();

const statCards = [
  { key: 'menungguTeknisi', label: 'Menunggu Teknisi', color: 'yellow' },
  { key: 'sedangDikerjakan', label: 'Sedang Dikerjakan', color: 'purple' },
  { key: 'qualityCheck', label: 'Quality Check', color: 'cyan' },
  { key: 'siapDiambil', label: 'Siap Diambil', color: 'neon' },
  { key: 'selesai', label: 'Selesai', color: 'emerald' },
];

function getStatColor(color: string) {
  const map: Record<string, string> = {
    yellow: '#fbbf24',
    purple: '#c084fc',
    cyan: '#22d3ee',
    neon: '#00ff66',
    emerald: '#34d399',
  };
  return map[color] || '#00ff66';
}

onMounted(() => {
  adminStore.fetchTickets(1);
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Page Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">Dashboard</h1>
        <p class="text-sm text-aris-muted mt-1">Ringkasan status perbaikan Acell Service</p>
      </div>
      <router-link to="/admin/tickets/new" class="btn-primary">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M12 4v16m8-8H4"/>
        </svg>
        Buat Tiket
      </router-link>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <div
        v-for="stat in statCards"
        :key="stat.key"
        class="metric-card cursor-pointer hover:scale-[1.02] transition-transform duration-200"
      >
        <div class="flex items-center gap-2 mb-3">
          <div
            class="w-2 h-2 rounded-full dot-pulse"
            :style="{ background: getStatColor(stat.color) }"
          ></div>
          <span class="text-xs text-aris-muted uppercase tracking-wider">{{ stat.label }}</span>
        </div>
        <p class="text-3xl font-bold text-aris-white font-mono">
          {{ (adminStore.dashboardStats as Record<string, number>)[stat.key] || 0 }}
        </p>
      </div>
    </div>

    <!-- Recent Tickets -->
    <div class="card">
      <div class="card-header flex items-center justify-between">
        <h2 class="text-base font-semibold">Tiket Terbaru</h2>
        <router-link to="/admin/tickets" class="text-sm text-neon-400 hover:text-neon-300 transition-colors">
          Lihat Semua →
        </router-link>
      </div>
      <div class="card-body p-0">
        <!-- Loading -->
        <div v-if="adminStore.isLoadingTickets" class="p-8 text-center">
          <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin mx-auto"></div>
          <p class="text-sm text-aris-muted mt-3">Memuat data...</p>
        </div>

        <!-- Empty State -->
        <div v-else-if="adminStore.tickets.length === 0" class="p-8 text-center">
          <div class="w-12 h-12 rounded-xl bg-aris-surface flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
            </svg>
          </div>
          <p class="text-sm text-aris-muted">Belum ada tiket</p>
          <router-link to="/admin/tickets/new" class="btn-primary btn-sm mt-3">Buat Tiket Pertama</router-link>
        </div>

        <!-- Ticket List -->
        <div v-else class="overflow-x-auto">
          <table class="table-dark">
            <thead>
              <tr>
                <th>No. Tiket</th>
                <th>Pelanggan</th>
                <th>Perangkat</th>
                <th>Status</th>
                <th>Waktu</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="ticket in adminStore.tickets.slice(0, 10)"
                :key="ticket.id"
                class="cursor-pointer"
                @click="router.push(`/admin/tickets/${ticket.id}`)"
              >
                <td>
                  <span class="font-mono text-neon-400 text-sm">{{ ticket.ticket_number }}</span>
                </td>
                <td>
                  <span class="text-aris-text">{{ ticket.customer?.name || '-' }}</span>
                </td>
                <td>
                  <span class="text-aris-muted text-sm">
                    {{ ticket.device?.brand || '' }} {{ ticket.device?.model || '' }}
                  </span>
                </td>
                <td>
                  <span :class="['badge', getStatusBadgeClass(ticket.status)]">
                    {{ getStatusLabel(ticket.status) }}
                  </span>
                </td>
                <td>
                  <span class="text-aris-muted text-xs">{{ formatTimeAgo(ticket.created_at) }}</span>
                </td>
                <td>
                  <svg class="w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5l7 7-7 7"/>
                  </svg>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
