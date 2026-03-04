"use client";

import { useState } from "react";
import Link from "next/link";
import { authApi } from "@/lib/api";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    full_name: "",
    birth_year: "",
    email: "",
    password: "",
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) { setError("Anda harus menyetujui syarat dan ketentuan"); return; }
    if (form.password.length < 8) { setError("Password minimal 8 karakter"); return; }

    setLoading(true);
    setError("");
    try {
      await authApi.register({
        ...form,
        birth_year: parseInt(form.birth_year),
      });
      setSuccess(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || "Gagal mendaftar. Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center shadow-sm border">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📧</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Cek Email Anda!</h2>
          <p className="text-gray-500 text-sm">
            Kami telah mengirimkan link verifikasi ke <strong>{form.email}</strong>.
            Klik link tersebut untuk mengaktifkan akun Anda.
          </p>
          <p className="text-xs text-gray-400 mt-4">Link berlaku selama 24 jam.</p>
          <Link href="/login" className="mt-6 inline-block text-primary-500 text-sm font-medium hover:underline">
            Kembali ke Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {/* Navbar minimal */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-white border border-primary-100">
              <img src="/favicon.ico" alt="Logo Alumni Al Bahjah" className="w-full h-full object-contain" />
            </div>
        <span className="font-bold text-dark-800 text-sm">ALUMNI AL BAHJAH</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden max-w-4xl w-full grid md:grid-cols-2">
        {/* Left Panel */}
        <div className="relative bg-dark-800 hidden md:flex flex-col justify-end p-8 text-white min-h-[600px]">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{ backgroundImage: "url('/mosque-bg.jpg')" }}
          />
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-3">Reconnect with your roots</h2>
            <p className="text-gray-300 text-sm leading-relaxed">
              Join thousands of alumni in continuing the noble mission and staying connected
              with our beloved Pesantren.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <div className="flex -space-x-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-7 h-7 rounded-full bg-primary-200/40 border-2 border-white/20" />
                ))}
              </div>
              <span className="text-sm text-gray-300">500+ Alumni already joined</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="p-8 md:p-10">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Create Your Account</h1>
          <p className="text-gray-500 text-sm mb-8">Fill in your details to join the Al Bahjah alumni network.</p>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-6 border border-red-200">
              {error}
            </div>
          )}

          <Link href="/" className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition mb-6 w-fit">
            <ArrowLeft size={15} />
            Kembali ke Beranda
          </Link>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter full name"
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pl-9"
                  />
                  <span className="absolute left-3 top-3 text-gray-400 text-sm">👤</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tahun Lahir</label>
                <div className="relative">
                  <select
                    value={form.birth_year}
                    onChange={(e) => setForm({ ...form, birth_year: e.target.value })}
                    required
                    className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 appearance-none pl-9"
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  <span className="absolute left-3 top-3 text-gray-400 text-sm">📅</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pl-9"
                />
                <span className="absolute left-3 top-3 text-gray-400 text-sm">✉️</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  className="w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 pl-9 pr-10"
                />
                <span className="absolute left-3 top-3 text-gray-400 text-sm">🔒</span>
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="agree"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 accent-primary-500"
              />
              <label htmlFor="agree" className="text-xs text-gray-500">
                By clicking "Create Account", I agree to the{" "}
                <Link href="/terms" className="text-primary-500 hover:underline">Terms of Service</Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary-500 hover:underline">Privacy Policy</Link>.
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 text-white py-3 rounded-lg font-semibold hover:bg-primary-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Create Account
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-primary-500 font-medium hover:underline">Log in</Link>
          </p>
        </div>
      </div>

      <div className="absolute bottom-4 text-xs text-gray-400 flex gap-4">
        <Link href="/help">Help Center</Link>
        <Link href="/guidelines">Community Guidelines</Link>
        <Link href="/contact">Contact Us</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </div>
    </div>
  );
}
