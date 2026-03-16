/**
 * session.ts — Helper untuk membaca User ID dari Cookie Sesi
 *
 * Prinsip SoC: Logika autentikasi/sesi dipisahkan dari logika bisnis API.
 * Dipakai oleh semua API routes yang membutuhkan identitas pengguna aktif.
 */

import { cookies } from "next/headers";

/**
 * Mengambil userId dari cookie `tempest_session`.
 * Cookie berisi User ID secara langsung (ditetapkan saat login).
 * @returns userId (string) jika ada sesi, null jika tidak ada.
 */
export async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("tempest_session");
  return sessionCookie?.value ?? null;
}
