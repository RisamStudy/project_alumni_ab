"use client";

import { ChangeEvent, useEffect, useState } from "react";
import Link from "next/link";
import { privateApi } from "@/lib/api";
import { Event } from "@/types";
import { Calendar, Clock, MapPin, Pencil, Plus, Trash2, Video, X } from "lucide-react";

export default function EventPage() {
  const MAX_POSTER_SIZE = 5 * 1024 * 1024;
  const MAX_THUMBNAIL_LENGTH = 60000;

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [posterName, setPosterName] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    event_type: "offline" as "offline" | "online",
    zoom_link: "",
    start_time: "",
    end_time: "",
    thumbnail: "",
  });

  const loadEvents = () =>
    privateApi.listEvents(1, 50).then((r) => setEvents(r.data.data?.events || []));

  useEffect(() => {
    loadEvents().finally(() => setLoading(false));
  }, []);

  const formatDateTimeLocal = (value?: string) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const fileToPosterDataURL = (file: File): Promise<string> =>
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

        // Fill white so PNG transparency doesn't turn black after JPEG conversion.
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let result = canvas.toDataURL("image/jpeg", quality);
        while (result.length > MAX_THUMBNAIL_LENGTH && quality > 0.4) {
          quality -= 0.1;
          result = canvas.toDataURL("image/jpeg", quality);
        }

        URL.revokeObjectURL(objectURL);
        if (result.length > MAX_THUMBNAIL_LENGTH) {
          reject(new Error("Ukuran poster terlalu besar. Gunakan gambar dengan resolusi lebih kecil."));
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

  const handlePosterUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File poster harus berupa gambar.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_POSTER_SIZE) {
      setError("Ukuran file maksimal 5MB.");
      e.target.value = "";
      return;
    }

    try {
      const posterDataURL = await fileToPosterDataURL(file);
      setForm((prev) => ({ ...prev, thumbnail: posterDataURL }));
      setPosterName(file.name);
      setError("");
    } catch (err: unknown) {
      setError((err as Error)?.message || "Gagal memproses poster.");
    } finally {
      e.target.value = "";
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      description: "",
      location: "",
      event_type: "offline",
      zoom_link: "",
      start_time: "",
      end_time: "",
      thumbnail: "",
    });
    setEditingEvent(null);
    setPosterName("");
    setError("");
  };

  const openCreateModal = () => {
    resetForm();
    setShowFormModal(true);
  };

  const openEditModal = async (event: Event) => {
    try {
      setError("");
      const detail = await privateApi.getEventPrivate(event.id);
      const data = detail.data.data as Event;
      setForm({
        title: data.title || "",
        description: data.description || "",
        location: data.location || "",
        event_type: data.event_type || "offline",
        zoom_link: data.zoom_link || "",
        start_time: formatDateTimeLocal(data.start_time),
        end_time: formatDateTimeLocal(data.end_time),
        thumbnail: data.thumbnail || "",
      });
      setPosterName("");
      setEditingEvent(event);
      setShowFormModal(true);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal mengambil detail event.";
      setError(message);
    }
  };

  const handleCreateOrUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    if (!form.title.trim() || !form.start_time) {
      setError("Judul dan waktu mulai wajib diisi.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        location: form.location.trim() || undefined,
        event_type: form.event_type,
        zoom_link: form.zoom_link.trim() || undefined,
        start_time: new Date(form.start_time).toISOString(),
        end_time: form.end_time ? new Date(form.end_time).toISOString() : undefined,
        thumbnail: form.thumbnail.trim() || undefined,
        published: true,
      };

      if (editingEvent) {
        await privateApi.updateEvent(editingEvent.id, payload);
      } else {
        await privateApi.createEvent(payload);
      }

      await loadEvents();
      setShowFormModal(false);
      resetForm();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (editingEvent ? "Gagal memperbarui event." : "Gagal menambahkan event.");
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const ok = window.confirm("Hapus event ini?");
    if (!ok) return;

    try {
      setDeletingId(eventId);
      await privateApi.deleteEvent(eventId);
      await loadEvents();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Gagal menghapus event.";
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">Kelola event milik Anda. Admin dapat mengelola semua event.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center gap-2"
        >
          <Plus size={16} />
          Tambah Event
        </button>
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {loading ? (
        <div className="space-y-4">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <div key={i} className="bg-white border rounded-xl p-5 animate-pulse flex gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 rounded w-1/3" />
                </div>
              </div>
            ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">[EVENT]</p>
          <p>Belum ada event untuk akun ini</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const date = new Date(event.start_time);
            const isOnline = event.event_type === "online";
            return (
              <div
                key={event.id}
                className="bg-white border rounded-xl p-5 flex flex-col gap-4 sm:flex-row hover:shadow-md transition"
              >
                <div className="shrink-0 w-16 h-16 bg-primary-50 rounded-xl flex flex-col items-center justify-center text-primary-600 overflow-hidden">
                  {event.thumbnail ? (
                    <img src={event.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-xs font-medium uppercase">
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-2xl font-bold leading-none">{date.getDate()}</span>
                    </>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${
                          isOnline ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
                        }`}
                      >
                        {isOnline ? "Online" : "Offline"}
                      </span>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} />
                          {date.toLocaleDateString("id-ID", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} />
                          {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} />
                            {event.location}
                          </span>
                        )}
                        {isOnline && event.zoom_link && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Video size={11} />
                            Online via Zoom
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:justify-end shrink-0">
                      <Link
                        href={`/home/event/${event.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Detail
                      </Link>
                      {event.can_manage && (
                        <>
                          <button
                            onClick={() => openEditModal(event)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            <Pencil size={13} />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            disabled={deletingId === event.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            <Trash2 size={13} />
                            {deletingId === event.id ? "Menghapus..." : "Hapus"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showFormModal && (
        <div className="fixed inset-0 z-40 bg-black/40 px-4 py-8 overflow-y-auto">
          <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xl border">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-semibold text-gray-900">{editingEvent ? "Edit Event" : "Tambah Event"}</h2>
              <button onClick={() => setShowFormModal(false)} className="text-gray-400 hover:text-gray-600" aria-label="Tutup">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateOrUpdateEvent} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Judul</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Reuni Alumni"
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Tipe Event</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => setForm({ ...form, event_type: e.target.value as "offline" | "online" })}
                    className="w-full border rounded-lg px-3 py-2 text-sm bg-white"
                  >
                    <option value="offline">Offline</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Lokasi</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Bandung / Zoom"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Mulai</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-gray-700">Selesai</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Link Zoom (opsional)</label>
                <input
                  value={form.zoom_link}
                  onChange={(e) => setForm({ ...form, zoom_link: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Upload Poster (opsional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePosterUpload}
                  className="w-full border rounded-lg px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-50 file:px-3 file:py-1 file:text-primary-700"
                />
                <p className="text-xs text-gray-500">Format gambar, maksimal 5MB.</p>
                {posterName && (
                  <p className="text-xs text-gray-600">File dipilih: {posterName}</p>
                )}
                {form.thumbnail && (
                  <div className="rounded-lg border p-2 space-y-2">
                    <img src={form.thumbnail} alt="Preview poster" className="w-full max-h-56 object-contain rounded-md bg-gray-100" />
                    <button
                      type="button"
                      onClick={() => {
                        setForm((prev) => ({ ...prev, thumbnail: "" }));
                        setPosterName("");
                      }}
                      className="text-xs text-rose-600 hover:underline"
                    >
                      Hapus poster
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm text-gray-700">Deskripsi</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm min-h-24"
                  placeholder="Tulis deskripsi event..."
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="pt-1 flex items-center justify-end gap-2">
                <button type="button" onClick={() => setShowFormModal(false)} className="px-4 py-2 text-sm rounded-lg border">
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : editingEvent ? "Simpan Perubahan" : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
