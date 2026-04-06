"use client";

import useSWR from "swr";
import { useState } from "react";
import { Bell, Check, Trash2, X } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export function NotificationBell() {
  const { data: res, mutate } = useSWR("/api/notifications");
  const [isOpen, setIsOpen] = useState(false);

  const notifications = res?.data || [];
  const unreadCount = res?.meta?.unreadCount || 0;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      mutate();
    } catch {
      toast.error("Gagal update notifikasi");
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      mutate();
      toast.success("Semua ditandai sudah dibaca");
    } catch {
      toast.error("Gagal update notifikasi");
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`/api/notifications/${id}`, { method: "DELETE" });
      mutate();
    } catch {
      toast.error("Gagal hapus notifikasi");
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus:outline-none">
          <Bell className="h-5 w-5 text-zinc-600 dark:text-zinc-300" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0 rounded-xl overflow-hidden shadow-lg border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-4 py-3 bg-zinc-50/50 dark:bg-zinc-900/50">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Notifikasi</h3>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        
        <div className="max-h-80 overflow-y-auto w-full">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <div className="rounded-full bg-zinc-100 dark:bg-zinc-800 p-3 mb-2">
                <Bell className="h-6 w-6 text-zinc-400" />
              </div>
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Belum ada notifikasi baru</p>
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
              {notifications.map((notif: NotificationData) => (
                <div 
                  key={notif.id} 
                  className={`relative flex gap-3 px-4 py-3 group hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors ${!notif.isRead ? "bg-blue-50/30 dark:bg-blue-900/10" : ""}`}
                >
                  <div className="pt-0.5">
                    <span className={`flex h-2 w-2 rounded-full mt-1.5 ${!notif.isRead ? "bg-blue-500" : "bg-transparent"}`}></span>
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <p className={`text-sm ${!notif.isRead ? "font-semibold text-zinc-900 dark:text-zinc-100" : "font-medium text-zinc-700 dark:text-zinc-300"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 max-w-[220px] wrap-break-word">
                      {notif.message}
                    </p>
                    <p className="text-[10px] font-medium text-zinc-400 mt-1">
                      {formatRelativeDate(notif.createdAt)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 absolute right-4 top-3 md:opacity-0 md:group-hover:opacity-100 md:transition-opacity">
                    {!notif.isRead && (
                      <button onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }} className="p-1 text-zinc-400 hover:text-emerald-500 rounded-md hover:bg-emerald-50 dark:hover:bg-emerald-900/30">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="p-1 text-zinc-400 hover:text-red-500 rounded-md hover:bg-red-50 dark:hover:bg-red-900/30">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
