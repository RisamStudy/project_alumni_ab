"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { publicApi, privateApi } from "@/lib/api";
import { AdminAccount, DistributionItem, Event, Job, News } from "@/types";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  LineChart,
  MapPin,
  Newspaper,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";

const privilegedRegionalStatsEmail = "risamaarif@gmail.com";

const chartColors = [
  "#0f766e",
  "#0891b2",
  "#2563eb",
  "#9333ea",
  "#db2777",
  "#ea580c",
  "#16a34a",
  "#4f46e5",
];

type AdminFormState = {
  full_name: string;
  birth_year: string;
  email: string;
  password: string;
  major: string;
  city: string;
  status: "unverified" | "active" | "suspended";
};

const emptyAdminForm: AdminFormState = {
  full_name: "",
  birth_year: "",
  email: "",
  password: "",
  major: "",
  city: "",
  status: "active",
};

type DistributionCardProps = {
  title: string;
  subtitle: string;
  data: DistributionItem[];
  loading: boolean;
  emptyText: string;
};

function DistributionCard({ title, subtitle, data, loading, emptyText }: DistributionCardProps) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.total, 0), [data]);
  const max = useMemo(() => Math.max(...data.map((item) => item.total), 1), [data]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="pointer-events-none absolute -top-16 -right-16 h-40 w-40 rounded-full bg-cyan-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-emerald-200/40 blur-3xl" />

      <div className="relative">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Analitik</p>
            <h3 className="mt-1 text-lg font-bold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <div className="rounded-xl bg-slate-900 px-3 py-2 text-right text-white shadow-sm">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-300">Total</p>
            <p className="text-lg font-semibold">{total}</p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="animate-pulse">
                <div className="mb-1 h-3 w-40 rounded bg-slate-100" />
                <div className="h-2 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            {emptyText}
          </p>
        ) : (
          <div className="space-y-3">
            {data.slice(0, 8).map((item, index) => {
              const width = Math.max((item.total / max) * 100, 8);
              return (
                <div key={`${item.label}-${index}`}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                    <p className="max-w-[70%] truncate font-medium text-slate-700">{item.label}</p>
                    <p className="font-semibold text-slate-900">{item.total}</p>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${width}%`, backgroundColor: chartColors[index % chartColors.length] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default function HomeDashboard() {
  const { user } = useAuthStore();

  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingMain, setLoadingMain] = useState(true);

  const [memberRegion, setMemberRegion] = useState<DistributionItem[]>([]);
  const [adminMajor, setAdminMajor] = useState<DistributionItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminAccount | null>(null);
  const [adminForm, setAdminForm] = useState<AdminFormState>(emptyAdminForm);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [deletingAdminID, setDeletingAdminID] = useState<string | null>(null);
  const [adminError, setAdminError] = useState("");

  const completion = user?.profile_completion || 0;
  const isSuperAdmin = user?.role === "super_admin";
  const canViewMemberRegionStats =
    user?.role === "admin" ||
    user?.role === "super_admin" ||
    user?.email?.toLowerCase() === privilegedRegionalStatsEmail;

  const loadMainContent = async () => {
    setLoadingMain(true);
    try {
      const [newsRes, eventRes, jobRes] = await Promise.all([
        publicApi.getNews(1, 3).catch(() => ({ data: { data: { news: [] } } })),
        publicApi.getEvents(1, 2).catch(() => ({ data: { data: { events: [] } } })),
        privateApi.getJobs(1, 3).catch(() => ({ data: { data: { jobs: [] } } })),
      ]);

      setNews(newsRes.data.data?.news || []);
      setEvents(eventRes.data.data?.events || []);
      setJobs(jobRes.data.data?.jobs || []);
    } finally {
      setLoadingMain(false);
    }
  };

  const loadAdminUsers = async () => {
    if (!isSuperAdmin) return;
    setLoadingAdmins(true);
    try {
      const res = await privateApi.listAdmins();
      setAdmins(res.data.data?.admins || []);
    } catch {
      setAdmins([]);
    } finally {
      setLoadingAdmins(false);
    }
  };

  useEffect(() => {
    loadMainContent();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadStats = async () => {
      if (!user) return;
      if (!canViewMemberRegionStats && !isSuperAdmin) return;

      setLoadingStats(true);
      try {
        const tasks: Promise<void>[] = [];

        if (canViewMemberRegionStats) {
          tasks.push(
            privateApi
              .getMemberRegionStats()
              .then((res) => {
                if (!mounted) return;
                setMemberRegion(res.data.data?.distribution || []);
              })
              .catch(() => {
                if (!mounted) return;
                setMemberRegion([]);
              })
          );
        }

        if (isSuperAdmin) {
          tasks.push(
            privateApi
              .getAdminMajorStats()
              .then((res) => {
                if (!mounted) return;
                setAdminMajor(res.data.data?.distribution || []);
              })
              .catch(() => {
                if (!mounted) return;
                setAdminMajor([]);
              })
          );
        }

        await Promise.all(tasks);
      } finally {
        if (mounted) setLoadingStats(false);
      }
    };

    loadStats();
    return () => {
      mounted = false;
    };
  }, [canViewMemberRegionStats, isSuperAdmin, user]);

  useEffect(() => {
    loadAdminUsers();
  }, [isSuperAdmin]);

  const openCreateAdminModal = () => {
    setEditingAdmin(null);
    setAdminForm(emptyAdminForm);
    setAdminError("");
    setShowAdminModal(true);
  };

  const openEditAdminModal = (account: AdminAccount) => {
    setEditingAdmin(account);
    setAdminForm({
      full_name: account.full_name,
      birth_year: String(account.birth_year),
      email: account.email,
      password: "",
      major: account.major || "",
      city: account.city || "",
      status: account.status,
    });
    setAdminError("");
    setShowAdminModal(true);
  };

  const submitAdminForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAdminError("");

    const birthYear = Number(adminForm.birth_year);
    if (!adminForm.full_name.trim() || !adminForm.email.trim() || !birthYear) {
      setAdminError("Nama, email, dan tahun lahir wajib diisi.");
      return;
    }

    if (!editingAdmin && adminForm.password.length < 8) {
      setAdminError("Password admin baru minimal 8 karakter.");
      return;
    }

    try {
      setSavingAdmin(true);
      if (editingAdmin) {
        const payload: {
          full_name: string;
          birth_year: number;
          email: string;
          major?: string;
          city?: string;
          status: "unverified" | "active" | "suspended";
          password?: string;
        } = {
          full_name: adminForm.full_name.trim(),
          birth_year: birthYear,
          email: adminForm.email.trim(),
          major: adminForm.major.trim() || undefined,
          city: adminForm.city.trim() || undefined,
          status: adminForm.status,
        };
        if (adminForm.password.trim()) {
          payload.password = adminForm.password.trim();
        }

        await privateApi.updateAdmin(editingAdmin.id, payload);
      } else {
        await privateApi.createAdmin({
          full_name: adminForm.full_name.trim(),
          birth_year: birthYear,
          email: adminForm.email.trim(),
          password: adminForm.password.trim(),
          major: adminForm.major.trim() || undefined,
          city: adminForm.city.trim() || undefined,
        });
      }

      setShowAdminModal(false);
      setAdminForm(emptyAdminForm);
      await Promise.all([loadAdminUsers(), isSuperAdmin ? privateApi.getAdminMajorStats().then((res) => {
        setAdminMajor(res.data.data?.distribution || []);
      }).catch(() => {
        setAdminMajor([]);
      }) : Promise.resolve()]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menyimpan data admin.";
      setAdminError(message);
    } finally {
      setSavingAdmin(false);
    }
  };

  const deleteAdmin = async (adminID: string) => {
    const confirmDelete = window.confirm("Hapus akun admin ini?");
    if (!confirmDelete) return;

    try {
      setDeletingAdminID(adminID);
      await privateApi.deleteAdmin(adminID);
      await Promise.all([loadAdminUsers(), privateApi.getAdminMajorStats().then((res) => {
        setAdminMajor(res.data.data?.distribution || []);
      }).catch(() => {
        setAdminMajor([]);
      })]);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus admin.";
      setAdminError(message);
    } finally {
      setDeletingAdminID(null);
    }
  };

  return (
    <div className="space-y-8 overflow-x-hidden">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-cyan-50 to-white p-6 shadow-sm md:p-8">
        <div className="pointer-events-none absolute -top-20 right-8 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-10 h-44 w-44 rounded-full bg-cyan-200/60 blur-3xl" />

        <div className="relative grid gap-6 md:grid-cols-[1.6fr_1fr]">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-700/80">Portal Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
              Selamat datang, {user?.full_name?.split(" ")[0] || "Alumni"}.
            </h1>
            <p className="mt-3 max-w-xl text-sm text-slate-600">
              Pantau peluang karier, kegiatan komunitas, dan statistik alumni dalam satu dashboard yang lebih cepat.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                <p className="text-xs text-slate-500">Berita Terbaru</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{news.length}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                <p className="text-xs text-slate-500">Event Aktif</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{events.length}</p>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/80 p-3">
                <p className="text-xs text-slate-500">Lowongan</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{jobs.length}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Progres Profil</p>
              <p className="text-sm font-bold text-emerald-700">{completion}%</p>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500" style={{ width: `${completion}%` }} />
            </div>
            <p className="mt-3 text-xs text-slate-500">
              Lengkapi profil untuk meningkatkan kualitas koneksi profesional di direktori alumni.
            </p>
            <Link
              href="/home/profil"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              <CheckCircle2 size={14} />
              Lengkapi Profil
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900">Akses Cepat</h2>
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Modules</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "News", href: "/home", icon: Newspaper },
            { label: "Direktori", href: "/home/direktori", icon: Users },
            { label: "Events", href: "/home/event", icon: CalendarDays },
            { label: "Lowongan", href: "/home/lowongan", icon: Briefcase },
            { label: "Survei", href: "/home/survei", icon: LineChart },
          ].map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-100 to-cyan-100 text-emerald-700">
                <Icon size={18} />
              </div>
              <p className="text-sm font-semibold text-slate-900">{label}</p>
              <p className="mt-1 text-xs text-slate-500">Buka modul {label.toLowerCase()}</p>
            </Link>
          ))}
        </div>
      </section>

      {(canViewMemberRegionStats || isSuperAdmin) && (
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Insight Dashboard</h2>
            <p className="text-xs text-slate-500">Data real-time dari alumni aktif</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {canViewMemberRegionStats && (
              <DistributionCard
                title="Distribusi alumni per Daerah"
                subtitle="Akses untuk role admin"
                data={memberRegion}
                loading={loadingStats}
                emptyText="Belum ada data daerah alumni."
              />
            )}
            {isSuperAdmin && (
              <DistributionCard
                title="Distribusi Admin per Major"
                subtitle="Digunakan untuk memetakan persebaran admin berdasarkan divisi."
                data={adminMajor}
                loading={loadingStats}
                emptyText="Belum ada data major admin."
              />
            )}
          </div>
        </section>
      )}

      {isSuperAdmin && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Super Admin Area</p>
              <h2 className="mt-1 text-lg font-bold text-slate-900">Manajemen Akun Admin</h2>
              <p className="mt-1 text-sm text-slate-500">
                Tambah, ubah, atau hapus akun admin langsung dari dashboard.
              </p>
            </div>
            <button
              onClick={openCreateAdminModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Tambah Admin
            </button>
          </div>

          {adminError && (
            <p className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {adminError}
            </p>
          )}

          {loadingAdmins ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : admins.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              Belum ada akun admin.
            </p>
          ) : (
            <div className="space-y-2">
              {admins.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-semibold text-slate-900">{account.full_name}</p>
                      <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] text-white">
                        {account.role === "super_admin" ? "Super Admin" : "Admin"}
                      </span>
                    </div>
                    <p className="truncate text-xs text-slate-500">{account.email}</p>
                    <p className="break-words text-xs text-slate-500">
                      Major: {account.major || "-"} | Daerah: {account.city || "-"}
                    </p>
                  </div>
                  {account.role === "admin" ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        onClick={() => openEditAdminModal(account)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <Pencil size={12} />
                        Edit
                      </button>
                      <button
                        onClick={() => deleteAdmin(account.id)}
                        disabled={deletingAdminID === account.id}
                        className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
                      >
                        <Trash2 size={12} />
                        {deletingAdminID === account.id ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                      <ShieldCheck size={12} />
                      Akun Terproteksi
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Event Terdekat</h2>
            <Link href="/home/event" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {loadingMain
              ? Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
                ))
              : events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-3 sm:flex-nowrap">
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-[0.15em] text-slate-400">
                          {new Date(event.start_time).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </p>
                        <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
                        {event.location && (
                          <p className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-slate-500">
                            <MapPin size={12} />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/home/event/${event.id}`}
                        className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                      >
                        Detail
                      </Link>
                    </div>
                  </div>
                ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Peluang Karier</h2>
            <Link href="/home/lowongan" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>

          <div className="space-y-3">
            {loadingMain
              ? Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
                ))
              : jobs.map((job) => (
                  <div key={job.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">{job.title}</p>
                    <p className="text-xs text-slate-500">{job.company}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{job.job_type.replace("_", " ")}</span>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">{job.location || "Remote"}</span>
                    </div>
                  </div>
                ))}
          </div>
        </section>
      </div>

      <section>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Berita Komunitas</h2>
            <Link href="/home" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline">
              Refresh feed <ArrowRight size={12} />
            </Link>
          </div>
        <div className="grid gap-4 md:grid-cols-3">
          {loadingMain
            ? Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-48 animate-pulse rounded-2xl bg-slate-100" />
              ))
            : news.map((item) => (
                <Link
                  key={item.id}
                  href={`/berita/${item.slug}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-32 overflow-hidden bg-slate-100">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-emerald-700">{item.category || "Komunitas"}</p>
                    <p className="mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{item.title}</p>
                  </div>
                </Link>
              ))}
        </div>
      </section>

      {showAdminModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto overflow-x-hidden bg-slate-900/50 px-4 py-10">
          <div className="mx-auto max-h-full w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">
              {editingAdmin ? "Ubah Akun Admin" : "Tambah Akun Admin"}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {editingAdmin
                ? "Perbarui informasi admin yang dipilih."
                : "Akun akan dibuat dengan role admin aktif."}
            </p>

            {adminError && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {adminError}
              </p>
            )}

            <form onSubmit={submitAdminForm} className="mt-4 space-y-3">
              <input
                type="text"
                placeholder="Nama lengkap"
                value={adminForm.full_name}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, full_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="number"
                  placeholder="Tahun lahir"
                  value={adminForm.birth_year}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, birth_year: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <select
                  value={adminForm.status}
                  onChange={(e) =>
                    setAdminForm((prev) => ({
                      ...prev,
                      status: e.target.value as "unverified" | "active" | "suspended",
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                  <option value="unverified">unverified</option>
                </select>
              </div>
              <input
                type="email"
                placeholder="Email admin"
                value={adminForm.email}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, email: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                type="password"
                placeholder={editingAdmin ? "Password baru (opsional)" : "Password minimal 8 karakter"}
                value={adminForm.password}
                onChange={(e) => setAdminForm((prev) => ({ ...prev, password: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Major"
                  value={adminForm.major}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, major: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  type="text"
                  placeholder="Daerah"
                  value={adminForm.city}
                  onChange={(e) => setAdminForm((prev) => ({ ...prev, city: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingAdmin}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {savingAdmin ? "Menyimpan..." : editingAdmin ? "Simpan Perubahan" : "Buat Admin"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
