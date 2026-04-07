import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const session = request.cookies.get("tempest_session");
  const pathname = request.nextUrl.pathname;

  // Rute publik yang boleh diakses tanpa login
  const publicRoutes = ["/login", "/register"];

  // Rute API publik (auth endpoints)
  const publicApiRoutes = ["/api/auth/login", "/api/auth/register"];

  // Rute statis/internal yang selalu diizinkan
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/sw.js" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  // API routes: protect non-public API endpoints di Edge runtime
  if (pathname.startsWith("/api")) {
    // Skip public API routes
    if (publicApiRoutes.some((p) => pathname.startsWith(p))) {
      return NextResponse.next();
    }
    // Cek session cookie untuk non-public API — early rejection sebelum masuk Node runtime
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Tidak terautentikasi" },
        { status: 401 }
      );
    }
    return NextResponse.next();
  }

  // Jika belum login dan coba akses halaman non-publik, tendang ke login
  if (!session && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Jika sudah login dan mencoba ke halaman login/register, tendang ke beranda
  if (session && publicRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Jalankan pada semua request kecuali resource statis
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
