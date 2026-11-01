<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const sidebarOpen = ref(true);
const mobileSidebarOpen = ref(false);

const navItems = [
  { name: 'Dashboard', path: '/admin', icon: 'grid', routeName: 'AdminDashboard' },
  { name: 'Semua Tiket', path: '/admin/tickets', icon: 'ticket', routeName: 'AdminTickets' },
  { name: 'Buat Tiket Baru', path: '/admin/tickets/new', icon: 'plus-circle', routeName: 'AdminNewTicket' },
  { name: 'Pelanggan', path: '/admin/customers', icon: 'users', routeName: 'AdminCustomers' },
];

const currentRouteName = computed(() => route.name);

function isActive(routeName: string): boolean {
  return currentRouteName.value === routeName;
}

async function handleLogout() {
  await authStore.signOut();
  router.push('/login');
}

function toggleMobileSidebar() {
  mobileSidebarOpen.value = !mobileSidebarOpen.value;
}
</script>

<template>
  <div class="min-h-screen bg-aris-black flex">
    <!-- Sidebar (Desktop) -->
    <aside
      :class="[
        'fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 bg-aris-dark border-r border-white/[0.06]',
        sidebarOpen ? 'w-64' : 'w-20'
      ]"
      class="hidden lg:flex"
    >
      <!-- Logo -->
      <div class="flex items-center gap-3 px-5 h-16 border-b border-white/[0.06]">
        <div class="w-9 h-9 rounded-lg bg-neon-500/10 border border-neon-500/20 flex items-center justify-center flex-shrink-0">
          <span class="text-neon-400 font-bold text-sm">A</span>
        </div>
        <div v-if="sidebarOpen" class="overflow-hidden">
          <h1 class="text-base font-bold text-aris-white tracking-wide">ARIS</h1>
          <p class="text-[10px] text-aris-muted uppercase tracking-widest">Admin Panel</p>
        </div>
      </div>

      <!-- Navigation -->
      <nav class="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <router-link
          v-for="item in navItems"
          :key="item.routeName"
          :to="item.path"
          :class="[
            'nav-item',
            isActive(item.routeName) ? 'active' : ''
          ]"
        >
          <span class="w-5 h-5 flex items-center justify-center flex-shrink-0">
            <svg v-if="item.icon === 'grid'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"/>
            </svg>
            <svg v-else-if="item.icon === 'ticket'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
            </svg>
            <svg v-else-if="item.icon === 'plus-circle'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <svg v-else-if="item.icon === 'users'" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"/>
            </svg>
          </span>
          <span v-if="sidebarOpen" class="truncate">{{ item.name }}</span>
        </router-link>
      </nav>

      <!-- User Profile Footer -->
      <div class="border-t border-white/[0.06] px-4 py-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full bg-neon-500/10 border border-neon-500/20 flex items-center justify-center flex-shrink-0">
            <span class="text-neon-400 text-xs font-bold">{{ authStore.userName.charAt(0) }}</span>
          </div>
          <div v-if="sidebarOpen" class="flex-1 min-w-0">
            <p class="text-sm text-aris-white truncate">{{ authStore.userName }}</p>
            <p class="text-[10px] text-aris-muted uppercase">Admin</p>
          </div>
          <button v-if="sidebarOpen" @click="handleLogout" class="btn-ghost btn-icon p-1.5" title="Logout">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Toggle Sidebar -->
      <button
        @click="sidebarOpen = !sidebarOpen"
        class="absolute -right-3 top-20 w-6 h-6 rounded-full bg-aris-surface border border-white/[0.1] flex items-center justify-center text-aris-muted hover:text-neon-400 transition-colors"
      >
        <svg class="w-3 h-3 transition-transform" :class="{ 'rotate-180': !sidebarOpen }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
    </aside>

    <!-- Mobile Header -->
    <div class="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-aris-dark/90 backdrop-blur-lg border-b border-white/[0.06] flex items-center px-4">
      <button @click="toggleMobileSidebar" class="btn-ghost btn-icon">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>
      <span class="ml-3 text-sm font-bold text-neon-400">ARIS</span>
      <span class="ml-1 text-[10px] text-aris-muted uppercase">Admin</span>
    </div>

    <!-- Mobile Sidebar Overlay -->
    <Transition name="fade">
      <div v-if="mobileSidebarOpen" class="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" @click="mobileSidebarOpen = false"></div>
    </Transition>

    <!-- Mobile Sidebar -->
    <Transition name="slide-left">
      <aside v-if="mobileSidebarOpen" class="lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-aris-dark border-r border-white/[0.06] flex flex-col">
        <div class="flex items-center gap-3 px-5 h-14 border-b border-white/[0.06]">
          <div class="w-8 h-8 rounded-lg bg-neon-500/10 border border-neon-500/20 flex items-center justify-center">
            <span class="text-neon-400 font-bold text-sm">A</span>
          </div>
          <span class="font-bold text-aris-white">ARIS Admin</span>
        </div>
        <nav class="flex-1 px-3 py-4 space-y-1">
          <router-link
            v-for="item in navItems"
            :key="item.routeName"
            :to="item.path"
            :class="['nav-item', isActive(item.routeName) ? 'active' : '']"
            @click="mobileSidebarOpen = false"
          >
            <span class="w-5 h-5">●</span>
            <span>{{ item.name }}</span>
          </router-link>
        </nav>
        <div class="border-t border-white/[0.06] px-4 py-3">
          <button @click="handleLogout" class="btn-ghost w-full text-left text-sm">Logout</button>
        </div>
      </aside>
    </Transition>

    <!-- Main Content -->
    <main
      :class="[
        'flex-1 min-h-screen transition-all duration-300',
        sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
      ]"
      class="pt-14 lg:pt-0"
    >
      <div class="p-4 lg:p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
.slide-left-enter-active,
.slide-left-leave-active {
  transition: transform 0.3s ease;
}
.slide-left-enter-from,
.slide-left-leave-to {
  transform: translateX(-100%);
}
</style>
