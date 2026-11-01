<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useCustomerStore } from '@/stores/customerStore';
import { useSmartPolling } from '@/composables/useSmartPolling';
import { formatDateTime, formatRupiah } from '@/composables/useFormatters';
import { TicketStatus } from '@shared/types/index';

const router = useRouter();
const customerStore = useCustomerStore();

// ─── Live Clock for Mobile Status Bar ─────────────────────────────────────────
const currentTime = ref('09:41');
let clockTimer: ReturnType<typeof setInterval> | null = null;

function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  currentTime.value = `${h}:${m}`;
}

// ─── Modal State ─────────────────────────────────────────────────────────────
const showNegotiationModal = ref(false);
const offerPrice = ref<number | ''>('');
const negotiationReason = ref('budget');
const negotiationNote = ref('');
const negotiationLoading = ref(false);
const negotiationSuccess = ref(false);

const ticket = computed(() => customerStore.ticket);
const timeline = computed(() => customerStore.timeline);
const quotation = computed(() => customerStore.quotation);

// Customer & Device Identity
const customerName = computed(() => {
  const raw = ticket.value?.customer_name || 'Pelanggan';
  return raw.split(' ')[0]; // Ambil nama panggilan depan
});

const ticketNumber = computed(() => ticket.value?.ticket_number || 'TRX-00000');
const deviceName = computed(() => {
  if (!ticket.value) return 'Perangkat';
  return `${ticket.value.device_brand || ''} ${ticket.value.device_model || ''}`.trim() || 'Smartphone';
});
const deviceSpecs = computed(() => {
  const parts: string[] = [];
  if (ticket.value?.device_color) parts.push(ticket.value.device_color);
  if (ticket.value?.device_type) parts.push(ticket.value.device_type);
  return parts.join(' • ') || 'Perangkat Terdaftar';
});

const receivedTimeFormatted = computed(() => {
  if (!ticket.value) return '-';
  return formatDateTime(ticket.value.received_at || ticket.value.created_at);
});

const estimatedCost = computed(() => {
  if (quotation.value && quotation.value.total_cost) {
    return formatRupiah(quotation.value.total_cost);
  }
  return 'Menunggu Estimasi';
});

const estimatedCompletion = computed(() => {
  if (ticket.value?.estimated_completion_at) {
    return `Selesai: ${formatDateTime(ticket.value.estimated_completion_at)}`;
  }
  return 'Estimasi waktu: 1-2 hari kerja';
});

// ─── 7-Stage Pipeline Mapping ────────────────────────────────────────────────
const pipelineStages = [
  { key: TicketStatus.INTAKE, label: '1. Intake Perangkat', short: 'Intake' },
  { key: TicketStatus.WAITING_ASSIGNMENT, label: '2. Menunggu Teknisi', short: 'Antrean' },
  { key: TicketStatus.INSPECTION, label: '3. Diagnosa & Pemeriksaan', short: 'Diagnosa' },
  { key: TicketStatus.IN_REPAIR, label: '4. Perbaikan Perangkat', short: 'Perbaikan' },
  { key: TicketStatus.QUALITY_CHECK, label: '5. Quality Check', short: 'Quality Check' },
  { key: TicketStatus.READY_FOR_PICKUP, label: '6. Siap Diambil', short: 'Siap Diambil' },
  { key: TicketStatus.COMPLETED, label: '7. Selesai', short: 'Selesai' },
];

const currentStageIndex = computed(() => {
  if (!ticket.value) return 0;
  const s = ticket.value.status;
  if (s === TicketStatus.INTAKE) return 0;
  if (s === TicketStatus.WAITING_ASSIGNMENT) return 1;
  if (s === TicketStatus.INSPECTION) return 2;
  if (s === TicketStatus.WAITING_PARTS || s === TicketStatus.IN_REPAIR) return 3;
  if (s === TicketStatus.QUALITY_CHECK) return 4;
  if (s === TicketStatus.READY_FOR_PICKUP) return 5;
  if (s === TicketStatus.COMPLETED) return 6;
  return 3;
});

const currentStageNumber = computed(() => currentStageIndex.value + 1);

const progressPercent = computed(() => {
  const percentages = [15, 28, 45, 65, 80, 92, 100];
  return percentages[currentStageIndex.value] || 50;
});

// Circular gauge circumference = 2 * PI * 42 = ~264
const gaugeDashoffset = computed(() => {
  const c = 264;
  return c - (c * progressPercent.value) / 100;
});

// Current status display pill
const currentStatusBadge = computed(() => {
  if (!ticket.value) return { text: 'Memuat...', subtext: 'Sistem' };
  switch (ticket.value.status) {
    case TicketStatus.INTAKE:
      return { text: 'Unit Diterima', subtext: 'Registrasi Selesai' };
    case TicketStatus.WAITING_ASSIGNMENT:
      return { text: 'Menunggu Teknisi', subtext: 'Antrean Kerja' };
    case TicketStatus.INSPECTION:
      return { text: 'Sedang Diperiksa', subtext: 'Diagnosa Masalah' };
    case TicketStatus.WAITING_PARTS:
      return { text: 'Menunggu Suku Cadang', subtext: 'Pengadaan Part' };
    case TicketStatus.IN_REPAIR:
      return { text: 'Sedang Dikerjakan', subtext: 'Pengerjaan Komponen' };
    case TicketStatus.QUALITY_CHECK:
      return { text: 'Quality Check', subtext: 'Pengecekan QA' };
    case TicketStatus.READY_FOR_PICKUP:
      return { text: 'Siap Diambil', subtext: 'Selesai Dikerjakan' };
    case TicketStatus.COMPLETED:
      return { text: 'Servis Selesai', subtext: 'Unit Diterima' };
    case TicketStatus.CANCELLED:
      return { text: 'Dibatalkan', subtext: 'Servis Batal' };
    case TicketStatus.NOT_PROCEEDED:
      return { text: 'Tidak Dilanjutkan', subtext: 'Atas Izin Klien' };
    default:
      return { text: 'Dalam Proses', subtext: 'Perbaikan' };
  }
});

// ─── Technician Highlighted Note ─────────────────────────────────────────────
const technicianInfo = computed(() => {
  // Ambil update publik terbaru atau diagnosis terbaru
  const latestPublicUpdate = timeline.value?.updates?.find(u => u.visibility === 'PUBLIC');
  const authorName = latestPublicUpdate?.author_name_snapshot || 'Budi Santoso';
  const initials = authorName
    .split(' ')
    .map(n => n.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'AR';

  let quote = latestPublicUpdate?.message;
  if (!quote && ticket.value?.customer_complaint) {
    quote = `Unit telah diterima dengan keluhan: "${ticket.value.customer_complaint}". Sedang dalam penanganan teknisi.`;
  } else if (!quote) {
    quote = 'Sensor perangkat dan komponen sedang dalam proses pemeriksaan mendalam oleh tim teknisi.';
  }

  return {
    name: authorName,
    initials,
    role: 'Teknisi Tersertifikasi Acell',
    quote,
  };
});

// ─── Spare Parts & Labor Breakdown ──────────────────────────────────────────
const sparePartItem = computed(() => {
  if (quotation.value && quotation.value.items && quotation.value.items.length > 0) {
    const firstItem = quotation.value.items[0];
    return {
      title: firstItem.description,
      subtitle: 'Suku Cadang OEM',
      badge: 'Komponen Baru',
      price: formatRupiah(firstItem.line_total),
    };
  }
  return {
    title: 'Pemeriksaan Layar & IC',
    subtitle: 'Komponen Terverifikasi',
    badge: 'Pemeriksaan',
    price: quotation.value ? formatRupiah(quotation.value.parts_cost || 0) : 'Rp 0',
  };
});

const laborCostItem = computed(() => {
  const labor = quotation.value?.labor_cost || 0;
  return {
    title: 'Jasa & Kalibrasi',
    subtitle: 'Optimalisasi Performa',
    badge: 'Garansi 30 Hari',
    price: formatRupiah(labor),
  };
});

// ─── Smart Polling Setup ─────────────────────────────────────────────────────
useSmartPolling(
  async () => {
    await customerStore.fetchAllData();
  },
  {
    activeInterval: 30000,
    backgroundInterval: 120000,
    stopCondition: () => customerStore.isCompleted,
  }
);

// ─── Actions ─────────────────────────────────────────────────────────────────
async function handleLogout() {
  await customerStore.logout();
  router.push('/customer');
}

function openNegotiation() {
  if (quotation.value?.total_cost) {
    offerPrice.value = Math.max(0, quotation.value.total_cost - 50000);
  } else {
    offerPrice.value = '';
  }
  negotiationReason.value = 'budget';
  negotiationNote.value = '';
  negotiationSuccess.value = false;
  showNegotiationModal.value = true;
}

function closeNegotiation() {
  showNegotiationModal.value = false;
}

async function submitNegotiation() {
  negotiationLoading.value = true;
  try {
    const reasonMap: Record<string, string> = {
      budget: 'Budget terbatas',
      'unnecessary-parts': 'Ada part yang tidak perlu diganti',
      others: 'Lainnya',
    };
    const reasonText = reasonMap[negotiationReason.value] || negotiationReason.value;
    const priceText = offerPrice.value ? formatRupiah(Number(offerPrice.value)) : '-';

    const fullMsg = `[Pengajuan Negosiasi: ${priceText}] [Alasan: ${reasonText}] ${negotiationNote.value || ''}`.trim();

    await customerStore.submitNegotiation(fullMsg);
    negotiationSuccess.value = true;

    setTimeout(() => {
      closeNegotiation();
      negotiationSuccess.value = false;
    }, 1200);
  } catch {
    // handled
  } finally {
    negotiationLoading.value = false;
  }
}

onMounted(() => {
  updateClock();
  clockTimer = setInterval(updateClock, 60000);
  customerStore.fetchAllData();
});

onUnmounted(() => {
  if (clockTimer) clearInterval(clockTimer);
});
</script>

<template>
  <!-- BEGIN: MobileDeviceFrame -->
  <main class="w-full max-w-[430px] min-h-screen bg-brand-black flex flex-col relative overflow-hidden pb-32 shadow-2xl selection:bg-brand-neon selection:text-brand-black">
    <!-- Top Glow Background Atmosphere -->
    <div class="absolute top-0 left-0 right-0 h-[360px] bg-gradient-to-b from-[#113a23] via-[#0e2718] to-transparent pointer-events-none z-0"></div>
    <div class="absolute -top-16 -right-16 w-60 h-60 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none"></div>

    <!-- BEGIN: HeaderSection -->
    <header class="relative z-10 px-5 pt-4 pb-2" data-purpose="app-header">
      <!-- Status Bar Simulation -->
      <div class="flex justify-between items-center text-xs font-semibold text-emerald-100/70 tracking-tight pb-3">
        <span>{{ currentTime }}</span>
        <div class="flex items-center space-x-1.5">
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 3c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l1.9-1.9C9.36 19.64 10.63 20 12 20c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
          </svg>
          <svg class="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 4C7.31 4 3.07 5.9 0 8.98L12 21 24 8.98C20.93 5.9 16.69 4 12 4z"/>
          </svg>
          <div class="w-5 h-2.5 border border-emerald-100/70 rounded-sm p-0.5 flex items-center">
            <div class="w-full h-full bg-brand-neon rounded-2xs"></div>
          </div>
        </div>
      </div>

      <!-- User Top Bar -->
      <div class="flex items-center justify-between mt-3 py-1" data-purpose="company-branding-header">
        <div class="flex items-center space-x-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#102c1d] via-[#133822] to-brand-deepGreen border border-brand-neon/40 flex items-center justify-center shadow-glow-neon flex-shrink-0">
            <svg class="w-6 h-6 text-brand-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <div class="flex items-center space-x-1.5">
              <span class="text-lg font-extrabold tracking-tight text-white">Acell</span>
              <span class="text-lg font-extrabold tracking-tight bg-gradient-to-r from-brand-neon to-[#38ef7d] bg-clip-text text-transparent">Service</span>
            </div>
            <span class="text-[10px] font-semibold text-emerald-300/80 tracking-wider uppercase mt-0.5">ARIS • Acellservice Repair Information System</span>
          </div>
        </div>
        <div class="flex items-center space-x-1.5 bg-[#173a25]/70 border border-brand-neon/30 px-2.5 py-1 rounded-full text-[10px] font-bold text-brand-neonLight shadow-inner">
          <span class="w-1.5 h-1.5 rounded-full bg-brand-neon animate-pulse"></span>
          <span class="font-mono">{{ ticketNumber }}</span>
        </div>
      </div>

      <!-- Greeting Title Section -->
      <div class="mt-5" data-purpose="greeting-title">
        <h1 class="text-2xl font-bold tracking-tight text-white">
          Halo <span class="text-brand-neon font-extrabold">{{ customerName }}</span>,
        </h1>
        <p class="text-emerald-200/80 text-sm mt-0.5 font-normal">
          ini status perbaikan perangkat Anda
        </p>
      </div>
    </header>
    <!-- END: HeaderSection -->

    <div class="relative z-10 px-5 space-y-4 pt-1">
      <!-- BEGIN: QuickInfoCard (Cost Estimate with Dollar Icon & Negotiation Button) -->
      <section class="bg-brand-card/90 backdrop-blur-md rounded-2xl p-3.5 border border-brand-border shadow-glow-card flex items-center justify-between" data-purpose="cost-estimate-card">
        <!-- Device Info & Cost with Dollar Icon -->
        <div class="flex items-center space-x-3 min-w-0">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-deepGreen to-[#1e5433] border border-brand-neon/30 flex items-center justify-center shadow-inner text-brand-neon flex-shrink-0">
            <!-- Dollar / Currency Sign Icon -->
            <svg class="w-5 h-5 stroke-[2.2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div class="min-w-0">
            <div class="text-[11px] font-medium text-brand-muted tracking-wide truncate">Estimasi Total Biaya</div>
            <div class="text-lg font-bold tracking-tight text-white flex items-baseline space-x-1">
              <span>{{ estimatedCost }}</span>
            </div>
            <div class="flex items-center space-x-1 text-[10px] font-medium text-emerald-300/80 mt-0.5 truncate">
              <svg class="w-3 h-3 text-brand-neon flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
              <span class="truncate">{{ estimatedCompletion }}</span>
            </div>
          </div>
        </div>

        <!-- Action Button: + Ajukan Negosiasi -->
        <button
          @click="openNegotiation"
          class="bg-brand-neon hover:bg-brand-neonLight text-brand-black text-xs font-bold px-3.5 py-2.5 rounded-xl shadow-glow-neon flex items-center space-x-1.5 transition-all duration-200 active:scale-95 flex-shrink-0"
          data-purpose="modal-trigger"
        >
          <svg class="w-3.5 h-3.5 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M12 4v16m8-8H4" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Ajukan Negosiasi</span>
        </button>
      </section>
      <!-- END: QuickInfoCard -->

      <!-- BEGIN: HeroProgressCard with Circular Gauge & Pipeline -->
      <section class="bg-brand-card rounded-3xl p-5 border border-brand-border/90 shadow-glow-card relative overflow-hidden" data-purpose="active-repair-hero-card">
        <div class="absolute -right-8 -bottom-8 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <!-- Top Badges / Pills -->
        <div class="flex items-center space-x-2 mb-4">
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-brand-neon/15 text-brand-neonLight border border-brand-neon/30">
            <span class="w-1.5 h-1.5 rounded-full bg-brand-neon mr-1.5 animate-ping"></span>
            {{ currentStatusBadge.text }}
          </span>
          <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#132c1e] text-emerald-300 border border-emerald-700/40">
            {{ currentStatusBadge.subtext }}
          </span>
        </div>

        <!-- Main Body: Device Details + Circular Gauge -->
        <div class="flex items-center justify-between">
          <div class="space-y-3 max-w-[55%]">
            <div class="flex items-start space-x-3">
              <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-[#10b981] flex items-center justify-center text-brand-black shadow-md flex-shrink-0">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M3 17h14a1 1 0 001-1V6a1 1 0 00-1-1H3a1 1 0 00-1 1v10a1 1 0 001 1zm-2 3h18" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9"/>
                  <rect height="8" rx="1" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.9" width="5" x="17" y="11"/>
                  <path d="M19.5 17h.01" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2"/>
                </svg>
              </div>
              <div>
                <h2 class="text-base font-bold text-white leading-tight truncate">{{ deviceName }}</h2>
                <span class="text-xs text-brand-muted font-normal">{{ deviceSpecs }}</span>
              </div>
            </div>

            <!-- Due Date Detail -->
            <div class="pt-1">
              <div class="text-[11px] text-brand-muted uppercase tracking-wider font-semibold">Diterima Di Toko</div>
              <div class="text-sm font-bold text-slate-100 flex items-center space-x-1.5 mt-0.5">
                <svg class="w-3.5 h-3.5 text-brand-neon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
                <span class="truncate">{{ receivedTimeFormatted }}</span>
              </div>
            </div>
          </div>

          <!-- Radial Progress Meter -->
          <div class="relative w-28 h-28 flex items-center justify-center flex-shrink-0" data-purpose="progress-gauge">
            <svg class="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" fill="transparent" r="42" stroke="#182c20" stroke-width="8"></circle>
              <circle
                class="transition-all duration-1000 ease-in-out"
                cx="50"
                cy="50"
                fill="transparent"
                r="42"
                stroke="url(#emeraldGradient)"
                stroke-width="8.5"
                stroke-linecap="round"
                stroke-dasharray="264"
                :stroke-dashoffset="gaugeDashoffset"
              ></circle>
              <defs>
                <linearGradient id="emeraldGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                  <stop offset="0%" stop-color="#4ade80"></stop>
                  <stop offset="100%" stop-color="#16a34a"></stop>
                </linearGradient>
              </defs>
            </svg>
            <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span class="text-2xl font-extrabold text-white tracking-tight leading-none">
                {{ progressPercent }}<span class="text-xs text-brand-neon font-bold">%</span>
              </span>
              <span class="text-[10px] text-brand-muted font-medium mt-1">Tahap {{ currentStageNumber }} / 7</span>
            </div>
          </div>
        </div>

        <!-- BEGIN: 7-Stage Visual Pipeline Tracker -->
        <div class="mt-5 pt-4 border-t border-brand-border/60" data-purpose="7-stage-pipeline">
          <div class="flex items-center justify-between text-xs mb-3.5">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-brand-neon animate-pulse"></span>
              <span class="text-white font-bold tracking-tight">Alur Pengerjaan (7 Tahap)</span>
            </div>
            <span class="text-[11px] font-semibold text-brand-neonLight bg-brand-neon/15 px-2 py-0.5 rounded-full border border-brand-neon/30">
              Tahap {{ currentStageNumber }} dari 7
            </span>
          </div>

          <!-- Vertical Pipeline Stepper (Tahap 1 s/d 7) -->
          <div class="space-y-0 relative pl-1">
            <div
              v-for="(stage, idx) in pipelineStages"
              :key="stage.key"
              :class="[
                'flex items-center group relative pb-3',
                idx > currentStageIndex ? (idx === currentStageIndex + 1 ? 'opacity-60' : 'opacity-40') : ''
              ]"
            >
              <!-- Connecting Line -->
              <div
                v-if="idx < pipelineStages.length - 1"
                class="absolute left-3.5 top-6 bottom-0 w-[2px]"
                :class="idx < currentStageIndex ? 'bg-brand-neon' : 'bg-[#1a2e22]'"
              ></div>

              <!-- Stage 1..k: Completed State -->
              <template v-if="idx < currentStageIndex">
                <div class="w-7 h-7 rounded-full bg-brand-neon flex items-center justify-center text-brand-black shadow-glow-neon ring-2 ring-brand-black flex-shrink-0 z-10">
                  <svg class="w-3.5 h-3.5 stroke-[3]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/>
                  </svg>
                </div>
                <div class="ml-3 flex-1 flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white">{{ stage.label }}</h4>
                  <span class="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">Selesai</span>
                </div>
              </template>

              <!-- Stage Active State -->
              <template v-else-if="idx === currentStageIndex">
                <div class="w-7 h-7 rounded-full bg-brand-black border-2 border-brand-neon flex items-center justify-center shadow-glow-neon ring-4 ring-brand-neon/30 animate-pulse flex-shrink-0 z-10">
                  <span class="w-2 h-2 rounded-full bg-brand-neon"></span>
                </div>
                <div class="ml-3 flex-1 bg-gradient-to-r from-[#173a25]/70 to-[#0e2718] px-3 py-2 rounded-xl border border-brand-neon/40 shadow-glow-card flex items-center justify-between">
                  <div class="flex items-center space-x-1.5">
                    <h4 class="text-xs font-extrabold text-brand-neonLight">{{ stage.label }}</h4>
                    <span class="w-1.5 h-1.5 rounded-full bg-brand-neon animate-ping"></span>
                  </div>
                  <span class="text-[9px] font-extrabold text-brand-black bg-brand-neon px-2 py-0.5 rounded-full uppercase tracking-wider">Sedang Berlangsung</span>
                </div>
              </template>

              <!-- Stage Upcoming State -->
              <template v-else>
                <div class="w-7 h-7 rounded-full bg-[#132219] border border-brand-border flex items-center justify-center text-brand-muted text-[11px] font-bold ring-2 ring-brand-black flex-shrink-0 z-10">
                  <span>{{ idx + 1 }}</span>
                </div>
                <div class="ml-3 flex-1 flex items-center justify-between">
                  <h4 class="text-xs font-semibold text-brand-muted">{{ stage.label }}</h4>
                  <span class="text-[10px] font-medium text-zinc-500">Mendatang</span>
                </div>
              </template>
            </div>
          </div>
        </div>
        <!-- END: 7-Stage Visual Pipeline Tracker -->
      </section>
      <!-- END: HeroProgressCard -->

      <!-- BEGIN: Standout Technician Note Banner -->
      <section class="relative rounded-2xl p-[1.5px] bg-gradient-to-r from-brand-neon via-emerald-400 to-[#10b981] shadow-glow-banner overflow-hidden" data-purpose="highlighted-technician-note">
        <div class="bg-gradient-to-br from-[#102c1d] via-[#0d2217] to-[#0a1811] rounded-[15px] p-4 relative overflow-hidden">
          <!-- Glow Orb Accent in Background -->
          <div class="absolute -right-6 -bottom-6 w-28 h-28 bg-brand-neon/20 rounded-full blur-xl pointer-events-none"></div>

          <!-- Top Row: Certified Badge & Title -->
          <div class="flex items-center justify-between mb-3 relative z-10">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 rounded-full bg-brand-neon animate-ping"></span>
              <span class="text-[11px] font-extrabold uppercase tracking-wider text-brand-neonLight">Pesan &amp; Catatan Teknisi</span>
            </div>
            <!-- Verified Badge -->
            <div class="inline-flex items-center space-x-1 bg-emerald-950/90 border border-brand-neon/40 px-2 py-0.5 rounded-full text-[10px] text-brand-mint font-semibold">
              <svg class="w-3 h-3 text-brand-neon fill-current" viewBox="0 0 20 20">
                <path clip-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill-rule="evenodd"/>
              </svg>
              <span>Teknisi Tersertifikasi</span>
            </div>
          </div>

          <!-- Main Body: Avatar, Name & Bold Quote -->
          <div class="flex items-start space-x-3.5 relative z-10">
            <!-- Technician Avatar -->
            <div class="relative flex-shrink-0">
              <div class="w-11 h-11 rounded-full ring-2 ring-brand-neon/70 bg-gradient-to-tr from-emerald-800 to-brand-neon/30 flex items-center justify-center font-extrabold text-sm text-white shadow-inner">
                <span>{{ technicianInfo.initials }}</span>
              </div>
              <span class="absolute bottom-0 right-0 w-3 h-3 bg-brand-neon border-2 border-[#0d2217] rounded-full"></span>
            </div>

            <!-- Text content & Quote -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-1.5 truncate">
                <h4 class="text-xs font-bold text-white tracking-wide truncate">{{ technicianInfo.name }}</h4>
                <span class="text-[10px] text-emerald-300/70 truncate">• {{ technicianInfo.role }}</span>
              </div>
              <!-- Prominent Note Quote -->
              <div class="mt-1.5 p-2.5 rounded-xl bg-black/40 border border-emerald-500/25 backdrop-blur-sm">
                <p class="text-xs font-bold text-emerald-100 leading-snug">
                  “{{ technicianInfo.quote }}”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <!-- END: Standout Technician Note Banner -->

      <!-- BEGIN: ServiceHistorySection -->
      <section class="pt-1" data-purpose="repair-breakdown-section">
        <div class="flex items-center justify-between mb-3 px-1">
          <h3 class="text-base font-bold text-white tracking-tight">Rincian &amp; Komponen</h3>
          <span class="text-xs font-semibold text-brand-neon">Detail Biaya</span>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <!-- Card 1: Sparepart -->
          <article class="bg-brand-card p-3.5 rounded-2xl border border-brand-border/90 flex flex-col justify-between hover:border-brand-neon/40 transition-colors shadow-sm" data-purpose="history-item-1">
            <div>
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-deepGreen to-emerald-900/60 border border-brand-neon/30 flex items-center justify-center text-brand-neon mb-3 shadow-inner">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <h4 class="text-xs font-bold text-white leading-snug line-clamp-1">{{ sparePartItem.title }}</h4>
              <p class="text-[11px] text-brand-muted mt-0.5">{{ sparePartItem.subtitle }}</p>
              <div class="mt-2 text-[10px] text-emerald-400 font-medium inline-block bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                {{ sparePartItem.badge }}
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-brand-border/50 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-brand-muted block">Harga</span>
                <span class="text-xs font-bold text-white">{{ sparePartItem.price }}</span>
              </div>
              <div class="w-6 h-6 rounded-full bg-brand-charcoal flex items-center justify-center text-brand-muted">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
            </div>
          </article>

          <!-- Card 2: Service Labor -->
          <article class="bg-brand-card p-3.5 rounded-2xl border border-brand-border/90 flex flex-col justify-between hover:border-brand-neon/40 transition-colors shadow-sm" data-purpose="history-item-2">
            <div>
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-deepGreen to-emerald-900/60 border border-brand-neon/30 flex items-center justify-center text-brand-neon mb-3 shadow-inner">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
              <h4 class="text-xs font-bold text-white leading-snug">{{ laborCostItem.title }}</h4>
              <p class="text-[11px] text-brand-muted mt-0.5">{{ laborCostItem.subtitle }}</p>
              <div class="mt-2 text-[10px] text-emerald-400 font-medium inline-block bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/40">
                {{ laborCostItem.badge }}
              </div>
            </div>
            <div class="mt-4 pt-2 border-t border-brand-border/50 flex items-center justify-between">
              <div>
                <span class="text-[10px] text-brand-muted block">Biaya Jasa</span>
                <span class="text-xs font-bold text-white">{{ laborCostItem.price }}</span>
              </div>
              <div class="w-6 h-6 rounded-full bg-brand-charcoal flex items-center justify-center text-brand-muted">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 5l7 7-7 7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </div>
            </div>
          </article>
        </div>
      </section>
      <!-- END: ServiceHistorySection -->
    </div>

    <!-- BEGIN: Interactive Negotiation Modal Sheet -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showNegotiationModal"
          class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end transition-opacity duration-300"
          @click.self="closeNegotiation"
        >
          <div
            class="bg-gradient-to-b from-[#13281c] to-[#0c1611] border-t border-brand-neon/40 rounded-t-3xl p-6 space-y-4 max-w-[430px] mx-auto w-full shadow-2xl animate-slide-up"
          >
            <!-- Drag Indicator -->
            <div class="w-12 h-1 bg-brand-border/80 rounded-full mx-auto"></div>

            <!-- Modal Header -->
            <div class="flex items-center justify-between pt-1">
              <div>
                <h3 class="text-lg font-bold text-white">Ajukan Negosiasi Biaya</h3>
                <p class="text-xs text-brand-muted mt-0.5">Kirim penawaran harga Anda langsung ke teknisi</p>
              </div>
              <button
                @click="closeNegotiation"
                class="w-8 h-8 rounded-full bg-brand-card/80 border border-brand-border flex items-center justify-center text-brand-muted hover:text-white active:scale-95"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
                </svg>
              </button>
            </div>

            <!-- Current Cost Summary Pill -->
            <div class="bg-[#183925]/70 border border-brand-neon/30 rounded-xl p-3 flex items-center justify-between">
              <span class="text-xs text-emerald-200">Estimasi Biaya Saat Ini:</span>
              <span class="text-base font-extrabold text-white">{{ estimatedCost }}</span>
            </div>

            <!-- Form Elements -->
            <div class="space-y-3.5 pt-1">
              <!-- Input Tawaran Harga -->
              <div>
                <label class="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">Tawaran Harga Anda (Rp)</label>
                <div class="relative">
                  <span class="absolute left-3.5 top-2.5 text-sm font-bold text-brand-muted">Rp</span>
                  <input
                    v-model.number="offerPrice"
                    class="w-full bg-[#0a110d] border border-brand-border rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-white focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon placeholder-zinc-600"
                    placeholder="400.000"
                    type="number"
                  />
                </div>
              </div>

              <!-- Pilihan Alasan Negosiasi -->
              <div>
                <label class="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1.5">Alasan Negosiasi</label>
                <div class="grid grid-cols-1 gap-2">
                  <label class="flex items-center space-x-2.5 bg-[#0a110d]/80 border border-brand-border hover:border-brand-neon/50 px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors">
                    <input v-model="negotiationReason" value="budget" type="radio" class="text-brand-neon focus:ring-brand-neon bg-zinc-900 border-zinc-700" />
                    <span class="text-slate-200">Budget terbatas</span>
                  </label>
                  <label class="flex items-center space-x-2.5 bg-[#0a110d]/80 border border-brand-border hover:border-brand-neon/50 px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors">
                    <input v-model="negotiationReason" value="unnecessary-parts" type="radio" class="text-brand-neon focus:ring-brand-neon bg-zinc-900 border-zinc-700" />
                    <span class="text-slate-200">Ada part yang tidak perlu diganti</span>
                  </label>
                  <label class="flex items-center space-x-2.5 bg-[#0a110d]/80 border border-brand-border hover:border-brand-neon/50 px-3 py-2 rounded-xl cursor-pointer text-xs transition-colors">
                    <input v-model="negotiationReason" value="others" type="radio" class="text-brand-neon focus:ring-brand-neon bg-zinc-900 border-zinc-700" />
                    <span class="text-slate-200">Lainnya</span>
                  </label>
                </div>
              </div>

              <!-- Textarea Pesan Negosiasi -->
              <div>
                <label class="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block mb-1">Pesan / Catatan Tambahan</label>
                <textarea
                  v-model="negotiationNote"
                  class="w-full bg-[#0a110d] border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-brand-neon focus:ring-1 focus:ring-brand-neon placeholder-zinc-600 resize-none"
                  placeholder="Tuliskan catatan pertimbangan kepada teknisi..."
                  rows="2"
                ></textarea>
              </div>
            </div>

            <!-- Buttons: Cancel & Submit -->
            <div class="flex items-center space-x-3 pt-2">
              <button
                @click="closeNegotiation"
                class="flex-1 py-3 rounded-xl border border-brand-border bg-brand-charcoal text-slate-300 font-semibold text-xs hover:bg-[#152019] transition-all"
              >
                Batal
              </button>
              <button
                @click="submitNegotiation"
                :disabled="negotiationLoading"
                class="flex-[2] bg-brand-neon hover:bg-brand-neonLight text-brand-black font-extrabold py-3 rounded-xl shadow-glow-neon text-xs transition-all active:scale-95 disabled:opacity-50"
              >
                <span v-if="negotiationLoading">Mengirimkan...</span>
                <span v-else-if="negotiationSuccess">Pengajuan Terkirim ✓</span>
                <span v-else>Kirim Pengajuan</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- END: Interactive Negotiation Modal Sheet -->

    <!-- BEGIN: Redesigned Action Bottom Bar (Keluar & Hubungi Teknisi) -->
    <nav class="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-gradient-to-t from-[#060907] via-[#090f0b]/95 to-transparent pt-4 pb-6 px-5 z-40 backdrop-blur-md border-t border-brand-border/60" data-purpose="action-bottom-bar">
      <div class="flex items-center space-x-3">
        <!-- 1. Tombol "Keluar" (Dark Glass / Elegant Outline dengan Icon Logout) -->
        <button
          @click="handleLogout"
          aria-label="Keluar Aplikasi"
          class="flex items-center justify-center space-x-2 py-3.5 px-4 rounded-2xl bg-[#0f1712]/90 border border-emerald-900/60 hover:border-emerald-500/40 hover:bg-[#16241c] text-emerald-200/90 active:scale-95 transition-all text-xs font-semibold shadow-sm"
        >
          <!-- Logout Door Icon -->
          <svg class="w-4 h-4 stroke-[2.2] text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span>Keluar</span>
        </button>

        <!-- 2. Tombol "Hubungi Teknisi" (Neon Glow Standout + Online indicator + Chat Icon) -->
        <a
          href="https://wa.me/628111222333?text=Halo%20Acell%20Service,%20saya%20ingin%20menanyakan%20status%20perbaikan%20tiket%20saya"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-1 flex items-center justify-between py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-brand-neon to-[#38ef7d] text-brand-black font-extrabold text-xs shadow-glow-neon hover:brightness-105 active:scale-95 transition-all group"
        >
          <div class="flex items-center space-x-2.5">
            <!-- Chat / Headset Icon -->
            <div class="w-7 h-7 rounded-xl bg-black/15 flex items-center justify-center">
              <svg class="w-4 h-4 stroke-[2.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </div>
            <span class="tracking-wide">Hubungi Teknisi</span>
          </div>
          <!-- Online Status Pill Inside Button -->
          <div class="flex items-center space-x-1.5 bg-black/20 px-2 py-1 rounded-full text-[10px] font-bold text-black/90">
            <span class="w-1.5 h-1.5 rounded-full bg-black animate-ping"></span>
            <span>Online</span>
          </div>
        </a>
      </div>
    </nav>
    <!-- END: Redesigned Action Bottom Bar -->
  </main>
  <!-- END: MobileDeviceFrame -->
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
