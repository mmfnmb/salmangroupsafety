"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { clsx } from "clsx";
import { markAllNotificationsRead, markNotificationRead } from "@/server/notifications";
import type { LiveAlert } from "@/lib/notify";

type PersistedNotification = {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({
  persisted,
  live,
  unreadCount,
}: {
  persisted: PersistedNotification[];
  live: LiveAlert[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const totalBadge = unreadCount + live.length;

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {totalBadge > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {totalBadge > 9 ? "9+" : totalBadge}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute end-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button
                disabled={isPending}
                onClick={() => startTransition(() => markAllNotificationsRead())}
                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                <CheckCheck size={13} /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {live.map((a, i) => (
              <Link
                key={`live-${i}`}
                href={a.href}
                onClick={() => setOpen(false)}
                className="block border-b border-slate-50 bg-amber-50/50 px-4 py-2.5 hover:bg-amber-50"
              >
                <p className="text-sm font-medium text-amber-900">{a.title}</p>
                <p className="mt-0.5 text-xs text-amber-700">{a.body}</p>
              </Link>
            ))}
            {persisted.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.isRead) startTransition(() => markNotificationRead(n.id));
                }}
                className={clsx(
                  "block w-full border-b border-slate-50 px-4 py-2.5 text-start hover:bg-slate-50",
                  !n.isRead && "bg-blue-50/40"
                )}
              >
                <div className="flex items-start gap-2">
                  {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{n.body}</p>
                  </div>
                </div>
              </button>
            ))}
            {live.length === 0 && persisted.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-slate-400">You&apos;re all caught up</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
