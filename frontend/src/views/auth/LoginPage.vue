<script setup lang="ts">
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const email = ref('');
const password = ref('');
const showPassword = ref(false);
const isSubmitting = ref(false);

async function handleLogin() {
  if (!email.value || !password.value) return;
  isSubmitting.value = true;
  authStore.clearError();

  const success = await authStore.signIn(email.value, password.value);

  if (success) {
    const redirect = route.query.redirect as string;
    if (redirect) {
      router.push(redirect);
    } else if (authStore.isAdmin) {
      router.push('/admin');
    } else if (authStore.isTechnician) {
      router.push('/technician');
    }
  }
  isSubmitting.value = false;
}

async function quickLogin(e: string, p: string) {
  email.value = e;
  password.value = p;
  await handleLogin();
}
</script>

<template>
  <div class="glass-strong p-8 animate-slide-up">
    <!-- Logo -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 rounded-2xl bg-neon-500/10 border border-neon-500/20 flex items-center justify-center mx-auto mb-4 animate-glow">
        <span class="text-neon-400 font-bold text-2xl">A</span>
      </div>
      <h1 class="text-2xl font-bold text-aris-white">ARIS</h1>
      <p class="text-sm text-aris-muted mt-1">Acell Service Repair Monitoring System</p>
    </div>

    <!-- Neon divider -->
    <div class="neon-line mb-8"></div>

    <!-- Login Form -->
    <form @submit.prevent="handleLogin" class="space-y-5">
      <!-- Email -->
      <div>
        <label class="label" for="email">Email</label>
        <div class="relative">
          <input
            id="email"
            v-model="email"
            type="email"
            class="input pl-10"
            placeholder="admin@acellservice.com"
            required
            autocomplete="email"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        </div>
      </div>

      <!-- Password -->
      <div>
        <label class="label" for="password">Password</label>
        <div class="relative">
          <input
            id="password"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            class="input pl-10 pr-10"
            placeholder="••••••••"
            required
            autocomplete="current-password"
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
          </svg>
          <button
            type="button"
            @click="showPassword = !showPassword"
            class="absolute right-3 top-1/2 -translate-y-1/2 text-aris-muted hover:text-aris-text transition-colors"
          >
            <svg v-if="showPassword" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l18 18"/>
            </svg>
            <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Error -->
      <div v-if="authStore.authError" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
        {{ authStore.authError }}
      </div>

      <!-- Submit -->
      <button
        type="submit"
        :disabled="isSubmitting || !email || !password"
        class="btn-primary w-full"
      >
        <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
        <span>{{ isSubmitting ? 'Memproses...' : 'Masuk' }}</span>
      </button>
    </form>

    <!-- Demo Quick Login Helper -->
    <div class="mt-6 p-4 rounded-xl bg-neon-500/[0.04] border border-neon-500/20">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs font-semibold text-neon-400 uppercase tracking-wider flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-neon-400"></span>
          Akses Cepat Demo
        </span>
        <span class="text-[10px] text-aris-muted">Offline Mock</span>
      </div>
      <p class="text-xs text-aris-muted mb-3">Klik tombol di bawah untuk login instan tanpa ketik:</p>
      <div class="grid grid-cols-1 gap-2">
        <button
          type="button"
          @click="quickLogin('admin@acellservice.com', 'AcellService2026!')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <span>👤 Login sebagai <strong>Admin (Rian)</strong></span>
          <span class="text-[10px] text-neon-400 font-mono">Masuk →</span>
        </button>
        <button
          type="button"
          @click="quickLogin('budi.tech@acellservice.com', 'AcellService2026!')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <span>🔧 Login sebagai <strong>Teknisi (Budi)</strong></span>
          <span class="text-[10px] text-neon-400 font-mono">Masuk →</span>
        </button>
        <button
          type="button"
          @click="quickLogin('andi.tech@acellservice.com', 'AcellService2026!')"
          class="btn-secondary btn-sm text-xs justify-between w-full hover:border-neon-500/40"
        >
          <span>🔧 Login sebagai <strong>Teknisi (Andi)</strong></span>
          <span class="text-[10px] text-neon-400 font-mono">Masuk →</span>
        </button>
      </div>
    </div>

    <!-- Customer Portal Link -->
    <div class="mt-6 text-center">
      <div class="divider"></div>
      <p class="text-xs text-aris-muted mb-2">Pelanggan?</p>
      <router-link to="/customer" class="text-sm text-neon-400 hover:text-neon-300 transition-colors font-medium">
        Cek Status Perbaikan →
      </router-link>
    </div>
  </div>
</template>
