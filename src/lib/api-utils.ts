import { NextResponse } from "next/server";
import { getUserId } from "@/lib/session";

/**
 * Utility to resolve user ID from the session and handle standard authentication errors.
 * Used across API routes to avoid duplicating auth error handling.
 */
export async function resolveUserId() {
  const userId = await getUserId();
  if (!userId) {
    return {
      userId: null,
      error: NextResponse.json(
        { success: false as const, error: "Tidak terautentikasi" },
        { status: 401 },
      ),
    };
  }
  return { userId, error: null };
}
