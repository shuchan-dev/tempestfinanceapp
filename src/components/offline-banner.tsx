"use client";

import { useEffect, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    // Initial check
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      setJustCameOnline(true);
      // Hide the green banner after 3 seconds
      setTimeout(() => setJustCameOnline(false), 3000);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setJustCameOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline && !justCameOnline) return null;

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 flex items-center justify-center space-x-2 py-2 text-sm font-medium transition-all duration-300 ease-in-out",
        isOffline
          ? "bg-red-500/90 text-white shadow-md backdrop-blur-sm"
          : "bg-emerald-500/90 text-white shadow-md backdrop-blur-sm"
      )}
    >
      {isOffline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>Anda sedang Offline. Data disimpan di perangkat.</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4" />
          <span>Anda kembali Online!</span>
        </>
      )}
    </div>
  );
}
