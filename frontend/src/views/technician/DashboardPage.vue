<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTechStore } from '@/stores/techStore';
import { getStatusBadgeClass, getStatusLabel, formatTimeAgo } from '@/composables/useFormatters';

const router = useRouter();
const techStore = useTechStore();
const activeTab = ref<'assignments' | 'queue'>('assignments');

onMounted(() => {
  techStore.fetchAssignments();
  techStore.fetchQueue();
});

async function handleSelfAssign(ticketId: string) {
  await techStore.selfAssign(ticketId);
}
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold">Dashboard Teknisi</h1>
      <p class="text-sm text-aris-muted mt-1">Kelola pekerjaan perbaikan Anda</p>
    </div>

    <!-- Tabs -->
    <div class="flex gap-2">
      <button
        @click="activeTab = 'assignments'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'assignments'
            ? 'bg-neon-500/10 text-neon-400 border border-neon-500/20'
            : 'text-aris-muted hover:text-aris-white glass-sm'
        ]"
      >
        Pekerjaan Saya
        <span v-if="techStore.assignments.length" class="ml-1.5 px-1.5 py-0.5 rounded-full bg-neon-500/20 text-neon-400 text-xs">
          {{ techStore.assignments.length }}
        </span>
      </button>
      <button
        @click="activeTab = 'queue'"
        :class="[
          'px-4 py-2 rounded-lg text-sm font-medium transition-all',
          activeTab === 'queue'
            ? 'bg-neon-500/10 text-neon-400 border border-neon-500/20'
            : 'text-aris-muted hover:text-aris-white glass-sm'
        ]"
      >
        Antrean Bebas
        <span v-if="techStore.queue.length" class="ml-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
          {{ techStore.queue.length }}
        </span>
      </button>
    </div>

    <!-- Assignments Tab -->
    <div v-if="activeTab === 'assignments'">
      <div v-if="techStore.isLoadingAssignments" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin"></div>
      </div>

      <div v-else-if="techStore.assignments.length === 0" class="card">
        <div class="card-body text-center py-8">
          <div class="w-12 h-12 rounded-xl bg-aris-surface flex items-center justify-center mx-auto mb-3">
            <svg class="w-6 h-6 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <p class="text-sm text-aris-muted">Tidak ada pekerjaan aktif saat ini.</p>
          <button @click="activeTab = 'queue'" class="btn-secondary btn-sm mt-3">Lihat Antrean Bebas</button>
        </div>
      </div>

      <div v-else class="grid gap-3">
        <div
          v-for="ticket in techStore.assignments"
          :key="ticket.id"
          class="card cursor-pointer hover:border-neon-500/20 transition-all duration-200 hover:shadow-neon-sm"
          @click="router.push(`/technician/tickets/${ticket.id}`)"
        >
          <div class="card-body">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono text-neon-400 text-sm">{{ ticket.ticket_number }}</span>
                  <span :class="['badge', getStatusBadgeClass(ticket.status)]">{{ getStatusLabel(ticket.status) }}</span>
                </div>
                <p class="text-sm text-aris-white font-medium">{{ ticket.device_brand }} {{ ticket.device_model }}</p>
                <p class="text-xs text-aris-muted mt-0.5">{{ ticket.customer_name }}</p>
                <p class="text-xs text-aris-muted/60 mt-1 line-clamp-1">{{ ticket.customer_complaint }}</p>
              </div>
              <div class="text-right flex-shrink-0">
                <p class="text-xs text-aris-muted">{{ formatTimeAgo(ticket.created_at) }}</p>
                <svg class="w-4 h-4 text-aris-muted mt-2 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Queue Tab -->
    <div v-if="activeTab === 'queue'">
      <div v-if="techStore.isLoadingQueue" class="flex justify-center py-12">
        <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin"></div>
      </div>

      <div v-else-if="techStore.queue.length === 0" class="card">
        <div class="card-body text-center py-8">
          <p class="text-sm text-aris-muted">Tidak ada tiket di antrean bebas saat ini.</p>
        </div>
      </div>

      <div v-else class="grid gap-3">
        <div v-for="ticket in techStore.queue" :key="ticket.id" class="card">
          <div class="card-body">
            <div class="flex items-start justify-between gap-4">
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="font-mono text-neon-400 text-sm">{{ ticket.ticket_number }}</span>
                  <span class="badge badge-waiting-assignment">Menunggu Teknisi</span>
                </div>
                <p class="text-sm text-aris-white font-medium">{{ ticket.device_brand }} {{ ticket.device_model }}</p>
                <p class="text-xs text-aris-muted mt-0.5">{{ ticket.customer_name }}</p>
                <p class="text-xs text-aris-muted/60 mt-1 line-clamp-2">{{ ticket.customer_complaint }}</p>
              </div>
              <button
                @click.stop="handleSelfAssign(ticket.id)"
                class="btn-primary btn-sm flex-shrink-0"
              >
                Ambil Tiket
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
