"use client";

import { useEffect, useMemo, useState } from "react";
import { privateApi } from "@/lib/api";
import { Survey } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { ClipboardList, ExternalLink, Pencil, Plus, Trash2, X } from "lucide-react";

const SPECIAL_SURVEY_EMAIL = "risamaarif@gmail.com";

export default function SurveiPage() {
  const { user } = useAuthStore();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSurvey, setEditingSurvey] = useState<Survey | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    form_url: "",
    active: true,
  });

  const canManageSurvey = useMemo(() => {
    if (!user) return false;
    return user.role === "admin" || user.email.toLowerCase() === SPECIAL_SURVEY_EMAIL;
  }, [user]);

  const loadSurveys = () =>
    privateApi.getSurveys().then((r) => setSurveys(r.data.data || []));

  useEffect(() => {
    loadSurveys().finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      form_url: "",
      active: true,
    });
    setEditingSurvey(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (survey: Survey) => {
    setForm({
      title: survey.title || "",
      description: survey.description || "",
      form_url: survey.form_url || "",
      active: survey.active ?? true,
    });
    setEditingSurvey(survey);
    setError("");
    setShowFormModal(true);
  };

  const handleCreateOrUpdateSurvey = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.form_url.trim()) {
      setError("Judul dan link survei wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        form_url: form.form_url.trim(),
        active: form.active,
      };

      if (editingSurvey) {
        await privateApi.updateSurvey(editingSurvey.id, payload);
      } else {
        await privateApi.createSurvey(payload);
      }

      await loadSurveys();
      setShowFormModal(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (editingSurvey ? "Gagal memperbarui survei." : "Gagal menambahkan survei.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSurvey = async (surveyId: string) => {
    const ok = window.confirm("Hapus survei ini?");
    if (!ok) return;

    try {
      setDeletingId(surveyId);
      await privateApi.deleteSurvey(surveyId);
      await loadSurveys();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus survei.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survei Alumni</h1>
          <p className="text-gray-500 text-sm mt-1">Bantu kami meningkatkan layanan dengan mengisi survei berikut.</p>
        </div>
        {canManageSurvey && (
          <button
            onClick={openCreateModal}
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Tambah Survei
          </button>
        )}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white border rounded-xl p-5 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-2/3" />
              <div className="h-3 bg-gray-100 rounded w-full" />
              <div className="h-8 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : surveys.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
          <p>Tidak ada survei aktif saat ini</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {surveys.map((s) => (
            <div key={s.id} className={`bg-white border rounded-xl p-5 ${s.active === false ? "opacity-80" : ""}`}>
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
                <ClipboardList size={20} className="text-primary-500" />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
                  {s.active === false && (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600 mb-2">
                      Nonaktif
                    </span>
                  )}
                </div>
                {s.can_manage && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(s)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSurvey(s.id)}
                      disabled={deletingId === s.id}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      <Trash2 size={13} />
                      {deletingId === s.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                )}
              </div>

              {s.description && <p className="text-sm text-gray-500 mb-4">{s.description}</p>}

              <a
                href={s.form_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center gap-2"
              >
                Isi Survei <ExternalLink size={13} />
              </a>
            </div>
          ))}
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-40 bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editingSurvey ? "Edit Survei" : "Tambah Survei"}</h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateSurvey} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Judul</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Survei Kepuasan Alumni"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Link Form</label>
                <input
                  type="url"
                  value={form.form_url}
                  onChange={(e) => setForm({ ...form, form_url: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://forms.google.com/..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-24"
                  placeholder="Deskripsi singkat survei..."
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Aktifkan survei
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 text-sm rounded-lg border"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : editingSurvey ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
