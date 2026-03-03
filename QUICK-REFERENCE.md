# Quick Reference - Portal Alumni Al Bahjah

## 🚀 Start Development

### Backend
```cmd
cd backend\cmd
go run main.go
```
Berjalan di: http://localhost:8080

### Frontend
```cmd
cd frontend
npm run dev
```
Berjalan di: http://localhost:3000

---

## 📁 Struktur File Penting

```
project-alumni/
├── backend/
│   ├── cmd/
│   │   ├── .env                    # Konfigurasi backend
│   │   └── main.go                 # Entry point
│   ├── db/
│   │   └── migrations/
│   │       └── 001_init.sql        # Database schema
│   └── internal/
│       ├── handler/                # API handlers
│       ├── middleware/             # CORS, JWT
│       └── util/                   # Email, JWT utils
│
├── frontend/
│   ├── .env.local                  # Konfigurasi frontend (API URL)
│   ├── public/                     # File statis (foto, gambar)
│   │   ├── images/                 # Logo, banner
│   │   └── uploads/profiles/       # Foto profil user
│   └── src/
│       ├── app/                    # Pages (Next.js App Router)
│       ├── lib/api.ts              # Axios client
│       └── store/authStore.ts      # Auth state management
│
├── setup-database.sql              # Script setup database
├── QUICK-START.md                  # Panduan setup lengkap
├── TROUBLESHOOTING.md              # Debugging guide
└── EMAIL-SETUP-GUIDE.md            # Setup email Resend
```

---

## 🔧 Konfigurasi File

### backend/cmd/.env
```env
PORT=8080
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=""
DB_NAME=alumni_albahjah

JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long

SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_your_api_key_here  # <-- Ganti dengan API key Resend Anda
SMTP_FROM=Portal Alumni Al Bahjah <onboarding@resend.dev>
```

### frontend/.env.local
```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

---

## 🗄️ Database Commands

### Setup Database
```cmd
mysql -u root -p < setup-database.sql
```

### Manual Setup
```sql
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumni_albahjah;
SOURCE backend/db/migrations/001_init.sql;
```

### Reset Database (HATI-HATI!)
```sql
DROP DATABASE IF EXISTS alumni_albahjah;
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumni_albahjah;
SOURCE backend/db/migrations/001_init.sql;
```

### Cek Data
```sql
USE alumni_albahjah;
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM profiles;
```

---

## 📧 Email Setup (Resend)

### 1. Daftar & Dapatkan API Key
1. Buka: https://resend.com
2. Sign up (gratis)
3. Dashboard → API Keys → Create API Key
4. Copy API key (format: `re_xxxxx...`)

### 2. Update .env
```env
SMTP_PASSWORD=re_your_new_api_key
```

### 3. Test Email
```cmd
cd backend
go run test-email.go
```

**Detail lengkap:** Lihat [EMAIL-SETUP-GUIDE.md](EMAIL-SETUP-GUIDE.md)

---

## 🖼️ Upload Foto

### Lokasi File
```
frontend/public/
├── images/              # Logo, banner, icon
└── uploads/
    └── profiles/        # Foto profil user
```

### Akses di Kode
```tsx
<img src="/images/logo.png" alt="Logo" />
<img src="/uploads/profiles/user-123.jpg" alt="Profile" />
```

### Simpan di Database
```
photo_url: "/uploads/profiles/user-123.jpg"
```

**Detail lengkap:** Lihat [UPLOAD-FOTO-GUIDE.md](UPLOAD-FOTO-GUIDE.md)

---

## 🔐 API Endpoints

### Public (No Auth)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/register | Registrasi |
| POST | /api/auth/login | Login |
| GET | /api/auth/verify?token= | Verifikasi email |
| POST | /api/auth/forgot-password | Lupa password |
| POST | /api/auth/reset-password | Reset password |

### Private (Butuh JWT Token)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/private/profile | Get profil |
| PUT | /api/private/profile | Update profil |
| GET | /api/private/directory | Direktori alumni |
| GET | /api/private/jobs | Lowongan kerja |
| GET | /api/private/surveys | Survei |

---

## 🐛 Common Issues & Fixes

### CORS Error
**Error:** `Access-Control-Allow-Origin`
**Fix:** Pastikan frontend di port 3000, atau restart backend setelah update CORS

### Network Error
**Error:** `Network Error` atau `ERR_FAILED`
**Fix:** 
- Pastikan backend running di port 8080
- Cek file `.env.local` ada di frontend
- Restart frontend

### Email Tidak Terkirim
**Fix:**
1. Setup Resend API key (lihat EMAIL-SETUP-GUIDE.md)
2. Test dengan: `go run backend/test-email.go`

### Styling Tidak Tampil
**Fix:**
```cmd
cd frontend
rmdir /s /q .next
npm run dev
```

### Database Error
**Fix:**
```cmd
# Cek MySQL running
sc query MySQL80

# Start MySQL
net start MySQL80

# Setup database
mysql -u root -p < setup-database.sql
```

---

## 📚 Dokumentasi Lengkap

- **[QUICK-START.md](QUICK-START.md)** - Setup dari awal
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** - Debugging guide
- **[EMAIL-SETUP-GUIDE.md](EMAIL-SETUP-GUIDE.md)** - Setup email Resend
- **[UPLOAD-FOTO-GUIDE.md](UPLOAD-FOTO-GUIDE.md)** - Implementasi upload foto
- **[README.md](README.md)** - Overview project

---

## ✅ Development Checklist

- [ ] MySQL service berjalan
- [ ] Database `alumni_albahjah` sudah dibuat
- [ ] Backend running di port 8080
- [ ] Frontend running di port 3000
- [ ] File `.env.local` ada di frontend
- [ ] Resend API key sudah dikonfigurasi
- [ ] Test registrasi berhasil
- [ ] Email verifikasi terkirim
- [ ] Login berhasil

---

## 🆘 Need Help?

1. Cek log di terminal backend untuk error messages
2. Buka browser DevTools (F12) → Console tab
3. Lihat TROUBLESHOOTING.md untuk solusi spesifik
4. Test komponen individual (database, email, API)
