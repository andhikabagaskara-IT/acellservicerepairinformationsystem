<script setup lang="ts">
import { useCustomerStore } from '@/stores/customerStore';
import { useRouter, useRoute } from 'vue-router';
import { computed } from 'vue';

const customerStore = useCustomerStore();
const router = useRouter();
const route = useRoute();

const isMonitorView = computed(() => route.name === 'CustomerMonitor');

async function handleLogout() {
  await customerStore.logout();
  router.push('/customer');
}
</script>

<template>
  <!-- Full Screen Immersive View for Monitor Page -->
  <div v-if="isMonitorView" class="min-h-screen bg-[#050806] flex justify-center text-slate-100 font-sans selection:bg-brand-neon selection:text-brand-black">
    <slot />
  </div>

  <!-- Standard View for Login / Other Customer Pages -->
  <div v-else class="min-h-screen bg-aris-black relative overflow-hidden">
    <!-- Background Effects -->
    <div class="absolute inset-0 grid-bg opacity-20 pointer-events-none"></div>
    <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-glow-radial pointer-events-none opacity-50"></div>

    <!-- Header -->
    <header class="relative z-10 bg-aris-dark/60 backdrop-blur-lg border-b border-white/[0.06]">
      <div class="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-lg bg-neon-500/10 border border-neon-500/20 flex items-center justify-center">
            <span class="text-neon-400 font-bold text-sm">A</span>
          </div>
          <div>
            <span class="text-sm font-bold text-aris-white">ARIS</span>
            <span class="ml-1 text-[10px] text-aris-muted uppercase tracking-wide">Portal</span>
          </div>
        </div>

        <div v-if="customerStore.isSessionActive" class="flex items-center gap-3">
          <span class="text-xs text-aris-muted font-mono">{{ customerStore.ticketNumber }}</span>
          <button @click="handleLogout" class="btn-ghost btn-sm text-xs">Keluar</button>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="relative z-10 min-h-[calc(100vh-56px)]">
      <div class="max-w-2xl mx-auto p-4">
        <slot />
      </div>
    </main>

    <!-- Footer -->
    <footer class="relative z-10 border-t border-white/[0.04] py-6">
      <div class="max-w-2xl mx-auto px-4 text-center">
        <p class="text-xs text-aris-muted/60">
          &copy; {{ new Date().getFullYear() }} Acell Service. Sistem monitoring perbaikan.
        </p>
      </div>
    </footer>
  </div>
</template>
