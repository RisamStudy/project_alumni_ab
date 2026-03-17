"use client";

import { useEffect, useMemo, useState } from "react";
import { privateApi, publicApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { News } from "@/types";
import {
  CalendarDays,
  Eye,
  EyeOff,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const specialNewsEmail = "risamaarif@gmail.com";

type NewsFormState = {
  title: string;
  category: string;
  thumbnail: string;
  content: string;
  published: boolean;
};

const emptyForm: NewsFormState = {
  title: "",
  category: "",
  thumbnail: "",
  content: "",
  published: true,
};

export default function BeritaPage() {
  const { user } = useAuthStore();
  const [news, setNews] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingNews, setEditingNews] = useState<News | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewsFormState>(emptyForm);

  const canManageNews = useMemo(() => {
    if (!user) return false;
    const email = user.email?.toLowerCase() || "";
    return user.role === "admin" || user.role === "super_admin" || email === specialNewsEmail;
  }, [user]);

  const loadNews = async () => {
    try {
      const res = canManageNews
        ? await privateApi.listNewsPrivate(1, 50)
        : await publicApi.getNews(1, 50);
      setNews(res.data.data?.news || []);
    } catch (err: unknown) {
      setNews([]);
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal mengambil data berita.";
      setError(message);
    }
  };

  useEffect(() => {
    setLoading(true);
    setError("");
    loadNews().finally(() => setLoading(false));
  }, [canManageNews]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingNews(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (item: News) => {
    setForm({
      title: item.title || "",
      category: item.category || "",
      thumbnail: item.thumbnail || "",
      content: item.content || "",
      published: item.published ?? true,
    });
    setEditingNews(item);
    setError("");
    setShowFormModal(true);
  };

  const handleCreateOrUpdateNews = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.content.trim()) {
      setError("Judul dan isi berita wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        category: form.category.trim(),
        thumbnail: form.thumbnail.trim(),
        content: form.content.trim(),
        published: form.published,
      };

      if (editingNews) {
        await privateApi.updateNews(editingNews.id, payload);
      } else {
        await privateApi.createNews(payload);
      }

      await loadNews();
      setShowFormModal(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (editingNews ? "Gagal memperbarui berita." : "Gagal menambahkan berita.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNews = async (newsId: string) => {
    const ok = window.confirm("Hapus berita ini?");
    if (!ok) return;

    try {
      setDeletingId(newsId);
      setError("");
      await privateApi.deleteNews(newsId);
      await loadNews();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus berita.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-emerald-50/60 to-cyan-50/70 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.26em] text-emerald-700/80">News Center</p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900">Berita Alumni</h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Halaman ini menampilkan berita yang disimpan ke tabel <code>news</code>. User biasa melihat
              berita publik, sedangkan admin, super admin, dan akun khusus dapat mengelolanya.
            </p>
          </div>

          {canManageNews && (
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Tambah Berita
            </button>
          )}
        </div>

        {canManageNews && (
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Anda masuk dengan akses manajemen berita. Semua aksi tambah, ubah, dan hapus akan tersimpan ke data
            <code> news </code> di backend.
          </div>
        )}
      </section>

      {error && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-44 animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-5 w-3/4 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Newspaper size={28} />
          </div>
          <h2 className="text-lg font-semibold text-slate-900">Belum ada berita</h2>
          <p className="mt-2 text-sm text-slate-500">
            {canManageNews
              ? "Mulai tambahkan berita pertama untuk muncul di portal alumni."
              : "Belum ada berita yang dipublikasikan saat ini."}
          </p>
          {canManageNews && (
            <button
              onClick={openCreateModal}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              <Plus size={16} />
              Buat Berita Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {news.map((item) => (
            <article
              key={item.id}
              className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                canManageNews && item.published === false ? "ring-1 ring-amber-200" : ""
              }`}
            >
              <div className="h-44 overflow-hidden bg-slate-100">
                {item.thumbnail ? (
                  <img src={item.thumbnail} alt={item.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400">
                    <Newspaper size={34} />
                  </div>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700">
                    {item.category || "Komunitas"}
                  </span>
                  <span className="inline-flex items-center gap-1 text-slate-500">
                    <CalendarDays size={12} />
                    {new Date(item.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                  {canManageNews && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold ${
                        item.published
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {item.published ? <Eye size={12} /> : <EyeOff size={12} />}
                      {item.published ? "Published" : "Draft"}
                    </span>
                  )}
                </div>

                <div>
                  <h2 className="line-clamp-2 text-lg font-bold text-slate-900">{item.title}</h2>
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                    {item.content || "Belum ada isi berita."}
                  </p>
                </div>

                {canManageNews && item.can_manage !== false && (
                  <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    <button
                      onClick={() => openEditModal(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteNews(item.id)}
                      disabled={deletingId === item.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      {deletingId === item.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 px-4 py-8">
          <div className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {editingNews ? "Edit Berita" : "Tambah Berita"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Isi form berikut untuk menyimpan berita ke tabel <code>news</code>.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowFormModal(false);
                  resetForm();
                }}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOrUpdateNews} className="space-y-4 p-5">
              <div className="space-y-1.5">
                <label className="text-sm text-slate-700">Judul Berita</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Contoh: Silaturahmi Akbar Alumni 2026"
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-700">Kategori</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Kegiatan / Komunitas / Pengumuman"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-slate-700">Thumbnail URL</label>
                  <input
                    value={form.thumbnail}
                    onChange={(e) => setForm((prev) => ({ ...prev, thumbnail: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-slate-700">Isi Berita</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
                  className="min-h-48 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="Tulis isi berita di sini..."
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => setForm((prev) => ({ ...prev, published: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Publikasikan berita ini
              </label>

              {error && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {error}
                </p>
              )}

              <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => {
                    setShowFormModal(false);
                    resetForm();
                  }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : editingNews
                    ? "Simpan Perubahan"
                    : "Simpan Berita"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
