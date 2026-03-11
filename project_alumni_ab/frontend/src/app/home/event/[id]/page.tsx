"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { publicApi, privateApi } from "@/lib/api";
import { Event } from "@/types";
import { MapPin, Calendar, Clock, Video, ArrowLeft, CheckCircle } from "lucide-react";

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [registered, setRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [regStatus, setRegStatus] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([
      publicApi.getEventById(id),
      privateApi.getEventRegistration(id).catch(() => null),
    ]).then(([eventRes, regRes]) => {
      setEvent(eventRes.data.data);
      if (regRes?.data?.data?.registered) {
        setRegistered(true);
        setRegStatus(regRes.data.data.status);
      }
    }).finally(() => setLoading(false));
  }, [id]);

  const handleRegister = async () => {
    if (!id) return;
    setRegistering(true);
    try {
      await privateApi.registerEvent(id, "registered");
      setRegistered(true);
      setRegStatus("registered");
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error?.response?.data?.message || "Gagal mendaftar event");
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-8 bg-gray-100 rounded w-3/4" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-full" />
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-20 text-gray-400">
        <p className="text-4xl mb-3">❌</p>
        <p>Event tidak ditemukan</p>
        <Link href="/home/event" className="text-primary-500 text-sm mt-4 inline-block hover:underline">
          ← Kembali ke daftar event
        </Link>
      </div>
    );
  }

  const date = new Date(event.start_time);
  const isOnline = event.event_type === "online";

  return (
    <div className="max-w-2xl">
      <Link href="/home/event" className="flex items-center gap-1 text-sm text-gray-500 hover:text-primary-500 mb-6 transition">
        <ArrowLeft size={14} /> Kembali ke daftar event
      </Link>

      {/* Thumbnail */}
      {event.thumbnail && (
        <div className="w-full rounded-xl overflow-hidden mb-6 bg-gray-100">
          <img src={event.thumbnail} alt={event.title} className="w-full h-auto object-contain" />
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-2 ${
          isOnline ? "bg-blue-50 text-blue-600" : "bg-green-50 text-green-600"
        }`}>
          {isOnline ? "Online" : "Offline"}
        </span>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
      </div>

      {/* Details */}
      <div className="bg-white border rounded-xl p-5 mb-6 space-y-3">
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Calendar size={16} className="text-primary-500 shrink-0" />
          <span>{date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <Clock size={16} className="text-primary-500 shrink-0" />
          <span>{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB</span>
        </div>
        {event.location && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <MapPin size={16} className="text-primary-500 shrink-0" />
            <span>{event.location}</span>
          </div>
        )}
        {isOnline && event.zoom_link && (
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <Video size={16} className="text-blue-500 shrink-0" />
            <a href={event.zoom_link} target="_blank" rel="noopener noreferrer"
              className="text-blue-500 hover:underline truncate">
              {event.zoom_link}
            </a>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <div className="bg-white border rounded-xl p-5 mb-6">
          <h2 className="font-semibold text-gray-800 mb-3">Deskripsi</h2>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Registration */}
      <div className="bg-white border rounded-xl p-5">
        {registered ? (
          <div className="flex items-center gap-3 text-green-600">
            <CheckCircle size={20} />
            <div>
              <p className="font-semibold">Anda sudah terdaftar!</p>
              <p className="text-sm text-gray-500">Status: {regStatus}</p>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="font-semibold text-gray-800 mb-2">Daftar Event</h2>
            <p className="text-sm text-gray-500 mb-4">Klik tombol di bawah untuk mendaftar ke event ini.</p>
            <button
              onClick={handleRegister}
              disabled={registering}
              className="bg-primary-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-600 transition disabled:opacity-60"
            >
              {registering ? "Mendaftar..." : "Daftar Sekarang"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
