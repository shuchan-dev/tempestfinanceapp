import { NextRequest, NextResponse } from "next/server";
import { checkRateLimitMemory } from "./rate-limit-memory";
import { errorResponse } from "./api-response";

/**
 * Dual-Layer rate limiting helper for Auth endpoints (Login & Register)
 * Layer 1: IP-based (prevent single IP brute force)
 * Layer 2: Cookie-based (prevent distributed attack)
 * Limits to 5 attempts per 15 minutes per layer.
 */
export function withAuthRateLimit(
  req: NextRequest,
): { headers?: Record<string, string>; response?: NextResponse } | null {
  // Layer 1: IP-based memory (prevent single IP brute force)
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";

  const limit = 5;
  const windowMs = 15 * 60 * 1000;

  const rateCheck = checkRateLimitMemory(`auth_${ip}`, limit, windowMs);

  if (!rateCheck.success) {
    return {
      response: errorResponse(
        "Terlalu banyak percobaan dari IP ini. Silakan coba lagi nanti.",
        429,
      ),
    };
  }

  // Layer 2: Cookie-based (prevent distributed attack)
  const cookieHeader = req.headers.get("cookie") || "";
  const failedAttempts = getCookieFailedAttempts(cookieHeader);
  const lastAttemptTime = getCookieLastAttemptTime(cookieHeader);
  const now = Date.now();

  // Check if window still valid
  if (lastAttemptTime && now - lastAttemptTime < windowMs) {
    if (failedAttempts >= limit) {
      return {
        response: errorResponse(
          "Terlalu banyak percobaan. Silakan coba lagi nanti.",
          429,
        ),
      };
    }
  }

  return null; // OK
}

/**
 * Record failed login attempt via cookies
 * Returns Set-Cookie headers to increment failure counter
 */
export function recordLoginFailure(): {
  setCookieStart: string;
  setCookieTime: string;
} {
  const now = Date.now();
  const maxAge = 15 * 60; // 15 minutes

  return {
    setCookieStart: `login_failed_attempts=1; Path=/; Max-Age=${maxAge}; HttpOnly=false`,
    setCookieTime: `login_failed_at=${now}; Path=/; Max-Age=${maxAge}; HttpOnly=false`,
  };
}

/**
 * Clear failed login attempt cookies on successful login
 */
export function clearLoginFailure(): string[] {
  return [
    "login_failed_attempts=; Path=/; Max-Age=0",
    "login_failed_at=; Path=/; Max-Age=0",
  ];
}

function getCookieFailedAttempts(cookieHeader: string): number {
  const match = cookieHeader.match(/login_failed_attempts=(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
}

function getCookieLastAttemptTime(cookieHeader: string): number | null {
  const match = cookieHeader.match(/login_failed_at=(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}
