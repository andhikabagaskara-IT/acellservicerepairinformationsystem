import { ref, onMounted, onUnmounted, watch } from 'vue';
import type { Ref } from 'vue';

interface SmartPollingOptions {
  /** Interval saat tab aktif (ms). Default: 30000 (30 detik) */
  activeInterval?: number;
  /** Interval saat tab di background (ms). Default: 120000 (2 menit) */
  backgroundInterval?: number;
  /** Auto-start polling saat composable di-mount. Default: true */
  autoStart?: boolean;
  /** Kondisi berhenti polling. Jika ref/getter bernilai true, polling dihentikan. */
  stopCondition?: Ref<boolean> | (() => boolean);
}

export function useSmartPolling(
  callback: () => Promise<void> | void,
  options: SmartPollingOptions = {}
) {
  const {
    activeInterval = 30000,
    backgroundInterval = 120000,
    autoStart = true,
    stopCondition,
  } = options;

  const isPolling = ref(false);
  let timerId: ReturnType<typeof setTimeout> | null = null;
  let isTabActive = !document.hidden;

  function shouldStop(): boolean {
    if (!stopCondition) return false;
    return typeof stopCondition === 'function' ? stopCondition() : stopCondition.value;
  }

  function getInterval(): number {
    return isTabActive ? activeInterval : backgroundInterval;
  }

  async function tick() {
    if (!isPolling.value) return;
    if (shouldStop()) {
      stop();
      return;
    }

    try {
      await callback();
    } catch {
      // Silently continue polling on error
    }

    if (isPolling.value) {
      timerId = setTimeout(tick, getInterval());
    }
  }

  function start() {
    if (isPolling.value) return;
    isPolling.value = true;
    timerId = setTimeout(tick, getInterval());
  }

  function stop() {
    isPolling.value = false;
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  }

  function restart() {
    stop();
    start();
  }

  /** Langsung eksekusi callback, lalu reset timer polling */
  async function executeNow() {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
    try {
      await callback();
    } catch {
      // ignore
    }
    if (isPolling.value) {
      timerId = setTimeout(tick, getInterval());
    }
  }

  function handleVisibilityChange() {
    isTabActive = !document.hidden;
    // Reset timer ke interval yang sesuai
    if (isPolling.value) {
      restart();
    }
  }

  // Watch stop condition
  if (stopCondition) {
    watch(stopCondition, (shouldStop) => {
      if (shouldStop) stop();
    });
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    if (autoStart) {
      start();
    }
  });

  onUnmounted(() => {
    stop();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  });

  return {
    isPolling,
    start,
    stop,
    restart,
    executeNow,
  };
}
