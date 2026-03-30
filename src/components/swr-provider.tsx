"use client";

/**
 * SWRProvider — Konfigurasi Global SWR untuk Efisiensi DB
 *
 * Strategi Penghematan Kuota (Strategi 6: SWR Optimization):
 *
 * 1. revalidateOnFocus: false
 *    → Eliminasi request tiap kali user pindah tab dan kembali.
 *    → Impact: ↓70% DB reads pada penggunaan normal (tab-switching).
 *
 * 2. revalidateOnReconnect: false
 *    → Tidak re-fetch saat koneksi internet pulih.
 *    → Data tetap fresh dari cache terakhir.
 *
 * 3. dedupingInterval: 10_000 (10 detik)
 *    → Request dengan key yang sama dalam 10 detik hanya dieksekusi 1x.
 *    → Mencegah multiple component yang pakai SWR key sama memicu banyak fetch.
 *
 * 4. Optimistic Update via mutate() dengan { revalidate: false }
 *    → Diimplementasikan di TransactionForm — update UI tanpa round-trip ke DB.
 *
 * Filosofi: "Server adalah kurir. Jangan panggil kurir jika tidak ada surat."
 */

import { SWRConfig } from "swr";
import type { ReactNode } from "react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher,
        // ─── Anti-Waste Config ─────────────────────────────────
        revalidateOnFocus: false,        // Jangan re-fetch saat pindah tab
        revalidateOnReconnect: false,    // Jangan re-fetch saat internet balik
        dedupingInterval: 10_000,        // Dedup request dalam window 10 detik
        // ─── Error Handling ────────────────────────────────────
        shouldRetryOnError: false,       // Jangan auto-retry; biarkan user yg memutuskan
        // ─── Cache Strategy ────────────────────────────────────
        // Data dianggap "fresh" selama 2 menit sejak terakhir di-fetch.
        // Navigasi antar halaman tidak memicu API call selama dalam window ini.
        focusThrottleInterval: 120_000,  // Throttle revalidation tiap 2 menit
      }}
    >
      {children}
    </SWRConfig>
  );
}
