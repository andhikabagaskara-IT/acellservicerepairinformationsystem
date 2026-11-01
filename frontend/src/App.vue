<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRoute, RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/authStore';
import AdminLayout from '@/layouts/AdminLayout.vue';
import TechnicianLayout from '@/layouts/TechnicianLayout.vue';
import CustomerLayout from '@/layouts/CustomerLayout.vue';
import AuthLayout from '@/layouts/AuthLayout.vue';

const route = useRoute();
const authStore = useAuthStore();

const layoutComponent = computed(() => {
  const layout = route.matched.find(r => r.meta.layout)?.meta.layout;
  switch (layout) {
    case 'admin': return AdminLayout;
    case 'technician': return TechnicianLayout;
    case 'customer': return CustomerLayout;
    case 'auth': return AuthLayout;
    default: return AuthLayout;
  }
});

onMounted(() => {
  authStore.initializeAuth();
});
</script>

<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>
