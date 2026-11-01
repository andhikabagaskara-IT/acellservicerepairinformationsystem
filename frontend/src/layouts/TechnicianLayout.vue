<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const mobileMenuOpen = ref(false);

const navItems = [
  { name: 'Pekerjaan Saya', path: '/technician', routeName: 'TechDashboard' },
  { name: 'Antrean Bebas', path: '/technician/queue', routeName: 'TechQueue' },
];

const currentRouteName = computed(() => route.name);

function isActive(routeName: string): boolean {
  return currentRouteName.value === routeName;
}

async function handleLogout() {
  await authStore.signOut();
  router.push('/login');
}
</script>

<template>
  <div class="min-h-screen bg-aris-black">
    <!-- Top Bar -->
    <header class="fixed top-0 left-0 right-0 z-50 h-14 bg-aris-dark/90 backdrop-blur-lg border-b border-white/[0.06]">
      <div class="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
        <!-- Logo & Nav -->
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-neon-500/10 border border-neon-500/20 flex items-center justify-center">
              <span class="text-neon-400 font-bold text-sm">A</span>
            </div>
            <div>
              <span class="text-sm font-bold text-aris-white">ARIS</span>
              <span class="ml-1 text-[10px] text-aris-muted uppercase tracking-wide">Teknisi</span>
            </div>
          </div>

          <!-- Desktop Nav -->
          <nav class="hidden md:flex items-center gap-1">
            <router-link
              v-for="item in navItems"
              :key="item.routeName"
              :to="item.path"
              :class="[
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
                isActive(item.routeName)
                  ? 'text-neon-400 bg-neon-500/[0.08]'
                  : 'text-aris-muted hover:text-aris-white hover:bg-white/[0.04]'
              ]"
            >
              {{ item.name }}
            </router-link>
          </nav>
        </div>

        <!-- Right: User + Logout -->
        <div class="flex items-center gap-3">
          <div class="hidden sm:flex items-center gap-2">
            <div class="w-7 h-7 rounded-full bg-neon-500/10 border border-neon-500/20 flex items-center justify-center">
              <span class="text-neon-400 text-xs font-bold">{{ authStore.userName.charAt(0) }}</span>
            </div>
            <span class="text-sm text-aris-text">{{ authStore.userName }}</span>
          </div>
          <button @click="handleLogout" class="btn-ghost btn-icon p-1.5" title="Logout">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>

          <!-- Mobile Menu Toggle -->
          <button @click="mobileMenuOpen = !mobileMenuOpen" class="md:hidden btn-ghost btn-icon p-1.5">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path v-if="!mobileMenuOpen" d="M4 6h16M4 12h16M4 18h16"/>
              <path v-else d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Mobile Nav Dropdown -->
      <Transition name="slide-down">
        <div v-if="mobileMenuOpen" class="md:hidden bg-aris-dark border-b border-white/[0.06]">
          <nav class="px-4 py-2 space-y-1">
            <router-link
              v-for="item in navItems"
              :key="item.routeName"
              :to="item.path"
              :class="[
                'block px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive(item.routeName)
                  ? 'text-neon-400 bg-neon-500/[0.08]'
                  : 'text-aris-muted hover:text-aris-white'
              ]"
              @click="mobileMenuOpen = false"
            >
              {{ item.name }}
            </router-link>
          </nav>
        </div>
      </Transition>
    </header>

    <!-- Main Content -->
    <main class="pt-14 min-h-screen">
      <div class="max-w-7xl mx-auto p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.2s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
