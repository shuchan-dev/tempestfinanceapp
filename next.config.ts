import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  // Tentukan path service worker (yang akan digenerate saat build)
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Nonaktifkan service worker di development agar tidak berbenturan dengan HMR
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Tambahkan package Prisma binding agar tidak dicompile jadi Webpack module
  // Paket native Node.js yang tidak boleh di-bundle oleh Webpack/Turbopack
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
  // Konfigurasi Turbopack untuk kompatibilitas
  turbopack: {},
};

export default withSerwist(nextConfig);
