<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAdminStore } from '@/stores/adminStore';
import { DeviceType } from '@shared/types/index';
import type { Customer, Device } from '@shared/types/index';

const router = useRouter();
const adminStore = useAdminStore();

// ─── Form State ──────────────────────────────────────────────────────────────
const step = ref(1); // 1: Pelanggan, 2: Perangkat, 3: Detail Tiket
const isSubmitting = ref(false);
const errorMsg = ref('');
const successMsg = ref('');

// Customer
const customerSearch = ref('');
const selectedCustomer = ref<Customer | null>(null);
const showNewCustomerForm = ref(false);
const newCustomer = ref({ name: '', phone_e164: '', email: '', notes: '' });

// Device
const selectedDevice = ref<Device | null>(null);
const customerDevices = ref<Device[]>([]);
const showNewDeviceForm = ref(false);
const newDevice = ref({ device_type: 'SMARTPHONE' as string, brand: '', model: '', serial_or_imei: '', color: '' });

// Ticket
const ticketForm = ref({
  customer_complaint: '',
  intake_condition: '',
  accessories_received: '',
  device_pin_or_passcode: '',
  estimated_completion_at: '',
});

const filteredCustomers = ref<Customer[]>([]);

watch(customerSearch, (val) => {
  if (val.length >= 2) {
    filteredCustomers.value = adminStore.customers.filter(c =>
      c.name.toLowerCase().includes(val.toLowerCase()) ||
      c.phone_e164.includes(val)
    );
  } else {
    filteredCustomers.value = [];
  }
});

async function selectCustomer(customer: Customer) {
  selectedCustomer.value = customer;
  customerSearch.value = customer.name;
  filteredCustomers.value = [];
  // Load devices
  customerDevices.value = await adminStore.fetchDevices(customer.id);
  step.value = 2;
}

async function createNewCustomer() {
  errorMsg.value = '';
  if (!newCustomer.value.name || !newCustomer.value.phone_e164) {
    errorMsg.value = 'Nama dan nomor telepon wajib diisi.';
    return;
  }
  try {
    const result = await adminStore.createCustomer({
      name: newCustomer.value.name,
      phone_e164: newCustomer.value.phone_e164,
      email: newCustomer.value.email || undefined,
      notes: newCustomer.value.notes || undefined,
    });
    if (result.data) {
      selectedCustomer.value = result.data;
      showNewCustomerForm.value = false;
      customerDevices.value = [];
      step.value = 2;
    }
  } catch (err: unknown) {
    const apiErr = err as { message?: string };
    errorMsg.value = apiErr.message || 'Gagal membuat pelanggan baru.';
  }
}

async function selectDevice(device: Device) {
  selectedDevice.value = device;
  step.value = 3;
}

async function createNewDevice() {
  errorMsg.value = '';
  if (!newDevice.value.brand || !newDevice.value.model) {
    errorMsg.value = 'Brand dan model wajib diisi.';
    return;
  }
  try {
    const result = await adminStore.createDevice({
      customer_id: selectedCustomer.value!.id,
      device_type: newDevice.value.device_type,
      brand: newDevice.value.brand,
      model: newDevice.value.model,
      serial_or_imei: newDevice.value.serial_or_imei || undefined,
      color: newDevice.value.color || undefined,
    });
    if (result.data) {
      selectedDevice.value = result.data;
      showNewDeviceForm.value = false;
      step.value = 3;
    }
  } catch (err: unknown) {
    const apiErr = err as { message?: string };
    errorMsg.value = apiErr.message || 'Gagal menambah perangkat.';
  }
}

async function submitTicket() {
  errorMsg.value = '';
  if (!ticketForm.value.customer_complaint || !ticketForm.value.intake_condition) {
    errorMsg.value = 'Keluhan dan kondisi unit wajib diisi.';
    return;
  }
  isSubmitting.value = true;
  try {
    const result = await adminStore.createTicket({
      customer_id: selectedCustomer.value!.id,
      device_id: selectedDevice.value!.id,
      customer_complaint: ticketForm.value.customer_complaint,
      intake_condition: ticketForm.value.intake_condition,
      accessories_received: ticketForm.value.accessories_received || undefined,
      device_pin_or_passcode: ticketForm.value.device_pin_or_passcode || undefined,
      estimated_completion_at: ticketForm.value.estimated_completion_at || undefined,
    });
    if (result.data) {
      successMsg.value = `Tiket berhasil dibuat!`;
      setTimeout(() => router.push('/admin/tickets'), 1500);
    }
  } catch (err: unknown) {
    const apiErr = err as { message?: string };
    errorMsg.value = apiErr.message || 'Gagal membuat tiket.';
  } finally {
    isSubmitting.value = false;
  }
}

function goToStep(s: number) {
  if (s === 1) {
    selectedCustomer.value = null;
    selectedDevice.value = null;
    customerSearch.value = '';
  } else if (s === 2 && selectedCustomer.value) {
    selectedDevice.value = null;
  }
  step.value = s;
}

onMounted(() => {
  adminStore.fetchCustomers();
});
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6 animate-fade-in">
    <!-- Header -->
    <div class="flex items-center gap-3">
      <button @click="router.back()" class="btn-ghost btn-icon">
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path d="M15 19l-7-7 7-7"/>
        </svg>
      </button>
      <div>
        <h1 class="text-2xl font-bold">Buat Tiket Baru</h1>
        <p class="text-sm text-aris-muted mt-0.5">Intake unit perbaikan pelanggan</p>
      </div>
    </div>

    <!-- Steps Indicator -->
    <div class="flex items-center gap-2">
      <button
        v-for="s in 3"
        :key="s"
        @click="s < step ? goToStep(s) : null"
        :class="[
          'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
          step === s
            ? 'bg-neon-500/10 text-neon-400 border border-neon-500/20'
            : step > s
            ? 'bg-neon-500/5 text-neon-500/60 border border-neon-500/10 cursor-pointer'
            : 'bg-aris-surface text-aris-muted border border-white/[0.06]'
        ]"
      >
        <span class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
          :class="step > s ? 'bg-neon-500/20' : 'bg-white/[0.05]'"
        >
          <svg v-if="step > s" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
            <path d="M5 13l4 4L19 7"/>
          </svg>
          <span v-else>{{ s }}</span>
        </span>
        {{ s === 1 ? 'Pelanggan' : s === 2 ? 'Perangkat' : 'Detail Tiket' }}
      </button>
    </div>

    <!-- Error / Success -->
    <div v-if="errorMsg" class="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-slide-down">
      {{ errorMsg }}
    </div>
    <div v-if="successMsg" class="p-3 rounded-lg bg-neon-500/10 border border-neon-500/20 text-neon-400 text-sm animate-slide-down">
      {{ successMsg }}
    </div>

    <!-- Step 1: Pelanggan -->
    <div v-if="step === 1" class="card animate-slide-up">
      <div class="card-header">
        <h2 class="text-base font-semibold">Pilih atau Buat Pelanggan</h2>
      </div>
      <div class="card-body space-y-4">
        <div v-if="!showNewCustomerForm">
          <div class="relative">
            <input
              v-model="customerSearch"
              type="text"
              class="input pl-10"
              placeholder="Cari nama atau nomor telepon pelanggan..."
            />
            <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-aris-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
          </div>
          <!-- Search Results -->
          <div v-if="filteredCustomers.length > 0" class="mt-2 glass-sm max-h-48 overflow-y-auto divide-y divide-white/[0.04]">
            <button
              v-for="c in filteredCustomers"
              :key="c.id"
              @click="selectCustomer(c)"
              class="w-full text-left px-4 py-3 hover:bg-white/[0.04] transition-colors"
            >
              <p class="text-sm text-aris-white">{{ c.name }}</p>
              <p class="text-xs text-aris-muted">{{ c.phone_e164 }}</p>
            </button>
          </div>
          <div class="mt-3">
            <button @click="showNewCustomerForm = true" class="btn-secondary btn-sm">
              + Pelanggan Baru
            </button>
          </div>
        </div>

        <!-- New Customer Form -->
        <div v-else class="space-y-3">
          <div>
            <label class="label">Nama Lengkap *</label>
            <input v-model="newCustomer.name" type="text" class="input" placeholder="Nama pelanggan" />
          </div>
          <div>
            <label class="label">No. WhatsApp / Telepon *</label>
            <input v-model="newCustomer.phone_e164" type="tel" class="input" placeholder="08xxxxxxxxxx" />
          </div>
          <div>
            <label class="label">Email (opsional)</label>
            <input v-model="newCustomer.email" type="email" class="input" placeholder="email@example.com" />
          </div>
          <div>
            <label class="label">Catatan (opsional)</label>
            <textarea v-model="newCustomer.notes" class="textarea" rows="2" placeholder="Catatan tambahan..."></textarea>
          </div>
          <div class="flex gap-2">
            <button @click="createNewCustomer" class="btn-primary btn-sm">Simpan Pelanggan</button>
            <button @click="showNewCustomerForm = false" class="btn-secondary btn-sm">Batal</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Perangkat -->
    <div v-if="step === 2" class="card animate-slide-up">
      <div class="card-header flex items-center justify-between">
        <h2 class="text-base font-semibold">Pilih atau Tambah Perangkat</h2>
        <span class="text-xs text-aris-muted">Pelanggan: <span class="text-neon-400">{{ selectedCustomer?.name }}</span></span>
      </div>
      <div class="card-body space-y-4">
        <!-- Existing Devices -->
        <div v-if="customerDevices.length > 0 && !showNewDeviceForm" class="space-y-2">
          <button
            v-for="d in customerDevices"
            :key="d.id"
            @click="selectDevice(d)"
            class="w-full text-left glass-sm p-3 hover:bg-white/[0.04] transition-colors"
          >
            <p class="text-sm text-aris-white">{{ d.brand }} {{ d.model }}</p>
            <p class="text-xs text-aris-muted">{{ d.device_type }} {{ d.serial_or_imei ? `• ${d.serial_or_imei}` : '' }}</p>
          </button>
        </div>
        <div v-if="customerDevices.length === 0 && !showNewDeviceForm" class="text-sm text-aris-muted text-center py-4">
          Belum ada perangkat terdaftar untuk pelanggan ini.
        </div>

        <div v-if="!showNewDeviceForm">
          <button @click="showNewDeviceForm = true" class="btn-secondary btn-sm">+ Perangkat Baru</button>
        </div>

        <!-- New Device Form -->
        <div v-if="showNewDeviceForm" class="space-y-3">
          <div>
            <label class="label">Tipe Perangkat *</label>
            <select v-model="newDevice.device_type" class="select">
              <option :value="DeviceType.SMARTPHONE">Smartphone</option>
              <option :value="DeviceType.LAPTOP">Laptop</option>
              <option :value="DeviceType.OTHER">Lainnya</option>
            </select>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Brand *</label>
              <input v-model="newDevice.brand" type="text" class="input" placeholder="Samsung, Apple..." />
            </div>
            <div>
              <label class="label">Model *</label>
              <input v-model="newDevice.model" type="text" class="input" placeholder="Galaxy S24, iPhone 15..." />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="label">Serial/IMEI</label>
              <input v-model="newDevice.serial_or_imei" type="text" class="input" placeholder="Opsional" />
            </div>
            <div>
              <label class="label">Warna</label>
              <input v-model="newDevice.color" type="text" class="input" placeholder="Opsional" />
            </div>
          </div>
          <div class="flex gap-2">
            <button @click="createNewDevice" class="btn-primary btn-sm">Simpan Perangkat</button>
            <button @click="showNewDeviceForm = false" class="btn-secondary btn-sm">Batal</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Step 3: Detail Tiket -->
    <div v-if="step === 3" class="card animate-slide-up">
      <div class="card-header">
        <h2 class="text-base font-semibold">Detail Perbaikan</h2>
        <p class="text-xs text-aris-muted mt-1">
          {{ selectedCustomer?.name }} — {{ selectedDevice?.brand }} {{ selectedDevice?.model }}
        </p>
      </div>
      <div class="card-body space-y-4">
        <div>
          <label class="label">Keluhan Pelanggan *</label>
          <textarea v-model="ticketForm.customer_complaint" class="textarea" rows="3" placeholder="Deskripsikan keluhan pelanggan secara detail..."></textarea>
        </div>
        <div>
          <label class="label">Kondisi Unit Saat Diterima *</label>
          <textarea v-model="ticketForm.intake_condition" class="textarea" rows="2" placeholder="Kondisi fisik, layar, tombol, dll..."></textarea>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="label">Aksesoris Diterima</label>
            <input v-model="ticketForm.accessories_received" type="text" class="input" placeholder="Charger, casing, dll..." />
          </div>
          <div>
            <label class="label">PIN / Passcode Perangkat</label>
            <input v-model="ticketForm.device_pin_or_passcode" type="text" class="input" placeholder="Opsional" />
          </div>
        </div>
        <div>
          <label class="label">Estimasi Selesai (opsional)</label>
          <input v-model="ticketForm.estimated_completion_at" type="datetime-local" class="input" />
        </div>

        <div class="flex gap-3 pt-2">
          <button
            @click="submitTicket"
            :disabled="isSubmitting"
            class="btn-primary"
          >
            <svg v-if="isSubmitting" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {{ isSubmitting ? 'Menyimpan...' : 'Buat Tiket' }}
          </button>
          <button @click="goToStep(2)" class="btn-secondary">Kembali</button>
        </div>
      </div>
    </div>
  </div>
</template>
