"use client";

import Link from "next/link";
import { Bell, CalendarDays, Briefcase, Newspaper } from "lucide-react";

const items = [
  {
    id: "1",
    icon: Newspaper,
    title: "News baru dipublikasikan",
    detail: "Cek update komunitas alumni terbaru.",
    href: "/home",
  },
  {
    id: "2",
    icon: CalendarDays,
    title: "Event mendatang",
    detail: "Jangan lupa cek jadwal event alumni minggu ini.",
    href: "/home/event",
  },
  {
    id: "3",
    icon: Briefcase,
    title: "Lowongan terbaru",
    detail: "Ada peluang karier baru yang mungkin cocok untukmu.",
    href: "/home/lowongan",
  },
];

export default function NotificationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <Bell size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifikasi</h1>
          <p className="text-sm text-gray-500">Semua update penting untuk akun alumni kamu.</p>
        </div>
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {items.map(({ id, icon: Icon, title, detail, href }) => (
          <Link key={id} href={href} className="p-4 flex items-start gap-3 hover:bg-gray-50 transition">
            <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Icon size={16} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{title}</p>
              <p className="text-xs text-gray-500 mt-1">{detail}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
