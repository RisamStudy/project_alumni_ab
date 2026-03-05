"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { authApi } from "@/lib/api";
import {
  Newspaper, Users, CalendarDays, Briefcase, ClipboardList,
  Bell, Settings, LogOut, Home, ChevronDown
} from "lucide-react";

const navLinks = [
  { href: "/home",           label: "News",      icon: Newspaper },
  { href: "/home/direktori", label: "Directory", icon: Users },
  { href: "/home/event",     label: "Events",    icon: CalendarDays },
  { href: "/home/lowongan",  label: "Jobs",      icon: Briefcase },
  { href: "/home/survei",    label: "Surveys",   icon: ClipboardList },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, logout } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    console.log("🔐 Dashboard layout - isAuthenticated:", isAuthenticated);
    console.log("👤 User:", user);
    
    // Only redirect if definitely not authenticated
    // Give time for zustand to hydrate from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        console.log("⚠️  Not authenticated, redirecting to login...");
        router.push("/login");
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, router]);

  // Show loading while checking auth
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    try { await authApi.logout(); } catch {}
    logout();
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-6 h-16">
          {/* Logo */}
          <Link href="/home" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white border border-primary-100">
              <img src="/favicon.ico" alt="Logo Alumni Al Bahjah" className="w-full h-full object-contain" />
            </div>
            <span className="font-bold text-gray-900 text-sm">Alumni Al Bahjah</span>
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-xs">
            <input
              type="search"
              placeholder="Search alumni, events..."
              className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-gray-50"
            />
          </div>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1 ml-auto">
            {navLinks.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-2 text-sm rounded-lg transition ${
                  pathname === href
                    ? "text-primary-600 bg-primary-50 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/home/notifikasi"
              aria-label="Notifikasi"
              title="Notifikasi"
              className={`w-9 h-9 flex items-center justify-center rounded-lg relative transition ${
                pathname === "/home/notifikasi"
                  ? "bg-primary-50 text-primary-600"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
            </Link>
            <Link
              href="/home/pengaturan"
              aria-label="Pengaturan"
              title="Pengaturan"
              className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                pathname === "/home/pengaturan"
                  ? "bg-primary-50 text-primary-600"
                  : "hover:bg-gray-100 text-gray-500"
              }`}
            >
              <Settings size={18} />
            </Link>
            {/* Profile dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 hover:bg-gray-100 rounded-lg p-1.5 transition">
                <div className="w-8 h-8 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-sm font-medium overflow-hidden">
                  {user?.profile?.photo_url ? (
                    <img src={user.profile.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    user?.full_name?.charAt(0) || "A"
                  )}
                </div>
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-white border rounded-xl shadow-lg py-1 w-44 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <Link href="/home/profil" className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                  <Home size={14} /> Profil Saya
                </Link>
                <button onClick={handleLogout}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut size={14} /> Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid md:grid-cols-3 gap-8 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-primary-500 rounded-full" />
              <span className="font-semibold text-gray-900">Alumni Al Bahjah</span>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed">
              Connecting the Al Bahjah family through shared memories, career growth, and lifelong learning opportunities.
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Platform</h4>
            <div className="space-y-2">
              {[["Directory", "/home/direktori"], ["Job Board", "/home/lowongan"], ["Event Calendar", "/home/event"]].map(([l, h]) => (
                <Link key={h} href={h} className="block text-gray-500 hover:text-primary-500 transition text-xs">{l}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-3">Contact</h4>
            <div className="space-y-2">
              {[["Help Center", "/help"], ["Privacy Policy", "/privacy"], ["Terms of Service", "/terms"]].map(([l, h]) => (
                <Link key={h} href={h} className="block text-gray-500 hover:text-primary-500 transition text-xs">{l}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t text-center py-4 text-xs text-gray-400">
          © 2026 Alumni Al Bahjah. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
