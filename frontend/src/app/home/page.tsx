"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { publicApi, privateApi } from "@/lib/api";
import { News, Event, Job } from "@/types";
import { CalendarDays, MapPin, ArrowRight, CheckCircle } from "lucide-react";

export default function HomeDashboard() {
  const { user } = useAuthStore();
  const [news, setNews] = useState<News[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log("🏠 Home page mounted, fetching data...");
    
    Promise.all([
      publicApi.getNews(1, 3).catch(err => {
        console.error("❌ Failed to fetch news:", err);
        return { data: { data: { news: [] } } };
      }),
      publicApi.getEvents(1, 2).catch(err => {
        console.error("❌ Failed to fetch events:", err);
        return { data: { data: { events: [] } } };
      }),
      privateApi.getJobs(1, 3).catch(err => {
        console.error("❌ Failed to fetch jobs:", err);
        return { data: { data: { jobs: [] } } };
      }),
    ]).then(([n, e, j]) => {
      console.log("✅ Data fetched successfully");
      setNews(n.data.data?.news || []);
      setEvents(e.data.data?.events || []);
      setJobs(j.data.data?.jobs || []);
    }).catch(err => {
      console.error("❌ Unexpected error:", err);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const completion = user?.profile_completion || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Ahlan wa Sahlan, {user?.full_name?.split(" ")[0]}!
          </h1>
          <p className="text-gray-500 text-sm mt-1">Welcome back to your alumni community hub.</p>
        </div>
      </div>

      {/* Profile completion banner */}
      {completion < 100 && (
        <div className="bg-white border rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
            <CheckCircle className="text-primary-500" size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <p className="font-medium text-gray-900 text-sm">Complete Your Profile</p>
              <span className="text-primary-500 font-bold text-sm">{completion}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Complete your profile to unlock all career opportunities, job listings, and the alumni directory.
            </p>
          </div>
          <Link href="/home/profil"
            className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition shrink-0">
            Complete Profile
          </Link>
        </div>
      )}

      {/* Quick Access */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "News Feed", href: "/home", emoji: "📰" },
            { label: "Directory", href: "/home/direktori", emoji: "👥" },
            { label: "Events", href: "/home/event", emoji: "📅" },
            { label: "Jobs Hub", href: "/home/lowongan", emoji: "💼" },
            { label: "Surveys", href: "/home/survei", emoji: "📋" },
          ].map(({ label, href, emoji }) => (
            <Link key={href} href={href}
              className="bg-white border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-primary-300 hover:shadow-sm transition">
              <span className="text-2xl">{emoji}</span>
              <span className="text-xs font-medium text-gray-700">{label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Events + Jobs */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/home/event" className="text-primary-500 text-xs hover:underline flex items-center gap-1">
              See all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            {loading ? (
              [1,2].map(i => (
                <div key={i} className="bg-white border rounded-xl p-4 flex gap-3 animate-pulse">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              ))
            ) : events.map((event) => {
              const date = new Date(event.start_time);
              return (
                <div key={event.id} className="bg-white border rounded-xl p-4 flex gap-4 items-center">
                  <div className="shrink-0 w-14 h-14 overflow-hidden rounded-lg bg-gray-100">
                    {event.thumbnail && <img src={event.thumbnail} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 uppercase">{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{event.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                      {event.location && <span className="flex items-center gap-1"><MapPin size={10} />{event.location}</span>}
                    </div>
                  </div>
                  <Link href={`/home/event/${event.id}`}
                    className="text-xs border border-primary-500 text-primary-500 px-3 py-1 rounded-lg hover:bg-primary-50 transition shrink-0">
                    Register
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* Top Jobs */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Top Opportunities</h2>
            <Link href="/home/lowongan" className="text-primary-500 text-xs hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-white border rounded-xl divide-y">
            {loading ? (
              [1,2,3].map(i => (
                <div key={i} className="p-4 flex gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))
            ) : jobs.map((job) => (
              <div key={job.id} className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg shrink-0">🏢</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{job.title}</p>
                  <p className="text-xs text-gray-400">{job.company} • {job.location || "Remote"}</p>
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

      {/* Community News */}
      <section>
        <h2 className="font-semibold text-gray-900 mb-4">Community News</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="bg-white border rounded-xl overflow-hidden animate-pulse">
                <div className="h-40 bg-gray-100" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))
          ) : news.map((item) => (
            <Link key={item.id} href={`/berita/${item.slug}`}
              className="bg-white border rounded-xl overflow-hidden hover:shadow-md transition group">
              <div className="h-40 bg-gray-100 overflow-hidden">
                {item.thumbnail && (
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition" />
                )}
              </div>
              <div className="p-4">
                {item.category && (
                  <span className="text-xs text-primary-500 font-semibold uppercase tracking-wide">{item.category}</span>
                )}
                <h3 className="font-semibold text-gray-900 text-sm mt-1 line-clamp-2">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-2">
                  Posted {new Date(item.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
