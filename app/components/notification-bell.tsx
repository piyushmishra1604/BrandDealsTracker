"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { type AppNotification, describeNotification } from "@/lib/notifications";

type NotificationsResponse = { notifications: AppNotification[]; unreadCount: number };

type Placement = "bottom-end" | "top-start";

export function NotificationBell({ placement = "bottom-end" }: { placement?: Placement }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/notifications");
        const body = (await response.json()) as NotificationsResponse & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Could not load notifications.");
        if (active) { setNotifications(body.notifications); setUnreadCount(body.unreadCount); }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not load notifications.");
      }
    }
    void load();
    return () => { active = false; };
  }, [open]);

  async function markAllRead() {
    setError("");
    try {
      const response = await fetch("/api/notifications/read", { method: "POST" });
      if (!response.ok) throw new Error("Could not mark notifications as read.");
      setUnreadCount(0);
      setNotifications(current => current.map(item => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark notifications as read.");
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(value => !value)}
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
        className="relative cursor-pointer rounded-lg p-2 text-[#53668e] hover:bg-[#f7f9fd]"
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unreadCount > 0 && (
          <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Notifications"
          className={`absolute z-30 w-80 rounded-xl border border-[#edf1f8] bg-white p-3 shadow-lg ${
            placement === "top-start" ? "bottom-full left-0 mb-2" : "right-0 mt-2"
          }`}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            {unreadCount > 0 && (
              <button type="button" onClick={() => void markAllRead()} className="cursor-pointer text-xs font-medium text-brand-600 hover:underline">
                Mark all as read
              </button>
            )}
          </div>
          {error && <p role="alert" className="mb-2 text-xs text-red-600">{error}</p>}
          {notifications.length === 0 ? (
            <p className="py-4 text-center text-sm text-[#53668e]">You have no notifications yet.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-[#edf1f8] overflow-y-auto">
              {notifications.map(notification => (
                <li key={notification.id} className="flex gap-2 py-2.5">
                  <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.readAt ? "bg-transparent" : "bg-brand-500"}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-[#1b2a4a]">{describeNotification(notification)}</p>
                    <p className="text-xs text-[#53668e]">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
