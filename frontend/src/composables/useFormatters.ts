import { TicketStatus } from '@shared/types/index';

// ─── Rupiah Currency Format ─────────────────────────────────────────────────
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Indonesian Date/Time ───────────────────────────────────────────────────
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  return formatDate(dateStr);
}

// ─── Ticket Status Mapping ──────────────────────────────────────────────────
interface StatusInfo {
  label: string;
  badgeClass: string;
  color: string;
  bgColor: string;
  icon: string;
  description: string;
}

const STATUS_MAP: Record<TicketStatus, StatusInfo> = {
  [TicketStatus.INTAKE]: {
    label: 'Intake',
    badgeClass: 'badge-intake',
    color: '#60a5fa',
    bgColor: 'rgba(96, 165, 250, 0.1)',
    icon: 'clipboard-list',
    description: 'Unit baru diterima',
  },
  [TicketStatus.WAITING_ASSIGNMENT]: {
    label: 'Menunggu Teknisi',
    badgeClass: 'badge-waiting-assignment',
    color: '#fbbf24',
    bgColor: 'rgba(251, 191, 36, 0.1)',
    icon: 'user-search',
    description: 'Menunggu penugasan teknisi',
  },
  [TicketStatus.INSPECTION]: {
    label: 'Pemeriksaan',
    badgeClass: 'badge-inspection',
    color: '#818cf8',
    bgColor: 'rgba(129, 140, 248, 0.1)',
    icon: 'search',
    description: 'Sedang diperiksa teknisi',
  },
  [TicketStatus.WAITING_PARTS]: {
    label: 'Menunggu Suku Cadang',
    badgeClass: 'badge-waiting-parts',
    color: '#fb923c',
    bgColor: 'rgba(251, 146, 60, 0.1)',
    icon: 'package',
    description: 'Menunggu suku cadang tersedia',
  },
  [TicketStatus.IN_REPAIR]: {
    label: 'Sedang Diperbaiki',
    badgeClass: 'badge-in-repair',
    color: '#c084fc',
    bgColor: 'rgba(192, 132, 252, 0.1)',
    icon: 'wrench',
    description: 'Proses perbaikan sedang berlangsung',
  },
  [TicketStatus.QUALITY_CHECK]: {
    label: 'Quality Check',
    badgeClass: 'badge-quality-check',
    color: '#22d3ee',
    bgColor: 'rgba(34, 211, 238, 0.1)',
    icon: 'check-circle',
    description: 'Pemeriksaan kualitas oleh admin',
  },
  [TicketStatus.READY_FOR_PICKUP]: {
    label: 'Siap Diambil',
    badgeClass: 'badge-ready-for-pickup',
    color: '#00ff66',
    bgColor: 'rgba(0, 255, 102, 0.1)',
    icon: 'phone-call',
    description: 'Unit siap diambil pelanggan',
  },
  [TicketStatus.COMPLETED]: {
    label: 'Selesai',
    badgeClass: 'badge-completed',
    color: '#34d399',
    bgColor: 'rgba(52, 211, 153, 0.1)',
    icon: 'check-circle-2',
    description: 'Servis selesai, unit telah diserahkan',
  },
  [TicketStatus.CANCELLED]: {
    label: 'Dibatalkan',
    badgeClass: 'badge-cancelled',
    color: '#f87171',
    bgColor: 'rgba(248, 113, 113, 0.1)',
    icon: 'x-circle',
    description: 'Tiket dibatalkan',
  },
  [TicketStatus.NOT_PROCEEDED]: {
    label: 'Tidak Dilanjutkan',
    badgeClass: 'badge-not-proceeded',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    icon: 'minus-circle',
    description: 'Pelanggan memilih tidak melanjutkan perbaikan',
  },
};

export function getStatusInfo(status: TicketStatus): StatusInfo {
  return STATUS_MAP[status] || {
    label: status,
    badgeClass: 'badge',
    color: '#9ca3af',
    bgColor: 'rgba(156, 163, 175, 0.1)',
    icon: 'help-circle',
    description: status,
  };
}

export function getStatusLabel(status: TicketStatus): string {
  return getStatusInfo(status).label;
}

export function getStatusBadgeClass(status: TicketStatus): string {
  return getStatusInfo(status).badgeClass;
}

// ─── Phone Number Formatter ─────────────────────────────────────────────────
export function formatPhoneDisplay(e164: string): string {
  if (!e164) return '-';
  // +628xxx -> 08xxx
  if (e164.startsWith('+62')) {
    const local = '0' + e164.slice(3);
    return local.replace(/(\d{4})(\d{4})(\d+)/, '$1-$2-$3');
  }
  return e164;
}

// ─── Device Type Label ──────────────────────────────────────────────────────
export function getDeviceTypeLabel(type: string): string {
  const map: Record<string, string> = {
    SMARTPHONE: 'Smartphone',
    LAPTOP: 'Laptop',
    OTHER: 'Lainnya',
  };
  return map[type] || type;
}

// ─── Truncate Text ──────────────────────────────────────────────────────────
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
