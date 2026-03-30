import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { OfflineBanner } from "@/components/offline-banner";
import { BottomNav } from "@/components/bottom-nav";
import { SWRProvider } from "@/components/swr-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Tempest Finance",
  description: "High-Performance Offline-First Personal Finance Tracker",
  manifest: "/manifest.json", // Akan dibuat di Fase 4
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Tempest Finance",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-50 font-sans text-zinc-950 antialiased dark:bg-zinc-950 dark:text-zinc-50 pb-20 md:pb-0`}
      >
        <OfflineBanner />
        
        <SWRProvider>
          {/* Main Content Area */}
          <div className="mx-auto max-w-md bg-white min-h-screen dark:bg-zinc-950/50 sm:border-x sm:border-zinc-200 sm:dark:border-zinc-800 sm:shadow-sm">
            {children}
          </div>

          <BottomNav />
          <Toaster position="top-center" richColors theme="dark" />
        </SWRProvider>
      </body>
    </html>
  );
}
