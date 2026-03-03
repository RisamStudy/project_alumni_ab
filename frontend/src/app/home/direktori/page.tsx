"use client";

import { useEffect, useState, useCallback } from "react";
import { privateApi } from "@/lib/api";
import { Alumni } from "@/types";
import { Search, MapPin, Building2, Linkedin, Instagram } from "lucide-react";

export default function DirekturiPage() {
  const [alumni, setAlumni] = useState<Alumni[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchAlumni = useCallback(async () => {
    setLoading(true);
    try {
      const res = await privateApi.getDirectory(search, page, 12);
      setAlumni(res.data.data?.alumni || []);
      setTotal(res.data.data?.total || 0);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const t = setTimeout(fetchAlumni, 400);
    return () => clearTimeout(t);
  }, [fetchAlumni]);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Alumni Directory</h1>
        <p className="text-gray-500 text-sm mt-1">Temukan teman seangkatan dan jalin relasi profesional.</p>
      </div>

      {/* Search */}
      <div className="bg-white border rounded-xl p-4 mb-6">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari alumni berdasarkan nama atau kota..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        {total > 0 && <p className="text-xs text-gray-400 mt-2">{total} alumni terdaftar</p>}
      </div>

      {/* Alumni grid */}
      {loading ? (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className="bg-white border rounded-xl p-5 animate-pulse">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3" />
              <div className="h-4 bg-gray-100 rounded w-3/4 mx-auto mb-2" />
              <div className="h-3 bg-gray-100 rounded w-1/2 mx-auto" />
            </div>
          ))}
        </div>
      ) : alumni.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p>Tidak ada alumni ditemukan</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-4">
          {alumni.map((a) => (
            <div key={a.id} className="bg-white border rounded-xl p-5 text-center hover:shadow-md transition">
              <div className="w-16 h-16 bg-primary-100 rounded-full mx-auto mb-3 overflow-hidden flex items-center justify-center">
                {a.photo_url ? (
                  <img src={a.photo_url} alt={a.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary-600 text-xl font-bold">{a.full_name.charAt(0)}</span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 text-sm truncate">{a.full_name}</h3>
              {a.job_title && (
                <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1 truncate">
                  <Building2 size={10} />{a.job_title}{a.company ? ` @ ${a.company}` : ""}
                </p>
              )}
              {a.city && (
                <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1">
                  <MapPin size={10} />{a.city}
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

      {/* Pagination */}
      {total > 12 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-500">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={alumni.length < 12}
            className="px-4 py-2 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50 transition">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
