"use client";

import { useEffect, useState } from "react";
import { privateApi } from "@/lib/api";
import { Job } from "@/types";
import { useAuthStore } from "@/store/authStore";
import {
  Building2,
  Clock,
  ExternalLink,
  MapPin,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  UserCircle2,
  X,
} from "lucide-react";

const jobTypeLabel: Record<string, string> = {
  full_time: "Full Time",
  part_time: "Part Time",
  remote: "Remote",
  contract: "Kontrak",
};

export default function LowonganPage() {
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [detailJob, setDetailJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [posterInfo, setPosterInfo] = useState({
    fullName: "",
    phone: "",
    email: "",
  });
  const [form, setForm] = useState({
    title: "",
    company: "",
    location: "",
    job_type: "full_time" as Job["job_type"],
    description: "",
    apply_url: "",
    expires_at: "",
  });

  const loadJobs = () =>
    privateApi.getJobs().then((r) => setJobs(r.data.data?.jobs || []));

  useEffect(() => {
    Promise.all([
      loadJobs(),
      privateApi.getProfile().then((r) => {
        const data = r.data.data;
        const phone = data?.profile?.phone?.String || "";
        setPosterInfo({
          fullName: data?.full_name || "",
          phone,
          email: data?.email || "",
        });
      }),
    ]).finally(() => setLoading(false));
  }, []);

  const resetForm = () => {
    setForm({
      title: "",
      company: "",
      location: "",
      job_type: "full_time",
      description: "",
      apply_url: "",
      expires_at: "",
    });
    setEditingJob(null);
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = (job: Job) => {
    setForm({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      job_type: job.job_type || "full_time",
      description: job.description || "",
      apply_url: job.apply_url || "",
      expires_at: job.expires_at
        ? new Date(job.expires_at).toISOString().slice(0, 16)
        : "",
    });
    setEditingJob(job);
    setError("");
    setShowFormModal(true);
  };

  const handleCreateOrUpdateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.company.trim()) {
      setError("Judul dan perusahaan wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        company: form.company.trim(),
        location: form.location.trim() || undefined,
        job_type: form.job_type,
        description: form.description.trim() || undefined,
        apply_url: form.apply_url.trim() || undefined,
        expires_at: form.expires_at
          ? new Date(form.expires_at).toISOString()
          : undefined,
        published: true,
      };

      if (editingJob) {
        await privateApi.updateJob(editingJob.id, payload);
      } else {
        await privateApi.createJob(payload);
      }

      await loadJobs();
      setShowFormModal(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        (editingJob ? "Gagal memperbarui lowongan." : "Gagal menambahkan lowongan.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const ok = window.confirm("Hapus lowongan ini?");
    if (!ok) return;

    try {
      setDeletingId(jobId);
      await privateApi.deleteJob(jobId);
      await loadJobs();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || "Gagal menghapus lowongan.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Portal</h1>
          <p className="text-gray-500 text-sm mt-1">Akses lowongan pekerjaan khusus untuk alumni Al Bahjah.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Job
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-5 animate-pulse flex gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">[JOB]</p>
          <p>Belum ada lowongan tersedia</p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="bg-white border rounded-xl p-5 flex items-center gap-4 hover:shadow-md transition">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center text-slate-500 shrink-0">
                <Building2 size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{job.company}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {job.location && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MapPin size={11} />{job.location}
                        </span>
                      )}
                      <span className="text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">
                        {jobTypeLabel[job.job_type] || job.job_type}
                      </span>
                      {job.expires_at && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} />Tutup {new Date(job.expires_at).toLocaleDateString("id-ID")}
                        </span>
                      )}
                    </div>
                    <div className="mt-3 space-y-1">
                      {(() => {
                        const displayName =
                          job.poster?.full_name ||
                          (job.can_manage ? posterInfo.fullName || user?.full_name : undefined) ||
                          "Alumni";
                        const displayPhone =
                          job.poster?.phone ||
                          (job.can_manage ? posterInfo.phone : undefined) ||
                          "Nomor HP belum diisi di profil";
                        const displayEmail =
                          job.poster?.email ||
                          (job.can_manage ? posterInfo.email : undefined) ||
                          "Email belum diisi di profil";
                        return (
                          <>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <UserCircle2 size={12} />
                              Diposting oleh {displayName}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Phone size={12} />
                              {displayPhone}
                            </p>
                            <p className="text-xs text-gray-500 flex items-center gap-1.5">
                              <Mail size={12} />
                              {displayEmail}
                            </p>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setDetailJob(job)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Detail
                    </button>
                    {job.can_manage && (
                      <>
                        <button
                          onClick={() => openEditModal(job)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Pencil size={13} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          disabled={deletingId === job.id}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                        >
                          <Trash2 size={13} />
                          {deletingId === job.id ? "Menghapus..." : "Hapus"}
                        </button>
                      </>
                    )}
                    {job.apply_url && (
                      <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
                        className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition flex items-center gap-1.5">
                        Lamar <ExternalLink size={13} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailJob && (
        <div className="fixed inset-0 z-50 bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Detail Lowongan</h2>
              <button
                onClick={() => setDetailJob(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs uppercase text-gray-400">Judul</p>
                <p className="text-base font-semibold text-gray-900">{detailJob.title}</p>
                <p className="text-sm text-gray-500">{detailJob.company}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-sm text-gray-600">
                {detailJob.location && <div><span className="font-medium text-gray-800">Lokasi: </span>{detailJob.location}</div>}
                <div><span className="font-medium text-gray-800">Tipe: </span>{jobTypeLabel[detailJob.job_type] || detailJob.job_type}</div>
                <div><span className="font-medium text-gray-800">Diposting: </span>{new Date(detailJob.created_at).toLocaleDateString("id-ID")}</div>
                {detailJob.expires_at && <div><span className="font-medium text-gray-800">Tutup: </span>{new Date(detailJob.expires_at).toLocaleDateString("id-ID")}</div>}
              </div>
              {detailJob.poster && (
                <div className="rounded-lg border bg-gray-50 p-3 text-sm text-gray-700 space-y-1">
                  <p className="font-medium text-gray-800">Kontak Pemosting</p>
                  <p>Nama: {detailJob.poster.full_name}</p>
                  {detailJob.poster.email && <p>Email: {detailJob.poster.email}</p>}
                  {detailJob.poster.phone && <p>HP: {detailJob.poster.phone}</p>}
                </div>
              )}
              {detailJob.description && (
                <div>
                  <p className="text-sm font-medium text-gray-800 mb-1">Deskripsi</p>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                    {detailJob.description}
                  </p>
                </div>
              )}
              {detailJob.apply_url && (
                <a
                  href={detailJob.apply_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-500 text-white text-sm font-medium hover:bg-primary-600"
                >
                  Lamar
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          </div>
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-40 bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">
                {editingJob ? "Edit Lowongan" : "Tambah Lowongan"}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateJob} className="p-5 space-y-4">
              <div className="rounded-lg border border-primary-100 bg-primary-50 p-3 text-xs text-primary-700 space-y-1">
                <p className="font-medium">Identitas pemosting otomatis dari session:</p>
                <p>Nama: {posterInfo.fullName || user?.full_name || "-"}</p>
                <p>No HP: {posterInfo.phone || "Belum diisi di profil"}</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Judul</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Backend Developer"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Perusahaan</label>
                <input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="PT Contoh"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Lokasi</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Jakarta / Remote"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Tipe</label>
                  <select
                    value={form.job_type}
                    onChange={(e) => setForm({ ...form, job_type: e.target.value as Job["job_type"] })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="remote">Remote</option>
                    <option value="contract">Kontrak</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">URL Lamaran</label>
                <input
                  value={form.apply_url}
                  onChange={(e) => setForm({ ...form, apply_url: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Batas Lamaran</label>
                <input
                  type="datetime-local"
                  value={form.expires_at}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-24"
                  placeholder="Tulis deskripsi singkat pekerjaan..."
                />
              </div>
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
                  {saving
                    ? "Menyimpan..."
                    : editingJob
                    ? "Simpan Perubahan"
                    : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
