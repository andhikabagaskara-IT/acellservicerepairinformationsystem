<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useAdminStore } from '@/stores/adminStore';
import { formatPhoneDisplay, formatDateTime } from '@/composables/useFormatters';

const adminStore = useAdminStore();
const searchInput = ref('');
let searchTimeout: ReturnType<typeof setTimeout>;

const filteredCustomers = ref(adminStore.customers);

watch(searchInput, (val) => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    if (val.length >= 2) {
      filteredCustomers.value = adminStore.customers.filter(c =>
        c.name.toLowerCase().includes(val.toLowerCase()) ||
        c.phone_e164.includes(val)
      );
    } else {
      filteredCustomers.value = adminStore.customers;
    }
  }, 300);
});

watch(() => adminStore.customers, (val) => {
  if (!searchInput.value) filteredCustomers.value = val;
});

onMounted(() => {
  adminStore.fetchCustomers();
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold">Pelanggan</h1>
      <p class="text-sm text-aris-muted mt-1">{{ adminStore.customers.length }} pelanggan terdaftar</p>
    </div>

    <!-- Search -->
    <div class="card">
      <div class="card-body">
        <div class="relative">
          <input
            v-model="searchInput"
            type="text"
            class="input pl-10"
            placeholder="Cari nama atau nomor telepon..."
          />
          <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
        </div>
      </div>
    </div>

    <!-- Customer List -->
    <div class="card">
      <div class="card-body p-0">
        <div v-if="adminStore.isLoadingCustomers" class="p-8 text-center">
          <div class="w-8 h-8 border-2 border-neon-500/20 border-t-neon-500 rounded-full animate-spin mx-auto"></div>
        </div>

        <div v-else-if="filteredCustomers.length === 0" class="p-8 text-center">
          <p class="text-sm text-aris-muted">Tidak ada pelanggan ditemukan.</p>
        </div>

        <div v-else class="overflow-x-auto">
          <table class="table-dark">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Telepon</th>
                <th>Email</th>
                <th>Terdaftar</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="customer in filteredCustomers" :key="customer.id">
                <td>
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-neon-500/10 border border-neon-500/20 flex items-center justify-center flex-shrink-0">
                      <span class="text-neon-400 text-xs font-bold">{{ customer.name.charAt(0) }}</span>
                    </div>
                    <span class="text-aris-white font-medium">{{ customer.name }}</span>
                  </div>
                </td>
                <td>
                  <span class="text-aris-text font-mono text-sm">{{ formatPhoneDisplay(customer.phone_e164) }}</span>
                </td>
                <td>
                  <span class="text-aris-muted text-sm">{{ customer.email || '-' }}</span>
                </td>
                <td>
                  <span class="text-aris-muted text-xs">{{ formatDateTime(customer.created_at) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>
