import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { OfflineBanner } from "@/components/offline-banner";
import { BottomNav } from "@/components/bottom-nav";
import { SWRProvider } from "@/components/swr-provider";
import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

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
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "Tempest Finance",
  description: "High-Performance Offline-First Personal Finance Tracker",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tempest Finance",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
    other: {
      rel: "apple-touch-icon-precomposed",
      url: "/icon-512x512.png",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let isDark = localStorage.getItem('theme') === 'dark' || (!("theme" in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (_) {}
            `,
          }}
        />
      </head>
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
          <PWAInstallPrompt />
          <Toaster position="top-center" richColors theme="dark" />
        </SWRProvider>

        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                      console.log('✅ Service Worker registered:', registration);
                    },
                    (error) => {
                      console.warn('❌ Service Worker registration failed:', error);
                    }
                  );
                });
              }
            `,
          }}
        />
        <Analytics />
      </body>
    </html>
  );
}
