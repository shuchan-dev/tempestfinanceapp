/**
 * session.ts — Helper untuk membaca User ID dari Cookie Sesi
 *
 * Prinsip SoC: Logika autentikasi/sesi dipisahkan dari logika bisnis API.
 * Dipakai oleh semua API routes yang membutuhkan identitas pengguna aktif.
 *
 * Security: Cookie berisi signed token (HMAC-SHA256), bukan raw userId.
 * verifySession() akan return null jika token telah dimodifikasi.
 */

import { cookies } from "next/headers";
import { verifySession } from "@/lib/session-utils";

/**
 * Mengambil dan memverifikasi userId dari cookie `tempest_session`.
 * Cookie berisi signed token: `<userId>.<hmac>`.
 * @returns userId (string) jika sesi valid, null jika tidak ada / invalid.
 */
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tempest_session");
  if (!sessionCookie?.value) return null;
  return verifySession(sessionCookie.value);
}

