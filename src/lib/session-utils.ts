/**
 * session-utils.ts — HMAC Session Signing & Verification
 *
 * Mencegah session fixation: cookie tidak menyimpan raw user.id,
 * melainkan token yang di-sign menggunakan HMAC-SHA256.
 *
 * Format token: `<userId>.<hmac_hex>`
 * Verifikasi: hitung ulang HMAC dari userId, bandingkan secara constant-time.
 *
 * Menggunakan `crypto` native Node.js — zero additional dependencies.
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Lazy getter agar tidak throw saat build time (module evaluation).
 * Throw hanya saat fungsi signSession/verifySession benar-benar dipanggil.
 */
function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "FATAL: SESSION_SECRET environment variable is not set!\n" +
      "Set SESSION_SECRET to a long random string in your .env file."
    );
  }
  return secret;
}

/**
 * Sign userId menjadi session token yang aman.
 * Output: `"<userId>.<signature>"`
 */
export function signSession(userId: string): string {
  const sig = createHmac("sha256", getSecret()).update(userId).digest("hex");
  return `${userId}.${sig}`;
}

/**
 * Verifikasi token session dan kembalikan userId jika valid.
 * Return null jika token tidak valid / telah dimodifikasi.
 */
export function verifySession(token: string): string | null {
  try {
    const lastDotIndex = token.lastIndexOf(".");
    if (lastDotIndex === -1) return null;

    const userId = token.slice(0, lastDotIndex);
    const providedSig = token.slice(lastDotIndex + 1);

    if (!userId || !providedSig) return null;

    const expectedSig = createHmac("sha256", getSecret()).update(userId).digest("hex");

    // Constant-time comparison mencegah timing attack
    const providedBuf = Buffer.from(providedSig, "hex");
    const expectedBuf = Buffer.from(expectedSig, "hex");

    if (providedBuf.length !== expectedBuf.length) return null;
    if (!timingSafeEqual(providedBuf, expectedBuf)) return null;

    return userId;
  } catch {
    return null;
  }
}
