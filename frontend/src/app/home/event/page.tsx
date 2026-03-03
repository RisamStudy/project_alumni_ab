"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { publicApi, privateApi } from "@/lib/api";
import { Event } from "@/types";
import { MapPin, Calendar, Clock, Video } from "lucide-react";

export default function EventPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicApi.getEvents(1, 20)
      .then((r) => setEvents(r.data.data?.events || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Event Calendar</h1>
        <p className="text-gray-500 text-sm mt-1">Ikuti berbagai kegiatan dan acara alumni Al Bahjah.</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {Array(4).fill(0).map((_, i) => (
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
          <p className="text-4xl mb-3">📅</p>
          <p>Belum ada event tersedia</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => {
            const date = new Date(event.start_time);
            const isOnline = event.event_type === "online";
            return (
              <div key={event.id} className="bg-white border rounded-xl p-5 flex gap-4 hover:shadow-md transition">
                {/* Date badge */}
                <div className="shrink-0 w-16 h-16 bg-primary-50 rounded-xl flex flex-col items-center justify-center text-primary-600 overflow-hidden">
                  {event.thumbnail ? (
                    <img src={event.thumbnail} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <span className="text-xs font-medium uppercase">
                        {date.toLocaleDateString("en-US", { month: "short" })}
                      </span>
                      <span className="text-2xl font-bold leading-none">
                        {date.getDate()}
                      </span>
                    </>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className={`inline-block text-xs px-2 py-0.5 rounded-full mb-1 ${
                        isOnline
                          ? "bg-blue-50 text-blue-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {isOnline ? "Online" : "Offline"}
                      </span>
                      <h3 className="font-semibold text-gray-900">{event.title}</h3>
                      {event.description && (
                        <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{event.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Calendar size={11} />
                          {date.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Clock size={11} />
                          {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin size={11} />{event.location}
                          </span>
                        )}
                        {isOnline && event.zoom_link && (
                          <span className="flex items-center gap-1 text-xs text-blue-400">
                            <Video size={11} />Online via Zoom
                          </span>
                        )}
                      </div>
                    </div>
                    <Link
                      href={`/home/event/${event.id}`}
                      className="shrink-0 bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition"
                    >
                      Detail
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
