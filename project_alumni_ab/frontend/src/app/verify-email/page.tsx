"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function VerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) { setStatus("error"); setMessage("Token tidak ditemukan."); return; }
    api.get(`/api/auth/verify?token=${token}`)
      .then((r) => { setStatus("success"); setMessage(r.data.message); })
      .catch((e) => { setStatus("error"); setMessage(e.response?.data?.message || "Token tidak valid atau sudah kadaluarsa."); });
  }, [token]);

  return (
    <div className="text-center">
      {status === "loading" && (
        <>
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p className="text-gray-500">Memverifikasi email Anda...</p>
        </>
      )}
      {status === "success" && (
        <>
          <div className="text-5xl mb-4"></div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Email Terverifikasi!</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link href="/login"
            className="bg-primary-500 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-primary-600 transition">
            Login Sekarang
          </Link>
        </>
      )}
      {status === "error" && (
        <>
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Verifikasi Gagal</h2>
          <p className="text-gray-500 text-sm mb-6">{message}</p>
          <Link href="/register" className="text-primary-500 text-sm font-medium hover:underline">
            Daftar Ulang
          </Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border p-10 max-w-md w-full">
        <Suspense fallback={<div className="text-center text-gray-500">Loading...</div>}>
          <VerifyContent />
        </Suspense>
      </div>
    </div>
  );
}
