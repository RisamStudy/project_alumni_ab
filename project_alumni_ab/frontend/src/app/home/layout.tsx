"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Newspaper,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

const navLinks = [
  { href: "/home", label: "News", icon: Newspaper },
  { href: "/home/direktori", label: "Directory", icon: Users },
  { href: "/home/event", label: "Events", icon: CalendarDays },
  { href: "/home/lowongan", label: "Jobs", icon: Briefcase },
  { href: "/home/survei", label: "Surveys", icon: ClipboardList },
];

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

const resolvePhotoURL = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/") && API_BASE_URL) return `${API_BASE_URL}${url}`;
  return url;
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.push("/login");
      }
    }, 120);

    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (!profileMenuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [profileMenuOpen]);

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-cyan-100">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm text-slate-600">Menyiapkan dashboard...</p>
        </div>
      </div>
    );
  }

  const isSuperAdmin = user?.role === "super_admin";

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {}

    logout();
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
    router.push("/");
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-b from-slate-100 via-emerald-50/45 to-white">
      <header className="sticky top-0 z-50 border-b border-white/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl min-w-0 items-center gap-4 px-4 sm:px-6">
          <Link href="/home" className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-sm"><img src="/favicon.ico" alt="Logo Alumni Al Bahjah" className="w-full h-full object-contain" /></div> 
            <div className="min-w-0">
              <p className="truncate text-xs font-bold leading-none text-slate-900 sm:text-sm">Portal Alumni</p>
              <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">Al Bahjah</p>
            </div>
          </Link>

          <nav className="ml-auto hidden min-w-0 items-center gap-1 lg:flex">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm transition ${
                  pathname === href
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100">
              <Bell size={17} />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500" />
            </button>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100">
              <Settings size={17} />
            </button>

            <div ref={profileMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setProfileMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1.5 shadow-sm transition hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-emerald-100 text-sm font-semibold text-emerald-700">
                  {user?.profile?.photo_url ? (
                    <img src={resolvePhotoURL(user.profile.photo_url)} alt="" className="h-full w-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0) || "A"
                  )}
                </div>
                <div className="hidden text-left sm:block">
                  <p className="max-w-[160px] truncate text-xs font-semibold text-slate-900">{user?.full_name}</p>
                  <p className="max-w-[160px] truncate text-[11px] text-slate-500">{user?.email}</p>
                </div>
                <ChevronDown
                  size={14}
                  className={`text-slate-400 transition-transform ${profileMenuOpen ? "rotate-180" : ""}`}
                />
              </button>

              <div
                className={`absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white py-1 shadow-lg transition-all ${
                  profileMenuOpen ? "visible opacity-100" : "invisible opacity-0"
                }`}
              >
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-900">{user?.role || "alumni"}</p>
                  {isSuperAdmin && (
                    <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-emerald-700">
                      <ShieldCheck size={11} />
                      Super Admin
                    </p>
                  )}
                </div>
                <Link
                  href="/home/profil"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Home size={14} /> Profil Saya
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            aria-label={mobileMenuOpen ? "Tutup menu" : "Buka menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-slate-200 bg-white px-4 pb-4 lg:hidden">
            <div className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Navigasi</p>
            </div>

            <div className="mt-3 space-y-1">
              {navLinks.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                    pathname === href
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </Link>
              ))}
            </div>

            <div className="mt-4 border-t border-slate-200 pt-3">
              <p className="truncate text-sm font-semibold text-slate-900">{user?.full_name}</p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
              {isSuperAdmin && (
                <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] uppercase tracking-[0.15em] text-emerald-700">
                  <ShieldCheck size={11} />
                  Super Admin
                </p>
              )}

              <div className="mt-3 space-y-1">
                <Link
                  href="/home/profil"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-100"
                >
                  <Home size={16} />
                  Profil Saya
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-rose-600 hover:bg-rose-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl overflow-x-hidden px-4 py-8 sm:px-6">{children}</main>

      <footer className="border-t border-slate-200 bg-white/90">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 text-sm sm:px-6 md:grid-cols-3">
          <div>
            <div className="mb-3 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white border border-primary-100">
              <img src="/favicon.ico" alt="Logo Alumni Al Bahjah" className="w-full h-full object-contain" />
            </div>
              <p className="font-semibold text-slate-900">Alumni Al Bahjah</p>
            </div>
            <p className="text-xs leading-relaxed text-slate-500">
              Komunitas digital untuk memperkuat silaturahmi, karier, dan kolaborasi antar alumni.
            </p>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-800">Akses Cepat</p>
            <div className="space-y-2">
              {[
                ["Directory", "/home/direktori"],
                ["Jobs", "/home/lowongan"],
                ["Events", "/home/event"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="block text-xs text-slate-500 transition hover:text-emerald-600">
                  {label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-3 font-semibold text-slate-800">Bantuan</p>
            <div className="space-y-2">
              {[
                ["Help Center", "/help"],
                ["Privacy Policy", "/privacy"],
                ["Terms", "/terms"],
              ].map(([label, href]) => (
                <Link key={href} href={href} className="block text-xs text-slate-500 transition hover:text-emerald-600">
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
