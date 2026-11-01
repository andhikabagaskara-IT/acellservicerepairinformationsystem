import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { createClient } from '@supabase/supabase-js';
import type { Profile } from '@shared/types/index';
import { UserRole } from '@shared/types/index';
import { isMockMode } from '@/mock/mockServer';
import { MOCK_STAFF_CREDENTIALS } from '@/mock/mockData';

// Supabase client for auth only (frontend)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey && !isMockMode())
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const useAuthStore = defineStore('auth', () => {
  // ─── State ──────────────────────────────────────────────────────────────────
  const accessToken = ref<string | null>(null);
  const profile = ref<Profile | null>(null);
  const isLoading = ref(true);
  const authError = ref<string | null>(null);

  // ─── Computed ───────────────────────────────────────────────────────────────
  const isAuthenticated = computed(() => !!accessToken.value && !!profile.value);
  const isAdmin = computed(() => profile.value?.role === UserRole.ADMIN);
  const isTechnician = computed(() => profile.value?.role === UserRole.TECHNICIAN);
  const userName = computed(() => profile.value?.full_name || 'User');
  const userRole = computed(() => profile.value?.role || null);

  // ─── Actions ────────────────────────────────────────────────────────────────

  /** Fetch profile dari backend setelah login */
  async function fetchProfile() {
    if (!accessToken.value) return;
    try {
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });
      if (res.ok) {
        const data = await res.json();
        profile.value = data.data;
      } else {
        profile.value = null;
        authError.value = 'Gagal memuat profil pengguna.';
      }
    } catch {
      authError.value = 'Tidak dapat terhubung ke server.';
    }
  }

  /** Login dengan email & password */
  async function signIn(email: string, password: string) {
    authError.value = null;
    isLoading.value = true;

    // ─── Mock Mode Login ────────────────────────────────────────────────────
    if (isMockMode()) {
      await new Promise((r) => setTimeout(r, 200));
      const cleanEmail = email.toLowerCase().trim();
      const staff = MOCK_STAFF_CREDENTIALS[cleanEmail];

      if (staff && staff.password === password) {
        profile.value = staff.profile;
        accessToken.value = `mock-token-${staff.profile.id}`;
        sessionStorage.setItem('aris_mock_staff', JSON.stringify(staff.profile));
        sessionStorage.setItem('aris_mock_token', accessToken.value);
        isLoading.value = false;
        return true;
      }

      authError.value = 'Email atau password salah. (Periksa account_set.txt)';
      isLoading.value = false;
      return false;
    }

    // ─── Live Supabase Auth ─────────────────────────────────────────────────
    if (!supabase) {
      authError.value = 'Supabase belum dikonfigurasi. Periksa file .env Anda (VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY).';
      isLoading.value = false;
      return false;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        authError.value = error.message === 'Invalid login credentials'
          ? 'Email atau password salah.'
          : error.message;
        return false;
      }
      accessToken.value = data.session?.access_token || null;
      await fetchProfile();
      return true;
    } catch {
      authError.value = 'Terjadi kesalahan saat login.';
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  /** Logout */
  async function signOut() {
    if (isMockMode()) {
      sessionStorage.removeItem('aris_mock_staff');
      sessionStorage.removeItem('aris_mock_token');
    } else if (supabase) {
      await supabase.auth.signOut();
    }
    accessToken.value = null;
    profile.value = null;
    authError.value = null;
  }

  /** Inisialisasi dari existing session (on app load) */
  async function initializeAuth() {
    isLoading.value = true;

    if (isMockMode()) {
      const savedStaff = sessionStorage.getItem('aris_mock_staff');
      const savedToken = sessionStorage.getItem('aris_mock_token');
      if (savedStaff && savedToken) {
        profile.value = JSON.parse(savedStaff);
        accessToken.value = savedToken;
      }
      isLoading.value = false;
      return;
    }

    if (!supabase) {
      isLoading.value = false;
      return;
    }

    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        accessToken.value = data.session.access_token;
        await fetchProfile();
      }
    } catch {
      // No active session
    } finally {
      isLoading.value = false;
    }

    // Listen for auth state changes (token refresh, etc.)
    supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        accessToken.value = session.access_token;
        if (!profile.value) {
          fetchProfile();
        }
      } else {
        accessToken.value = null;
        profile.value = null;
      }
    });
  }

  function clearError() {
    authError.value = null;
  }

  return {
    // State
    accessToken,
    profile,
    isLoading,
    authError,
    // Computed
    isAuthenticated,
    isAdmin,
    isTechnician,
    userName,
    userRole,
    // Actions
    signIn,
    signOut,
    fetchProfile,
    initializeAuth,
    clearError,
  };
});
