"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    console.log(" Attempting login...");

    try {
      const res = await authApi.login(form.email, form.password);
      console.log(" Login response:", res.data);

      const { access_token, user } = res.data.data;
      console.log(" User data:", user);
      console.log(" Access token:", access_token ? "Present" : "Missing");

      login(access_token, user);
      console.log(" Auth state updated");

      console.log(" Redirecting to /home...");

      setTimeout(() => {
        window.location.href = "/home";
      }, 100);

    } catch (err: unknown) {
      console.error("❌ Login error:", err);
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Login gagal. Periksa email dan password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-full max-w-4xl grid md:grid-cols-2">

        {/* Left panel — mosque image */}
        <div className="relative hidden md:flex flex-col justify-end p-8 text-white min-h-[560px] bg-emerald-900">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('/mosque-bg.jpg')" }}
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-emerald-900/90 via-emerald-800/40 to-emerald-700/20" />

          {/* Text content */}
          <div className="relative z-10">
            <h2 className="text-2xl font-bold leading-snug mb-2">
              Selamat Datang Kembali
            </h2>
            <p className="text-emerald-100 text-sm leading-relaxed">
              Masuk ke portal alumni Al Bahjah dan tetap terhubung dengan keluarga besar pesantren.
            </p>

            {/* Avatar stack */}
            <div className="flex items-center gap-3 mt-6">
              <div className="flex -space-x-2">
                {["bg-amber-400", "bg-emerald-500", "bg-blue-400"].map((c, i) => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 border-white ${c} flex items-center justify-center text-white text-xs font-bold`}>
                    {["A", "B", "C"][i]}
                  </div>
                ))}
              </div>
              <p className="text-emerald-100 text-xs">500+ Alumni sudah bergabung</p>
            </div>
          </div>
        </div>

        {/* Right panel — login form */}
        <div className="p-8 md:p-10 flex flex-col justify-center">
          {/* Back button */}
          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition mb-6 w-fit">
            <ArrowLeft size={15} />
            Kembali ke Beranda
          </Link>

          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white border border-primary-100">
              <img src="/favicon.ico" alt="Logo Alumni Al Bahjah" className="w-full h-full object-contain" />
            </div>
              <div>
                <p className="font-bold text-gray-900 text-sm leading-none">ALUMNI</p>
                <p className="text-gray-400 text-xs">AL BAHJAH</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Masuk ke Akun Anda</h1>
            <p className="text-gray-500 text-sm mt-1">Masukkan email dan password untuk melanjutkan.</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-5 border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Password</label>
                <Link href="/lupa-password" className="text-xs text-primary-500 hover:underline">
                  Lupa Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-10"
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-60 flex items-center justify-center gap-2 mt-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Masuk
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{" "}
            <Link href="/register" className="text-primary-500 font-medium hover:underline">Daftar Sekarang</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
