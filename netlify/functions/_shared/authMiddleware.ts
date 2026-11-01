import type { HandlerEvent, HandlerResponse } from "@netlify/functions";
import { getSupabaseAdmin } from "./supabaseClient";
import { error } from "./responseHelper";

export interface StaffUser {
  id: string;
  full_name: string;
  role: "ADMIN" | "TECHNICIAN";
  phone_e164: string | null;
  is_active: boolean;
}

export interface AuthSuccess {
  user: StaffUser;
  error: null;
}

export interface AuthFailure {
  user: null;
  error: HandlerResponse;
}

export type AuthResult = AuthSuccess | AuthFailure;

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Looks up the caller's profile in the `profiles` table and ensures the
 * account is active.
 */
export async function authenticateStaff(event: HandlerEvent): Promise<AuthResult> {
  const authHeader = event.headers["authorization"] || event.headers["Authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      user: null,
      error: error("Token autentikasi tidak ditemukan. Silakan login kembali.", 401),
    };
  }

  const token = authHeader.replace("Bearer ", "").trim();
  const supabase = getSupabaseAdmin();

  // Verify the JWT against Supabase Auth
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !authUser) {
    return {
      user: null,
      error: error("Token tidak valid atau sudah kedaluwarsa. Silakan login ulang.", 401),
    };
  }

  // Fetch staff profile
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone_e164, is_active")
    .eq("id", authUser.id)
    .single();

  if (profileError || !profile) {
    return {
      user: null,
      error: error("Profil pengguna tidak ditemukan di sistem.", 403),
    };
  }

  if (!profile.is_active) {
    return {
      user: null,
      error: error("Akun Anda telah dinonaktifkan. Hubungi administrator.", 403),
    };
  }

  return {
    user: profile as StaffUser,
    error: null,
  };
}

/**
 * Convenience wrapper that requires the caller to be ADMIN role.
 */
export async function authenticateAdmin(event: HandlerEvent): Promise<AuthResult> {
  const result = await authenticateStaff(event);
  if (result.error) return result;

  if (result.user.role !== "ADMIN") {
    return {
      user: null,
      error: error("Akses ditolak. Hanya Admin yang dapat melakukan aksi ini.", 403),
    };
  }

  return result;
}
