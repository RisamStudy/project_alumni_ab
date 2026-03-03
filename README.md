# Portal Alumni Al Bahjah

Website alumni resmi Pondok Pesantren Al Bahjah.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TailwindCSS, shadcn/ui, Zustand |
| Backend | Golang (native net/http) |
| Database | MySQL |
| Query | SQLC |
| Auth | JWT (Access Token + Refresh Token via HttpOnly Cookie) |
| Email | SMTP |

---

## Struktur Project

```
alumni-albahjah/
├── backend/
│   ├── cmd/main.go              # Entry point
│   ├── db/
│   │   ├── migrations/          # SQL schema
│   │   ├── query/               # SQLC query files
│   │   └── sqlc/                # Generated Go code
│   ├── internal/
│   │   ├── handler/             # HTTP handlers
│   │   ├── middleware/          # JWT, CORS
│   │   └── util/                # JWT, email, response helpers
│   └── sqlc.yaml
│
└── frontend/
    └── src/
        ├── app/                  # Next.js App Router pages
        │   ├── page.tsx          # Landing page (public)
        │   ├── login/
        │   ├── register/
        │   ├── lupa-password/
        │   ├── reset-password/
        │   ├── verify-email/
        │   ├── home/             # Dashboard (auth)
        │   ├── direktori/
        │   ├── lowongan/
        │   ├── survei/
        │   └── profil/
        ├── lib/api.ts            # Axios client + interceptors
        ├── store/authStore.ts    # Zustand auth state
        └── types/index.ts        # TypeScript types
```

---

## Quick Start

Lihat file **[QUICK-START.md](QUICK-START.md)** untuk panduan setup lengkap.

### Ringkasan Setup:

1. **Setup Database:**
```cmd
mysql -u root -p < setup-database.sql
```

2. **Jalankan Backend:**
```cmd
cd backend\cmd
go run main.go
```

3. **Jalankan Frontend:**
```cmd
cd frontend
npm install
npm run dev
```

4. **Akses aplikasi:** http://localhost:3000

### Troubleshooting

Jika ada masalah saat registrasi atau styling tidak tampil, lihat **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**

---

## Struktur File Foto/Gambar

File statis (foto, gambar) diletakkan di folder `frontend/public/`:

```
frontend/public/
├── images/              # Logo, banner, icon
├── uploads/
│   └── profiles/        # Foto profil user
└── mosque-bg.jpg        # Background halaman register
```

**Cara akses di kode:**
```tsx
<img src="/images/logo.png" alt="Logo" />
<img src="/uploads/profiles/user-123.jpg" alt="Profile" />
```

**Simpan path di database:**
```
photo_url: "/uploads/profiles/user-123.jpg"
```

Lihat `frontend/public/README.md` untuk detail lengkap.

---

## Setup Backend (Detail)

### 1. Prerequisites
- Go 1.22+
- MySQL 8.0+
- SQLC CLI: `go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest`

### 2. Database

```sql
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Jalankan migration:
```bash
mysql -u root -p alumni_albahjah < backend/db/migrations/001_init.sql
```

### 3. Environment

File `.env` sudah ada di `backend/cmd/.env` dan `backend/.env`. 
Pastikan konfigurasi database sesuai:
```
DB_PASSWORD=""  # Ubah jika MySQL Anda pakai password
```

### 4. Generate SQLC (jika query diubah)

```bash
cd backend
sqlc generate
```

### 5. Install dependencies & run

```bash
cd backend/cmd
go mod tidy
go run main.go
```

Server berjalan di: http://localhost:8080

---

## Setup Frontend (Detail)

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Environment

File `.env.local` sudah dibuat otomatis dengan isi:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

### 3. Clear cache & run

```bash
rmdir /s /q .next
npm run dev
```

Frontend berjalan di: http://localhost:3000

---

## API Endpoints

### Public (tanpa auth)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | /api/auth/register | Registrasi alumni |
| GET | /api/auth/verify?token= | Verifikasi email |
| POST | /api/auth/login | Login |
| POST | /api/auth/refresh | Refresh access token |
| POST | /api/auth/logout | Logout |
| POST | /api/auth/forgot-password | Kirim link reset password |
| POST | /api/auth/reset-password | Reset password baru |
| GET | /api/public/news | Daftar berita |
| GET | /api/public/news/{slug} | Detail berita |
| GET | /api/public/events | Daftar event |
| GET | /api/public/events/{id} | Detail event |

### Private (butuh JWT Bearer Token)
| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | /api/private/profile | Data profil saya |
| PUT | /api/private/profile | Update profil |
| GET | /api/private/directory | Direktori alumni |
| GET | /api/private/jobs | Lowongan kerja |
| GET | /api/private/surveys | Survei aktif |
| POST | /api/private/events/{id}/register | Daftar event |
| GET | /api/private/events/{id}/registration | Cek status registrasi |

---

## Alur Auth

```
Register → Email Verifikasi → Login → Access Token (memory) + Refresh Token (HttpOnly Cookie)
                                          ↓
                              Auto refresh ketika 401 via interceptor Axios
                                          ↓
                              Refresh token expired → Force logout → Redirect /login
```

---

## Profile Completion

Sistem menghitung kelengkapan profil berdasarkan field yang diisi:
- Foto profil: 20%
- Nomor HP: 15%  
- Tahun lulus: 15%
- Program/Jurusan: 15%
- Kota domisili: 15%
- Jabatan/Pekerjaan: 20%

Banner pengingat muncul di dashboard jika completion < 100%.

---

## Security

- Password di-hash dengan **bcrypt** (cost 10)
- Access Token: disimpan di **React state** (bukan localStorage)
- Refresh Token: disimpan di **HttpOnly Cookie** (aman dari XSS)
- CORS hanya izinkan origin frontend
- Anti user enumeration pada endpoint forgot-password
- Verifikasi email wajib sebelum bisa login
- Semua Refresh Token diinvalidate saat reset password
