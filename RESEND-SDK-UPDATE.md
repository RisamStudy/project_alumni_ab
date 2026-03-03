# Update: Menggunakan Resend SDK (Bukan SMTP)

## ✅ Yang Sudah Diupdate

Saya sudah mengupdate kode untuk menggunakan **Resend SDK** yang resmi, bukan SMTP biasa.

### Perubahan File:

1. **backend/.env** dan **backend/cmd/.env**
   - Ganti `SMTP_*` dengan `RESEND_API_KEY` dan `EMAIL_FROM`

2. **backend/internal/util/email.go**
   - Menggunakan `resend-go/v2` SDK
   - Email sekarang dikirim dengan HTML + Text format
   - Lebih reliable dan sesuai dokumentasi Resend

3. **backend/cmd/main.go**
   - Update email config untuk menggunakan Resend SDK

4. **backend/test-email.go**
   - Update test script untuk menggunakan Resend SDK

5. **go.mod**
   - Menambahkan dependency `github.com/resend/resend-go/v2`

---

## 🚀 Cara Menggunakan

### 1. Pastikan API Key Sudah Benar

Edit file `backend/cmd/.env`:

```env
# Resend Email
RESEND_API_KEY=re_your_actual_api_key_here  # <-- Ganti dengan API key Anda
EMAIL_FROM=Portal Alumni Al Bahjah <onboarding@resend.dev>
```

**Cara mendapatkan API key:**
1. Login ke https://resend.com
2. Dashboard → API Keys
3. Create API Key
4. Copy API key (format: `re_xxxxx...`)

### 2. Test Email

```cmd
cd backend
go run test-email.go
```

Masukkan email Anda saat diminta, lalu cek inbox.

### 3. Jalankan Backend

```cmd
cd backend\cmd
go run main.go
```

### 4. Test Registrasi

1. Buka: http://localhost:3000/register
2. Daftar dengan email ASLI Anda
3. Cek inbox (atau spam folder)
4. Klik link verifikasi

---

## 📧 Penting: Email Penerima untuk Development

Jika menggunakan `onboarding@resend.dev` (domain testing Resend):

### Email hanya bisa dikirim ke:
1. Email yang terdaftar di akun Resend Anda
2. Email yang ditambahkan di "Verified Emails"

### Cara menambahkan email penerima:

1. Login ke https://resend.com
2. Klik **"Domains"** di sidebar
3. Pilih domain **"onboarding@resend.dev"**
4. Scroll ke bagian **"Verified Emails"** atau **"Add Email"**
5. Tambahkan email yang akan digunakan untuk testing
6. Verifikasi email tersebut (cek inbox)

Setelah itu, email verifikasi akan terkirim ke email tersebut!

---

## 🎯 Alternatif: Gunakan Domain Sendiri (Production)

Jika Anda punya domain sendiri (misal: `albahjah.com`):

### 1. Tambahkan Domain di Resend

1. Dashboard → Domains → Add Domain
2. Masukkan domain Anda
3. Verifikasi dengan menambahkan DNS records

### 2. Update .env

```env
EMAIL_FROM=Portal Alumni Al Bahjah <noreply@albahjah.com>
```

### 3. Keuntungan:

- Bisa kirim ke email mana pun (tidak terbatas)
- Lebih profesional
- Tidak masuk spam
- Limit lebih besar (3,000 email/hari)

---

## 🔍 Troubleshooting

### Error: "Authentication credentials invalid"

**Penyebab:** API key salah atau expired

**Solusi:**
1. Generate API key baru di Resend dashboard
2. Update `RESEND_API_KEY` di `.env`
3. Restart backend

### Error: "Recipient not allowed"

**Penyebab:** Email penerima belum ditambahkan di Resend (untuk onboarding@resend.dev)

**Solusi:**
1. Login ke Resend dashboard
2. Domains → onboarding@resend.dev
3. Add email penerima
4. Verifikasi email tersebut

### Email Tidak Terkirim (Tidak Ada Error)

**Cek:**
1. Log backend saat registrasi
2. Resend dashboard → Emails → Lihat log pengiriman
3. Pastikan API key valid
4. Pastikan email penerima sudah verified (untuk onboarding@resend.dev)

### Email Masuk ke Spam

**Solusi:**
- Gunakan domain verified (bukan onboarding@resend.dev)
- Setup SPF, DKIM, DMARC records
- Warming up domain (kirim email bertahap)

---

## 📊 Cek Status Email

### Via Resend Dashboard:

1. Login ke https://resend.com
2. Klik **"Emails"** di sidebar
3. Lihat semua email yang terkirim
4. Klik email untuk detail (status, error, dll)

### Via Code:

Email ID dikembalikan saat pengiriman berhasil. Anda bisa simpan di database untuk tracking.

---

## 💡 Tips

1. **Development:**
   - Gunakan `onboarding@resend.dev`
   - Tambahkan email testing di Verified Emails
   - Gratis 100 email/hari

2. **Production:**
   - Setup domain sendiri
   - Verifikasi DNS records
   - Limit naik jadi 3,000 email/hari (free tier)

3. **Testing:**
   - Selalu test dengan `go run test-email.go` dulu
   - Cek Resend dashboard untuk log
   - Periksa spam folder jika tidak masuk inbox

4. **Security:**
   - Jangan commit API key ke Git
   - Gunakan environment variables
   - Rotate API key secara berkala

---

## ✅ Checklist

- [ ] Install Resend SDK: `go get github.com/resend/resend-go/v2`
- [ ] Update `.env` dengan `RESEND_API_KEY`
- [ ] Dapatkan API key dari Resend dashboard
- [ ] Tambahkan email testing di Verified Emails (jika pakai onboarding@resend.dev)
- [ ] Test dengan: `go run backend/test-email.go`
- [ ] Restart backend
- [ ] Test registrasi
- [ ] Cek inbox email
- [ ] Verifikasi email berhasil

---

## 📚 Dokumentasi Resend

- **Official Docs:** https://resend.com/docs
- **Go SDK:** https://github.com/resend/resend-go
- **Dashboard:** https://resend.com/overview
- **Email Logs:** https://resend.com/emails

---

## 🆘 Masih Bermasalah?

1. Cek log backend saat registrasi
2. Cek Resend dashboard → Emails untuk melihat status
3. Pastikan API key valid (test dengan `go run test-email.go`)
4. Pastikan email penerima sudah verified (untuk onboarding@resend.dev)
5. Cek spam folder
