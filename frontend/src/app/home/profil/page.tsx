"use client";

import { useEffect, useState } from "react";
import { privateApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Loader2, Save } from "lucide-react";

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
            <img src={form.photo_url} alt="" className="w-full h-full object-cover" />
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">URL Foto Profil (Gdrive)</label>
          <input type="url" placeholder="https://..." value={form.photo_url}
            onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
            className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
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
          <button type="submit" disabled={saving}
            className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-60 flex items-center gap-2">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            Simpan Perubahan
          </button>
          {saved && <span className="text-sm text-primary-500">✓ Tersimpan!</span>}
        </div>
      </form>
    </div>
  );
}
