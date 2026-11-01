<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerStore } from '@/stores/customerStore';

const router = useRouter();
const customerStore = useCustomerStore();

const ticketNumber = ref('');
const phoneNumber = ref('');
const isSubmitting = ref(false);

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('08')) {
    cleaned = '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('628')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

async function handleLogin() {
  if (!ticketNumber.value || !phoneNumber.value) return;
  isSubmitting.value = true;

  const phoneE164 = normalizePhone(phoneNumber.value);
  const success = await customerStore.login(ticketNumber.value.toUpperCase(), phoneE164);

  if (success) {
    router.push('/customer/monitor');
  }
  isSubmitting.value = false;
}

async function quickCheck(ticket: string, phone: string) {
  ticketNumber.value = ticket;
  phoneNumber.value = phone;
  await handleLogin();
}
</script>

<template>
  <div class="py-8 animate-fade-in">
    <!-- Hero -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-neon-500/10 border border-neon-500/20 flex items-center justify-center mx-auto mb-4 animate-glow">
        <svg class="w-8 h-8 text-neon-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-aris-white">Cek Status Perbaikan</h1>
      <p class="text-sm text-aris-muted mt-2 max-w-sm mx-auto">
        Masukkan nomor tiket dan nomor WhatsApp yang terdaftar untuk memantau progres perbaikan unit Anda.
      </p>
    </div>

    <!-- Login Card -->
    <div class="glass-strong p-6 max-w-sm mx-auto animate-slide-up">
      <form @submit.prevent="handleLogin" class="space-y-5">
        <!-- Ticket Number -->
        <div>
          <label class="label" for="ticket">Nomor Tiket</label>
          <div class="relative">
            <input
              id="ticket"
              v-model="ticketNumber"
              type="text"
              class="input pl-10 font-mono uppercase"
              placeholder="SRV-2026110001"
              required
            />
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
          </div>
        </div>

        <!-- Phone Number -->
        <div>
          <label class="label" for="phone">Nomor WhatsApp</label>
          <div class="relative">
            <input
              id="phone"
              v-model="phoneNumber"
              type="tel"
              class="input pl-10"
              placeholder="08xxxxxxxxxx"
              required
            />
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
            </svg>
          </div>
          <p class="text-xs text-aris-muted/60 mt-1">Nomor yang didaftarkan saat penyerahan unit</p>
        </div>

        <!-- Error -->
        <div v-if="customerStore.loginError" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
          {{ customerStore.loginError }}
        </div>

        <!-- Submit -->
        <button
          type="submit"
          :disabled="isSubmitting || !ticketNumber || !phoneNumber"
          class="btn-primary w-full"
        >
          <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {{ isSubmitting ? 'Memverifikasi...' : 'Cek Status' }}
        </button>
      </form>
    </div>

    <!-- Demo Quick Fill Helper -->
    <div class="mt-6 p-4 rounded-xl bg-neon-500/[0.04] border border-neon-500/20 max-w-sm mx-auto">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-neon-400 uppercase tracking-wider flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-neon-400"></span>
          Contoh Tiket Demo
        </span>
        <span class="text-[10px] text-aris-muted">Klik untuk Coba</span>
      </div>
      <div class="grid grid-cols-1 gap-2">
        <button
          type="button"
          @click="quickCheck('AC-2026-000001', '081234567890')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <div class="text-left">
            <span class="font-mono text-neon-400 font-bold">AC-2026-000001</span>
            <span class="block text-[10px] text-aris-muted">Rahmat • Menunggu Teknisi</span>
          </div>
          <span class="text-[10px] text-neon-400">Pilih →</span>
        </button>
        <button
          type="button"
          @click="quickCheck('AC-2026-000002', '085712345678')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <div class="text-left">
            <span class="font-mono text-neon-400 font-bold">AC-2026-000002</span>
            <span class="block text-[10px] text-aris-muted">Siti • Pemeriksaan (Budi)</span>
          </div>
          <span class="text-[10px] text-neon-400">Pilih →</span>
        </button>
        <button
          type="button"
          @click="quickCheck('AC-2026-000003', '081987654321')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <div class="text-left">
            <span class="font-mono text-neon-400 font-bold">AC-2026-000003</span>
            <span class="block text-[10px] text-aris-muted">Dewi • Sedang Diperbaiki + Quotation</span>
          </div>
          <span class="text-[10px] text-neon-400">Pilih →</span>
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="text-center mt-6">
      <p class="text-xs text-aris-muted/40">
        Nomor tiket tertera pada tanda terima yang diberikan saat penyerahan unit.
      </p>
    </div>

    <!-- Staff Login Link -->
    <div class="text-center mt-6">
      <router-link to="/login" class="text-xs text-aris-muted hover:text-neon-400 transition-colors">
        Login Staff →
      </router-link>
    </div>
  </div>
</template>
