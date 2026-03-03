# Quick Start Guide - Portal Alumni Al Bahjah

## Prerequisites

- MySQL 8.0+ (harus sudah terinstall dan berjalan)
- Go 1.21+ (untuk backend)
- Node.js 18+ (untuk frontend)

## Setup Database

### Opsi 1: Menggunakan Script SQL
```cmd
mysql -u root -p < setup-database.sql
```

### Opsi 2: Manual
```cmd
mysql -u root -p
```

Kemudian jalankan:
```sql
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumni_albahjah;
SOURCE backend/db/migrations/001_init.sql;
EXIT;
```

### Jika MySQL Tanpa Password:
```cmd
mysql -u root < setup-database.sql
```

## Setup Backend

1. **Masuk ke folder backend:**
```cmd
cd backend\cmd
```

2. **Install dependencies (jika belum):**
```cmd
cd ..
go mod download
cd cmd
```

3. **Cek konfigurasi `.env`:**
Pastikan file `backend/cmd/.env` sudah benar, terutama:
```
DB_PASSWORD=""
```
Ubah jika MySQL Anda pakai password.

4. **Jalankan backend:**
```cmd
go run main.go
```

Backend akan berjalan di: http://localhost:8080

## Setup Frontend

1. **Masuk ke folder frontend:**
```cmd
cd frontend
```

2. **Install dependencies (jika belum):**
```cmd
npm install
```

3. **Pastikan file `.env.local` ada:**
File ini sudah dibuat otomatis dengan isi:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

4. **Hapus cache Next.js:**
```cmd
rmdir /s /q .next
```

5. **Jalankan frontend:**
```cmd
npm run dev
```

Frontend akan berjalan di: http://localhost:3000

## Test Registrasi

1. Buka browser: http://localhost:3000
2. Klik "Create Account" atau langsung ke: http://localhost:3000/register
3. Isi form:
   - Full Name: Nama lengkap Anda
   - Tahun Lahir: Pilih tahun
   - Email: Email valid (akan dikirim verifikasi)
   - Password: Minimal 8 karakter
   - Centang "I agree to the Terms..."
4. Klik "Create Account"

## Troubleshooting

### Error: "Network Error"
- Pastikan backend berjalan di port 8080
- Cek file `.env.local` di frontend
- Restart frontend setelah membuat `.env.local`

### Error: "Gagal membuat akun"
- Cek MySQL service berjalan: `sc query MySQL80`
- Cek database sudah dibuat
- Lihat log error di terminal backend

### Error: "Email sudah terdaftar"
- Email sudah pernah digunakan
- Gunakan email lain atau hapus data di database:
```sql
USE alumni_albahjah;
DELETE FROM users WHERE email = 'email@example.com';
```

### Styling tidak tampil
- Hapus folder `.next`: `rmdir /s /q .next`
- Restart development server
- Hard refresh browser: Ctrl + Shift + R

## Struktur Folder untuk File Foto

```
frontend/public/
├── images/              # Logo, banner, dll
├── uploads/
│   └── profiles/        # Foto profil user
└── mosque-bg.jpg        # Background untuk halaman register
```

Akses file: `/images/logo.png` (tanpa prefix `/public`)

## Verifikasi Email

Setelah registrasi berhasil:
1. Cek email Anda (inbox atau spam)
2. Klik link verifikasi
3. Akun akan aktif dan bisa login

**Note:** Email menggunakan Resend.com (sudah dikonfigurasi di `.env`)

## Login

Setelah email terverifikasi:
1. Buka: http://localhost:3000/login
2. Masukkan email dan password
3. Klik "Login"

## Checklist Setup

- [ ] MySQL service berjalan
- [ ] Database `alumni_albahjah` sudah dibuat
- [ ] Tabel sudah ada (migration berhasil)
- [ ] Backend berjalan di port 8080
- [ ] File `.env.local` ada di folder frontend
- [ ] Frontend berjalan di port 3000
- [ ] Browser bisa akses http://localhost:3000
- [ ] Registrasi berhasil tanpa error

## Bantuan Lebih Lanjut

Lihat file `TROUBLESHOOTING.md` untuk panduan debugging lengkap.
