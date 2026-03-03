"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { publicApi } from "../lib/api";
import { News, Event } from "../types";
import { useAuthStore } from "../store/authStore";
import { CalendarDays, MapPin, Lock, ArrowRight, Users, Briefcase } from "lucide-react";

export default function LandingPage() {
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    publicApi.getNews(1, 3).then((r) => setNews(r.data.data?.news || []));
    publicApi.getEvents(1, 4).then((r) => setEvents(r.data.data?.events || []));
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">AB</span>
            </div>
            <span className="font-bold text-gray-900">Alumni Al Bahjah</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <Link href="/#berita" className="hover:text-primary-500">Berita</Link>
            <Link href="/#event" className="hover:text-primary-500">Events</Link>
            <Link href="/#direktori" className="hover:text-primary-500">Directory</Link>
            <Link href="/#karir" className="hover:text-primary-500">Karir</Link>
          </div>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/home"
                className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600 transition">
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Login</Link>
                <Link href="/register"
                  className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-600 transition">
                  Daftar
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs text-primary-500 font-semibold tracking-wider uppercase flex items-center gap-1.5 mb-4">
              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
              Official Alumni Portal
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-4">
              Selamat Datang di<br />Portal Alumni{" "}
              <span className="text-primary-500">Al Bahjah</span>
            </h1>
            <p className="text-gray-500 mb-8 leading-relaxed">
              Wadah resmi untuk menjalin silaturahmi antar alumni, berbagi peluang karir,
              dan tetap terhubung dengan perkembangan terbaru Pondok Pesantren Al Bahjah.
            </p>
            <div className="flex gap-4">
              <Link href="/register"
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-primary-600 transition flex items-center gap-2">
                Gabung Sekarang <ArrowRight size={16} />
              </Link>
              <Link href="/#tentang"
                className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition">
                Pelajari Lebih Lanjut
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-8 h-8 rounded-full bg-primary-200 border-2 border-white" />
                ))}
                <div className="w-8 h-8 rounded-full bg-primary-500 border-2 border-white flex items-center justify-center text-white text-xs">
                  +5k
                </div>
              </div>
              <span className="text-sm text-gray-500">Telah bergabung dengan komunitas kami</span>
            </div>
          </div>
          <div className="relative">
            <div
              className="rounded-2xl overflow-hidden h-80 flex items-end p-6 bg-cover bg-[position:20%_32%] bg-dark-800"
              style={{ backgroundImage: "url('/Buya2.jpeg')" }}
            >
              {/* Dark gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="relative z-10 bg-black/40 backdrop-blur-sm rounded-lg p-4 text-white">
                <p className="text-sm italic">
                  "Ilmu yang bermanfaat adalah ilmu yang diamalkan dan disebarkan untuk kebaikan umat."
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest News */}
      <section id="berita" className="py-16 bg-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Berita Pondok Terbaru</h2>
              <p className="text-gray-500 text-sm mt-1">Ikuti perkembangan terkini dari pusat kegiatan dakwah.</p>
            </div>
            <Link href="/berita" className="text-primary-500 text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all">
              Lihat Semua <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {news.length > 0 ? news.map((item) => (
              <Link key={item.id} href={`/berita/${item.slug}`}
                className="bg-white rounded-xl overflow-hidden border hover:shadow-md transition group">
                <div className="h-44 bg-gray-100 overflow-hidden">
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-4xl">📰</div>
                  )}
                </div>
                <div className="p-4">
                  {item.category && (
                    <span className="text-xs text-primary-500 font-semibold uppercase tracking-wide">{item.category}</span>
                  )}
                  <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">{item.title}</h3>
                  <p className="text-sm text-gray-400 mt-2">{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</p>
                </div>
              </Link>
            )) : (
              [1,2,3].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden border animate-pulse">
                  <div className="h-44 bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Upcoming Events */}
      <section id="event" className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Agenda Mendatang</h2>
            <p className="text-gray-500 text-sm mt-1">Hadiri dan ramaikan acara-acara silaturahmi alumni.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {events.length > 0 ? events.map((event) => {
              const date = new Date(event.start_time);
              return (
                <div key={event.id} className="bg-white border rounded-xl p-5 flex gap-4 items-center hover:shadow-md transition">
                  <div className="bg-primary-50 rounded-xl w-14 h-14 flex flex-col items-center justify-center shrink-0">
                    <span className="text-lg font-bold text-primary-500 leading-none">{date.getDate()}</span>
                    <span className="text-xs text-primary-400 uppercase">{date.toLocaleDateString("id-ID", { month: "short" })}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{event.title}</h3>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <CalendarDays size={13} />{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin size={13} />{event.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            }) : (
              [1,2].map(i => (
                <div key={i} className="bg-white border rounded-xl p-5 flex gap-4 animate-pulse">
                  <div className="bg-gray-100 rounded-xl w-14 h-14 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Locked Sections */}
      <section className="py-16 bg-primary-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { icon: Users, label: "Alumni Directory", desc: "Temukan teman seangkatan dan jalin relasi profesional.", href: "/direktori" },
              { icon: Briefcase, label: "Job Portal", desc: "Akses lowongan pekerjaan khusus untuk alumni.", href: "/lowongan" },
            ].map(({ icon: Icon, label, desc, href }) => (
              <div key={label} className="bg-white border rounded-2xl p-8 text-center">
                <div className="w-14 h-14 bg-primary-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon size={28} className="text-primary-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{label}</h3>
                <p className="text-gray-500 text-sm mb-6">{desc}</p>
                {isAuthenticated ? (
                  <Link href={href}
                    className="bg-primary-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition">
                    Akses Sekarang
                  </Link>
                ) : (
                  <Link href="/login"
                    className="bg-primary-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition flex items-center gap-2 justify-center w-fit mx-auto">
                    <Lock size={14} /> Login untuk Mengakses
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-dark-800 py-20 text-center text-white">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">
            Siap Untuk Bergabung Kembali Dengan Keluarga Besar Al Bahjah?
          </h2>
          <p className="text-gray-400 mb-8">
            Jangan lewatkan kesempatan untuk saling membantu dan menginspirasi sesama alumni.
            Daftar sekarang dan jadilah bagian dari perubahan.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register"
              className="bg-primary-500 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition uppercase text-sm tracking-wide">
              Daftar Sekarang
            </Link>
            <Link href="/kontak"
              className="border border-primary-500 text-primary-400 px-8 py-3 rounded-lg font-semibold hover:bg-primary-500/10 transition uppercase text-sm tracking-wide">
              Hubungi Kami
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark-900 border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-500 rounded-full" />
            <span className="text-white font-medium">Alumni Al Bahjah</span>
          </div>
          <span>© 2024 Portal Alumni Al Bahjah. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
