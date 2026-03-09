"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { publicApi, privateApi } from "@/lib/api";
import { Event, Job, News } from "@/types";
import {
  ArrowRight,
  Briefcase,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  MapPin,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  Users,
  X,
} from "lucide-react";

const SPECIAL_MANAGER_EMAIL = "risamaarif@gmail.com";
const MAX_NEWS_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_NEWS_THUMBNAIL_DATAURL_LENGTH = 60000;

export default function HomeDashboard() {
  const { user } = useAuthStore();
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [savingNews, setSavingNews] = useState(false);
  const [deletingNewsID, setDeletingNewsID] = useState<string | null>(null);
  const [newsError, setNewsError] = useState("");
  const [newsThumbnailName, setNewsThumbnailName] = useState("");
  const [newsForm, setNewsForm] = useState({
    title: "",
    content: "",
    category: "",
    published: true,
    thumbnail: "",
  });

  const canManageNews = useMemo(() => {
    if (!user) return false;
    return user.role === "admin" || user.email.toLowerCase() === SPECIAL_MANAGER_EMAIL;
  }, [user]);

  useEffect(() => {
    const newsRequest = canManageNews
      ? privateApi.listNewsPrivate(1, 20).catch((err) => {
          console.error("Failed to fetch private news:", err);
          return { data: { data: { news: [] } } };
        })
      : publicApi.getNews(1, 3).catch((err) => {
          console.error("Failed to fetch public news:", err);
          return { data: { data: { news: [] } } };
        });

    Promise.all([
      newsRequest,
      publicApi.getEvents(1, 2).catch((err) => {
        console.error("Failed to fetch events:", err);
        return { data: { data: { events: [] } } };
      }),
      privateApi.getJobs(1, 3).catch((err) => {
        console.error("Failed to fetch jobs:", err);
        return { data: { data: { jobs: [] } } };
      }),
    ])
      .then(([n, e, j]) => {
        setNews(n.data.data?.news || []);
        setEvents(e.data.data?.events || []);
        setJobs(j.data.data?.jobs || []);
      })
      .catch((err) => {
        console.error("Unexpected dashboard error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [canManageNews]);

  const completion = user?.profile_completion || 0;

  const fileToNewsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const objectURL = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const maxDimension = 1280;
        const scale = Math.min(1, maxDimension / img.width, maxDimension / img.height);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectURL);
          reject(new Error("Canvas tidak tersedia"));
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length > MAX_NEWS_THUMBNAIL_DATAURL_LENGTH && quality > 0.4) {
          quality -= 0.1;
          result = canvas.toDataURL("image/jpeg", quality);
        }

        URL.revokeObjectURL(objectURL);
        if (result.length > MAX_NEWS_THUMBNAIL_DATAURL_LENGTH) {
          reject(new Error("Thumbnail masih terlalu besar untuk disimpan. Coba gambar dengan resolusi lebih kecil."));
          return;
        }

        resolve(result);
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectURL);
        reject(new Error("File gambar tidak valid."));
      };

      img.src = objectURL;
    });

  const handleNewsThumbnailUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setNewsError("Thumbnail harus berupa file gambar.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_NEWS_IMAGE_SIZE) {
      setNewsError("Ukuran thumbnail maksimal 5MB.");
      e.target.value = "";
      return;
    }

    try {
      const dataURL = await fileToNewsDataURL(file);
      setNewsForm((prev) => ({ ...prev, thumbnail: dataURL }));
      setNewsThumbnailName(file.name);
      setNewsError("");
    } catch (err: unknown) {
      setNewsError((err as Error)?.message || "Gagal memproses thumbnail.");
    } finally {
      e.target.value = "";
    }
  };

  const resetNewsForm = () => {
    setNewsForm({
      title: "",
      content: "",
      category: "",
      published: true,
      thumbnail: "",
    });
    setNewsThumbnailName("");
    setEditingNews(null);
    setNewsError("");
  };

  const openCreateNewsModal = () => {
    resetNewsForm();
    setShowNewsModal(true);
  };

  const openEditNewsModal = (item: News) => {
    setNewsForm({
      title: item.title || "",
      content: item.content || "",
      category: item.category || "",
      published: item.published,
      thumbnail: item.thumbnail || "",
    });
    setNewsThumbnailName("");
    setEditingNews(item);
    setNewsError("");
    setShowNewsModal(true);
  };

  const refreshNews = async () => {
    if (canManageNews) {
      const res = await privateApi.listNewsPrivate(1, 20);
      setNews(res.data.data?.news || []);
      return;
    }
    const res = await publicApi.getNews(1, 3);
    setNews(res.data.data?.news || []);
  };

  const handleCreateOrUpdateNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setNewsError("");

    if (!newsForm.title.trim() || !newsForm.content.trim()) {
      setNewsError("Judul dan konten berita wajib diisi.");
      return;
    }

    try {
      setSavingNews(true);
      const payload = {
        title: newsForm.title.trim(),
        content: newsForm.content.trim(),
        category: newsForm.category.trim() || undefined,
        thumbnail: newsForm.thumbnail || undefined,
        published: newsForm.published,
      };

      if (editingNews) {
        await privateApi.updateNews(editingNews.id, payload);
      } else {
        await privateApi.createNews(payload);
      }

      await refreshNews();
      setShowNewsModal(false);
      resetNewsForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (editingNews ? "Gagal memperbarui berita." : "Gagal menambahkan berita.");
      setNewsError(message);
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    const ok = window.confirm("Hapus berita ini?");
    if (!ok) return;

    try {
      setDeletingNewsID(id);
      await privateApi.deleteNews(id);
      await refreshNews();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus berita.";
      setNewsError(message);
    } finally {
      setDeletingNewsID(null);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl break-words">
            Ahlan wa Sahlan, {user?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back to your alumni community hub.</p>
        </div>
      </div>

      {completion < 100 && (
        <div className="bg-white border rounded-xl p-4 sm:p-5 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="text-primary-500" size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-gray-900 text-sm">Complete Your Profile</p>
              <span className="text-primary-500 font-bold text-sm">{completion}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${completion}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Complete your profile to unlock all career opportunities, job listings, and the alumni directory.
            </p>
          </div>
          <Link
            href="/home/profil"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition shrink-0 w-full text-center sm:w-auto"
          >
            Complete Profile
          </Link>
        </div>
      )}

      <section>
        <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: "News Feed", href: "/home", icon: Newspaper, tone: "text-sky-600 bg-sky-50" },
            { label: "Directory", href: "/home/direktori", icon: Users, tone: "text-emerald-600 bg-emerald-50" },
            { label: "Events", href: "/home/event", icon: CalendarDays, tone: "text-indigo-600 bg-indigo-50" },
            { label: "Jobs Hub", href: "/home/lowongan", icon: Briefcase, tone: "text-amber-700 bg-amber-50" },
            { label: "Surveys", href: "/home/survei", icon: ClipboardList, tone: "text-rose-600 bg-rose-50" },
          ].map(({ label, href, icon: Icon, tone }) => (
            <Link
              key={href}
              href={href}
              className="bg-white border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-primary-300 hover:shadow-sm transition"
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center ${tone}`}>
                <Icon size={20} />
              </span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/home/event" className="text-primary-500 text-xs hover:underline flex items-center gap-1">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {loading
              ? [1, 2].map((i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 flex gap-3 animate-pulse">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-100 rounded w-3/4" />
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                    </div>
                  </div>
                ))
              : events.map((event) => {
                  const date = new Date(event.start_time);
                  return (
                    <div key={event.id} className="bg-white border rounded-xl p-4 flex flex-col gap-3 sm:flex-row sm:gap-4 sm:items-center">
                      <div className="shrink-0 w-14 h-14 overflow-hidden rounded-lg bg-gray-100">
                        {event.thumbnail && <img src={event.thumbnail} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 uppercase">
                          {date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </p>
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {event.location && (
                            <span className="flex items-center gap-1 min-w-0">
                              <MapPin size={10} className="shrink-0" />
                              <span className="truncate">{event.location}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/home/event/${event.id}`}
                        className="text-xs border border-primary-500 text-primary-500 px-3 py-1 rounded-lg hover:bg-primary-50 transition shrink-0 w-full text-center sm:w-auto"
                      >
                        Register
                      </Link>
                    </div>
                  );
                })}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Opportunities</h2>
            <Link href="/home/lowongan" className="text-primary-500 text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-white border rounded-xl divide-y">
            {loading
              ? [1, 2, 3].map((i) => (
                  <div key={i} className="p-4 flex gap-3 animate-pulse">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                      <div className="h-3 bg-gray-100 rounded w-3/4" />
                    </div>
                  </div>
                ))
              : jobs.map((job) => (
                  <div key={job.id} className="p-4 flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <Briefcase size={16} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {job.company} • {job.location || "Remote"}
                      </p>
                    </div>
                  </div>
                ))}
            {!loading && (
              <div className="p-4 text-center">
                <Link href="/home/lowongan" className="text-xs text-primary-500 hover:underline">
                  View 12 more recommendations
                </Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Community News</h2>
          {canManageNews && (
            <button
              onClick={openCreateNewsModal}
              className="bg-primary-500 text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-primary-600 hover:shadow-sm transition inline-flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <Plus size={14} />
              Tambah News
            </button>
          )}
        </div>

        {newsError && <p className="mb-3 text-sm text-red-600">{newsError}</p>}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {loading
            ? [1, 2, 3].map((i) => (
                <div key={i} className="bg-white border rounded-xl overflow-hidden animate-pulse">
                  <div className="h-40 bg-gray-100" />
                  <div className="p-4 space-y-2">
                    <div className="h-3 bg-gray-100 rounded w-1/4" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                  </div>
                </div>
              ))
            : news.map((item) => (
                <div key={item.id} className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition group">
                  <div className="h-40 bg-gray-100 overflow-hidden">
                    {item.thumbnail && (
                      <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {item.category && (
                          <span className="text-xs text-primary-500 font-semibold uppercase tracking-wide">{item.category}</span>
                        )}
                        {!item.published && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Draft
                          </span>
                        )}
                      </div>
                      {item.can_manage && (
                        <div className="flex flex-wrap items-center justify-end gap-1 shrink-0">
                          <button
                            onClick={() => openEditNewsModal(item)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteNews(item.id)}
                            disabled={deletingNewsID === item.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition disabled:opacity-60"
                          >
                            <Trash2 size={12} />
                            {deletingNewsID === item.id ? "..." : "Hapus"}
                          </button>
                        </div>
                      )}
                    </div>

                    {item.published ? (
                      <Link href={`/berita/${item.slug}`} className="block">
                        <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2 hover:text-primary-600 transition">
                          {item.title}
                        </h3>
                      </Link>
                    ) : (
                      <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{item.title}</h3>
                    )}

                    <p className="text-xs text-gray-400 mt-2">
                      Posted {new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                    </p>
                  </div>
                </div>
              ))}
        </div>
      </section>

      {showNewsModal && (
        <div className="fixed inset-0 z-40 bg-black/40 px-3 py-4 sm:px-4 sm:py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editingNews ? "Edit News" : "Tambah News"}</h2>
              <button
                onClick={() => setShowNewsModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md p-1 transition"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateNews} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Judul</label>
                <input
                  value={newsForm.title}
                  onChange={(e) => setNewsForm({ ...newsForm, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Judul berita"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Kategori</label>
                <input
                  value={newsForm.category}
                  onChange={(e) => setNewsForm({ ...newsForm, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Event / Pengumuman"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Konten</label>
                <textarea
                  value={newsForm.content}
                  onChange={(e) => setNewsForm({ ...newsForm, content: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-36"
                  placeholder="Tulis isi berita..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Thumbnail (upload foto, opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleNewsThumbnailUpload}
                  className="w-full border rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-primary-700"
                />
                <p className="text-xs text-gray-500">Maksimal 5MB.</p>
                {newsThumbnailName && <p className="text-xs text-gray-600">File dipilih: {newsThumbnailName}</p>}
                {newsForm.thumbnail && (
                  <div className="rounded-lg border p-2 space-y-2">
                    <img
                      src={newsForm.thumbnail}
                      alt="Preview thumbnail"
                      className="w-full max-h-56 object-contain rounded-md bg-gray-100"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setNewsForm((prev) => ({ ...prev, thumbnail: "" }));
                        setNewsThumbnailName("");
                      }}
                      className="text-xs text-rose-600 hover:text-rose-700 hover:underline transition"
                    >
                      Hapus thumbnail
                    </button>
                  </div>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={newsForm.published}
                  onChange={(e) => setNewsForm({ ...newsForm, published: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Publish berita
              </label>

              {newsError && <p className="text-sm text-red-600">{newsError}</p>}

              <div className="pt-1 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewsModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border w-full sm:w-auto hover:bg-gray-50 hover:border-gray-300 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingNews}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 hover:shadow-sm transition disabled:opacity-60 w-full sm:w-auto"
                >
                  {savingNews ? "Menyimpan..." : editingNews ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
