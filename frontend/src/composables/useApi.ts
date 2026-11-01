import { ref } from 'vue';
import { useAuthStore } from '@/stores/authStore';
import { isMockMode, handleMockRequest } from '@/mock/mockServer';

const BASE_URL = '/api';

interface ApiError {
  message: string;
  status: number;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
  headers?: Record<string, string>;
  withCredentials?: boolean;
}

export function useApi() {
  const loading = ref(false);
  const error = ref<ApiError | null>(null);

  async function request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {}, withCredentials = false } = options;

    loading.value = true;
    error.value = null;

    try {
      // ─── Mock Mode Interceptor ──────────────────────────────────────────
      if (isMockMode()) {
        const mockResult = handleMockRequest<T>(endpoint, method, body, params);
        if (mockResult.handled) {
          // Simulate short network delay for natural UI feel
          await new Promise((r) => setTimeout(r, 150));
          if (mockResult.status && mockResult.status >= 400) {
            const apiError: ApiError = {
              message: mockResult.error || 'Terjadi kesalahan.',
              status: mockResult.status,
            };
            error.value = apiError;
            throw apiError;
          }
          return mockResult.data as T;
        }
      }

      // Build URL with query params
      let url = `${BASE_URL}${endpoint}`;
      if (params) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, val]) => {
          if (val !== undefined && val !== null && val !== '') {
            searchParams.append(key, String(val));
          }
        });
        const qs = searchParams.toString();
        if (qs) url += `?${qs}`;
      }

      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      // Add auth token for staff endpoints
      if (!withCredentials) {
        const authStore = useAuthStore();
        const token = authStore.accessToken;
        if (token) {
          requestHeaders['Authorization'] = `Bearer ${token}`;
        }
      }

      const fetchOptions: RequestInit = {
        method,
        headers: requestHeaders,
      };

      if (body && method !== 'GET') {
        fetchOptions.body = JSON.stringify(body);
      }

      if (withCredentials) {
        fetchOptions.credentials = 'include';
      }

      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Terjadi kesalahan server' }));
        const apiError: ApiError = {
          message: errorData.error || errorData.message || `HTTP Error ${response.status}`,
          status: response.status,
        };
        error.value = apiError;
        throw apiError;
      }

      const data = await response.json();
      return data as T;
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        throw err; // Re-throw API errors
      }
      const networkError: ApiError = {
        message: 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.',
        status: 0,
      };
      error.value = networkError;
      throw networkError;
    } finally {
      loading.value = false;
    }
  }

  // Convenience methods
  const get = <T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params });

  const post = <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body });

  const put = <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body });

  const patch = <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body });

  const del = <T = unknown>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' });

  // Customer endpoints (with cookie credentials)
  const customerGet = <T = unknown>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params, withCredentials: true });

  const customerPost = <T = unknown>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: 'POST', body, withCredentials: true });

  return {
    loading,
    error,
    request,
    get,
    post,
    put,
    patch,
    del,
    customerGet,
    customerPost,
  };
}
