<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTechStore } from '@/stores/techStore';
import { formatTimeAgo } from '@/composables/useFormatters';

const router = useRouter();
const techStore = useTechStore();

async function handleSelfAssign(ticketId: string) {
  const result = await techStore.selfAssign(ticketId);
  if (result.success) {
    router.push(`/technician/tickets/${ticketId}`);
  }
}

onMounted(() => {
  techStore.fetchQueue();
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-ghost btn-icon">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold">Antrean Tiket Bebas</h1>
        <p class="text-sm text-aris-muted mt-1">Tiket yang belum ditugaskan ke teknisi manapun</p>
      </div>
    </div>

    <div v-if="techStore.isLoadingQueue" class="flex justify-center py-12">
      <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin"></div>
    </div>

    <div v-else-if="techStore.queue.length === 0" class="card">
      <div class="card-body text-center py-12">
        <div class="w-16 h-16 rounded-2xl bg-aris-surface flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
          </svg>
        </div>
        <p class="text-aris-muted">Antrean kosong — semua tiket sudah ditangani!</p>
      </div>
    </div>

    <div v-else class="grid gap-3 md:grid-cols-2">
      <div v-for="ticket in techStore.queue" :key="ticket.id" class="card hover:border-neon-500/20 transition-all">
        <div class="card-body space-y-3">
          <div class="flex items-center justify-between">
            <span class="font-mono text-neon-400 text-sm">{{ ticket.ticket_number }}</span>
            <span class="text-xs text-aris-muted">{{ formatTimeAgo(ticket.created_at) }}</span>
          </div>
          <div>
            <p class="text-sm font-medium text-aris-white">{{ ticket.device_brand }} {{ ticket.device_model }}</p>
            <p class="text-xs text-aris-muted">{{ ticket.customer_name }}</p>
          </div>
          <p class="text-xs text-aris-muted/80 line-clamp-2">{{ ticket.customer_complaint }}</p>
          <button @click="handleSelfAssign(ticket.id)" class="btn-primary btn-sm w-full">
            Ambil Tiket Ini
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
