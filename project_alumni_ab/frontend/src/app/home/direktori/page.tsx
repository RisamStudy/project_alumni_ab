"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { privateApi } from "@/lib/api";
import { Alumni } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { Search, MapPin, Building2, Linkedin, Instagram, Plus, Pencil, Trash2, X } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const SPECIAL_MANAGER_EMAIL = "risamaarif@gmail.com";

const resolvePhotoURL = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/") && API_BASE_URL) return `${API_BASE_URL}${url}`;
  return url;
};

type AlumniForm = {
  full_name: string;
  birth_year: string;
  email: string;
  photo_url: string;
  city: string;
  job_title: string;
  company: string;
  graduation_year: string;
  major: string;
  linkedin_url: string;
  instagram_url: string;
};

const createInitialForm = (): AlumniForm => ({
  full_name: "",
  birth_year: "",
  email: "",
  photo_url: "",
  city: "",
  job_title: "",
  company: "",
  graduation_year: "",
  major: "",
  linkedin_url: "",
  instagram_url: "",
});

const normalizeOptional = (value: string) => {
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const parseOptionalNumber = (value: string) => {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return undefined;
  return parsed;
};

export default function DirekturiPage() {
  const { user } = useAuthStore();
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [canManageFromAPI, setCanManageFromAPI] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAlumni, setEditingAlumni] = useState<Alumni | null>(null);
  const [form, setForm] = useState<AlumniForm>(createInitialForm());
  const [saving, setSaving] = useState(false);
  const [deletingID, setDeletingID] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  const canManageDirectory = useMemo(() => {
    if (!user) return false;
    return user.role === "admin" || user.email.toLowerCase() === SPECIAL_MANAGER_EMAIL;
  }, [user]);

  const effectiveCanManage = canManageDirectory || canManageFromAPI;

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const res = await privateApi.getDirectory(search, page, 12);
      setAlumni(res.data.data?.alumni || []);
      setTotal(res.data.data?.total || 0);
      setCanManageFromAPI(Boolean(res.data.data?.can_manage));
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(fetchAlumni, 400);
    return () => clearTimeout(t);
  }, [fetchAlumni]);

  const resetForm = () => {
    setForm(createInitialForm());
    setEditingAlumni(null);
    setFormError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (item: Alumni) => {
    setForm({
      full_name: item.full_name || "",
      birth_year: item.birth_year?.toString() || "",
      email: item.email || "",
      photo_url: item.photo_url || "",
      city: item.city || "",
      job_title: item.job_title || "",
      company: item.company || "",
      graduation_year: item.graduation_year?.toString() || "",
      major: item.major || "",
      linkedin_url: item.linkedin_url || "",
      instagram_url: item.instagram_url || "",
    });
    setEditingAlumni(item);
    setFormError("");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");

    const fullName = form.full_name.trim();
    const email = form.email.trim().toLowerCase();
    const birthYear = Number(form.birth_year);
    if (!fullName || !email || !Number.isFinite(birthYear)) {
      setFormError("Nama, email, dan tahun lahir wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      if (editingAlumni) {
        await privateApi.updateDirectoryAlumni(editingAlumni.id, {
          full_name: fullName,
          email,
          birth_year: birthYear,
          photo_url: form.photo_url.trim(),
          city: form.city.trim(),
          job_title: form.job_title.trim(),
          company: form.company.trim(),
          graduation_year: parseOptionalNumber(form.graduation_year) ?? 0,
          major: form.major.trim(),
          linkedin_url: form.linkedin_url.trim(),
          instagram_url: form.instagram_url.trim(),
        });
      } else {
        await privateApi.createDirectoryAlumni({
          full_name: fullName,
          email,
          birth_year: birthYear,
          photo_url: normalizeOptional(form.photo_url),
          city: normalizeOptional(form.city),
          job_title: normalizeOptional(form.job_title),
          company: normalizeOptional(form.company),
          graduation_year: parseOptionalNumber(form.graduation_year),
          major: normalizeOptional(form.major),
          linkedin_url: normalizeOptional(form.linkedin_url),
          instagram_url: normalizeOptional(form.instagram_url),
        });
      }
      await fetchAlumni();
      setShowModal(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (editingAlumni ? "Gagal memperbarui data alumni." : "Gagal menambahkan data alumni.");
      setFormError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Alumni) => {
    const ok = window.confirm(`Hapus alumni \"${item.full_name}\" dari direktori?`);
    if (!ok) return;

    try {
      setDeletingID(item.id);
      await privateApi.deleteDirectoryAlumni(item.id);
      await fetchAlumni();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus data alumni.";
      setFormError(message);
    } finally {
      setDeletingID(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Alumni Directory</h1>
          <p className="text-gray-500 text-sm mt-1">Temukan teman seangkatan dan jalin relasi profesional.</p>
        </div>
        {effectiveCanManage && (
          <button
            onClick={openCreateModal}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <Plus size={15} />
            Tambah Alumni
          </button>
        )}
      </div>

      {formError && <p className="mb-3 text-sm text-red-600">{formError}</p>}

      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari alumni berdasarkan nama atau kota..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {total > 0 && <p className="text-xs text-gray-400 mt-2">{total} alumni terdaftar</p>}
      </div>

      {loading ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(12)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-white border rounded-xl p-5 animate-pulse">
                <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3" />
                <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
              </div>
            ))}
        </div>
      ) : alumni.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">No data</p>
          <p>Tidak ada alumni ditemukan</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {alumni.map((a) => (
            <div key={a.id} className="bg-white border rounded-xl p-5 text-center hover:shadow-md transition relative">
              {effectiveCanManage && a.can_manage !== false && (
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(a)}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
                    aria-label="Edit alumni"
                  >
                    <Pencil size={12} />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
                    disabled={deletingID === a.id}
                    className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 transition disabled:opacity-50"
                    aria-label="Hapus alumni"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}

              <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center">
                {a.photo_url ? (
                  <img src={resolvePhotoURL(a.photo_url)} alt={a.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-600 text-xl font-bold">{a.full_name.charAt(0)}</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm truncate">{a.full_name}</h3>
              {a.job_title && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1 truncate">
                  <Building2 size={10} />
                  {a.job_title}
                  {a.company ? ` @ ${a.company}` : ""}
                </p>
              )}
              {a.city && (
                <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                  <MapPin size={10} />
                  {a.city}
                </p>
              )}
              {a.major && (
                <span className="inline-block mt-2 text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                  Divisi {a.major}
                </span>
              )}
              {a.graduation_year && (
                <span className="inline-block mt-2 text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                  Lulusan {a.graduation_year}
                </span>
              )}
              {(a.linkedin_url || a.instagram_url) && (
                <div className="flex items-center justify-center gap-2 mt-3">
                  {a.linkedin_url && (
                    <a
                      href={a.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs border rounded-full text-slate-700 hover:bg-slate-50"
                    >
                      <Linkedin size={12} /> LinkedIn
                    </a>
                  )}
                  {a.instagram_url && (
                    <a
                      href={a.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 text-xs border rounded-full text-slate-700 hover:bg-slate-50"
                    >
                      <Instagram size={12} /> IG
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {total > 12 && (
        <div className="flex justify-center gap-2 mt-8">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={alumni.length < 12}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition"
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/40 px-3 py-4 sm:px-4 sm:py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editingAlumni ? "Edit Alumni" : "Tambah Alumni"}</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md p-1 transition"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Nama Lengkap</label>
                  <input
                    value={form.full_name}
                    onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Nama alumni"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="email@contoh.com"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Tahun Lahir</label>
                  <input
                    type="number"
                    min={1940}
                    max={new Date().getFullYear() + 1}
                    value={form.birth_year}
                    onChange={(e) => setForm((prev) => ({ ...prev, birth_year: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="2000"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Tahun Lulus</label>
                  <input
                    type="number"
                    value={form.graduation_year}
                    onChange={(e) => setForm((prev) => ({ ...prev, graduation_year: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="2022"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Kota</label>
                  <input
                    value={form.city}
                    onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Jakarta"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Divisi</label>
                  <input
                    value={form.major}
                    onChange={(e) => setForm((prev) => ({ ...prev, major: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Tahfidz Quran"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Jabatan</label>
                  <input
                    value={form.job_title}
                    onChange={(e) => setForm((prev) => ({ ...prev, job_title: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Software Engineer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Perusahaan</label>
                  <input
                    value={form.company}
                    onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="PT. Contoh"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">URL Foto</label>
                <input
                  value={form.photo_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, photo_url: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://... atau /uploads/profiles/..."
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">LinkedIn URL</label>
                  <input
                    value={form.linkedin_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, linkedin_url: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="https://linkedin.com/in/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Instagram URL</label>
                  <input
                    value={form.instagram_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, instagram_url: e.target.value }))}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="https://instagram.com/..."
                  />
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

              <div className="pt-1 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border w-full sm:w-auto hover:bg-gray-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60 w-full sm:w-auto"
                >
                  {saving ? "Menyimpan..." : editingAlumni ? "Simpan Perubahan" : "Tambah Alumni"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
