"use client";

import Link from "next/link";
import { Settings, User, ShieldCheck, Bell } from "lucide-react";

const settingsMenus = [
  {
    id: "profile",
    icon: User,
    title: "Profil Akun",
    description: "Ubah data profil, foto, dan informasi pribadi.",
    href: "/home/profil",
  },
  {
    id: "privacy",
    icon: ShieldCheck,
    title: "Privasi & Keamanan",
    description: "Kelola keamanan akun dan visibilitas data.",
    href: "/home/profil",
  },
  {
    id: "notification",
    icon: Bell,
    title: "Preferensi Notifikasi",
    description: "Lihat notifikasi terbaru dari komunitas alumni.",
    href: "/home/notifikasi",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
          <Settings size={18} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pengaturan</h1>
          <p className="text-sm text-gray-500">Atur preferensi akun kamu di sini.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {settingsMenus.map(({ id, icon: Icon, title, description, href }) => (
          <Link
            key={id}
            href={href}
            className="bg-white border rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition"
          >
            <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Icon size={18} />
            </div>
            <h2 className="mt-3 text-sm font-semibold text-gray-900">{title}</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
