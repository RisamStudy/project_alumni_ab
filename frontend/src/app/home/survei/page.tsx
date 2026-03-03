"use client";

import { useEffect, useState } from "react";
import { privateApi } from "@/lib/api";
import { Survey } from "@/types";
import { ExternalLink, ClipboardList } from "lucide-react";

export default function SurveiPage() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    privateApi.getSurveys().then((r) => setSurveys(r.data.data || [])).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Survei Alumni</h1>
        <p className="text-gray-500 text-sm mt-1">Bantu kami meningkatkan layanan dengan mengisi survei berikut.</p>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {[1,2].map(i => (
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
            <div key={s.id} className="bg-white border rounded-xl p-5">
              <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mb-3">
                <ClipboardList size={20} className="text-primary-500" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{s.title}</h3>
              {s.description && <p className="text-sm text-gray-500 mb-4">{s.description}</p>}
              <a href={s.form_url} target="_blank" rel="noopener noreferrer"
                className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition inline-flex items-center gap-2">
                Isi Survei <ExternalLink size={13} />
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
