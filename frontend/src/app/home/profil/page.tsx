"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { privateApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Save } from "lucide-react";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
const MAX_PROFILE_PHOTO_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_PROFILE_PHOTO_DIMENSION = 1600;

const resolvePhotoURL = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  if (url.startsWith("/uploads/") && API_BASE_URL) return `${API_BASE_URL}${url}`;
  return url;
};

const canvasToJpegBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Gagal mengonversi gambar."));
          return;
        }
        resolve(blob);
      },
      "image/jpeg",
      quality
    );
  });

export default function ProfilPage() {
  const { user, updateProfileCompletion, updateProfilePhoto } = useAuthStore();
  const [form, setForm] = useState({
    photo_url: "",
    phone: "",
    graduation_year: "",
    major: "",
    city: "",
    job_title: "",
    company: "",
    bio: "",
    linkedin_url: "",
    instagram_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");

  useEffect(() => {
    privateApi.getProfile().then((r) => {
      const p = r.data.data?.profile || {};
      setForm({
        photo_url: p.photo_url?.String || "",
        phone: p.phone?.String || "",
        graduation_year: p.graduation_year?.Int16?.toString() || "",
        major: p.major?.String || "",
        city: p.city?.String || "",
        job_title: p.job_title?.String || "",
        company: p.company?.String || "",
        bio: p.bio?.String || "",
        linkedin_url: p.linkedin_url?.String || "",
        instagram_url: p.instagram_url?.String || "",
      });
    }).finally(() => setLoading(false));
  }, []);

  const convertProfilePhoto = async (file: File): Promise<File> => {
    const objectURL = URL.createObjectURL(file);
    const img = new Image();

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("File gambar tidak valid."));
        img.src = objectURL;
      });

      const scale = Math.min(1, MAX_PROFILE_PHOTO_DIMENSION / img.width, MAX_PROFILE_PHOTO_DIMENSION / img.height);
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas tidak tersedia.");
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      let quality = 0.9;
      while (quality >= 0.4) {
        const blob = await canvasToJpegBlob(canvas, quality);
        if (blob.size <= MAX_PROFILE_PHOTO_SIZE) {
          return new File([blob], `profile-${Date.now()}.jpg`, { type: "image/jpeg" });
        }
        quality -= 0.1;
      }

      throw new Error("Ukuran foto setelah konversi masih lebih dari 10MB.");
    } finally {
      URL.revokeObjectURL(objectURL);
    }
  };

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setPhotoError("File harus berupa gambar (JPG, PNG, atau WebP).");
      e.target.value = "";
      return;
    }

    setPhotoUploading(true);
    setPhotoError("");
    setSaved(false);

    try {
      const converted = await convertProfilePhoto(file);
      const res = await privateApi.uploadProfilePhoto(converted);
      const photoURL = res.data?.data?.photo_url as string | undefined;
      if (!photoURL) {
        throw new Error("URL foto dari server tidak ditemukan.");
      }

      setForm((prev) => ({ ...prev, photo_url: photoURL }));
      setPhotoFileName(file.name);
    } catch (err: unknown) {
      setPhotoError((err as Error)?.message || "Gagal upload foto profil.");
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await privateApi.updateProfile({
        ...form,
        graduation_year: form.graduation_year ? parseInt(form.graduation_year) : null,
      });
      // Recalculate completion
      const pct = [form.photo_url, form.phone, form.graduation_year, form.major, form.city, form.job_title]
        .filter(Boolean).length;
      updateProfileCompletion(Math.min(100, pct * 17));
      // Sync photo_url to auth store so navbar updates immediately
      updateProfilePhoto(form.photo_url);
      setSaved(true);
      setTimeout(() => setSaved(false), 3001);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-primary-500" size={32} /></div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-gray-500 text-sm mt-1">Lengkapi profil untuk membangun jaringan yang lebih luas.</p>
      </div>

      {/* Basic info (read only) */}
      <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary-200 flex items-center justify-center text-primary-700 text-xl font-bold overflow-hidden">
          {form.photo_url ? (
            <img src={resolvePhotoURL(form.photo_url)} alt="" className="w-full h-full object-cover" />
          ) : user?.full_name?.charAt(0)}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{user?.full_name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <p className="text-xs text-primary-500 mt-0.5">Kelengkapan profil: {user?.profile_completion || 0}%</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white border rounded-xl p-6 space-y-5">
        <h2 className="font-semibold text-gray-800 pb-3 border-b">Informasi Profil</h2>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Foto Profil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            disabled={photoUploading}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-primary-700"
          />
          <p className="text-xs text-gray-500">
            Upload JPG/PNG/WebP. File akan dikonversi otomatis sebelum upload, dengan ukuran maksimal 10MB.
          </p>
          {photoUploading && <p className="text-xs text-primary-500">Mengupload foto...</p>}
          {photoFileName && <p className="text-xs text-gray-600">File dipilih: {photoFileName}</p>}
          {photoError && <p className="text-sm text-red-600">{photoError}</p>}
          {form.photo_url && (
            <button
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, photo_url: "" }));
                setPhotoFileName("");
                setPhotoError("");
              }}
              className="text-xs text-rose-600 hover:text-rose-700 hover:underline transition"
            >
              Hapus foto profil
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor HP</label>
            <input type="tel" placeholder="+62 812 ..." value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahun Lulus</label>
            <input type="number" placeholder="2020" min="1990" max="2030" value={form.graduation_year}
              onChange={(e) => setForm({ ...form, graduation_year: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Divisi</label>
            <input type="text" placeholder="Tahfidz Quran" value={form.major}
              onChange={(e) => setForm({ ...form, major: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Kota Domisili</label>
            <input type="text" placeholder="Jakarta" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Jabatan</label>
            <input type="text" placeholder="Software Engineer" value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Perusahaan</label>
            <input type="text" placeholder="PT. Contoh" value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Bio</label>
          <textarea placeholder="Ceritakan sedikit tentang diri Anda..." value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            rows={3}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">LinkedIn URL</label>
          <input type="url" placeholder="https://linkedin.com/in/..." value={form.linkedin_url}
            onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
          <input type="url" placeholder="https://instagram.com/username" value={form.instagram_url}
            onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving || photoUploading}
            className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-60 flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan Perubahan
          </button>
          {saved && <span className="text-sm text-primary-500">Tersimpan!</span>}
        </div>
      </form>
    </div>
  );
}
