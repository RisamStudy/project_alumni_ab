# Troubleshooting - Create Account Gagal

## Kemungkinan Penyebab & Solusi

### 1. Database MySQL Belum Berjalan

**Cek MySQL Service:**
```cmd
sc query MySQL80
```

**Jika tidak berjalan, start service:**
```cmd
net start MySQL80
```

### 2. Database Belum Dibuat

**Login ke MySQL:**
```cmd
mysql -u root -p
```

**Buat database:**
```sql
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumni_albahjah;
SOURCE D:/kumpulanCodingan/Next.js dan golang/project-alumni/backend/db/migrations/001_init.sql
EXIT;
```

**Atau tanpa password (sesuai .env):**
```cmd
mysql -u root
```

### 3. Backend Belum Berjalan

**Jalankan backend:**
```cmd
cd backend\cmd
go run main.go
```

**Cek apakah backend running di http://localhost:8080**

### 4. CORS atau Network Error

**Pastikan:**
- Backend berjalan di port 8080
- Frontend berjalan di port 3000
- File `.env.local` ada di folder `frontend`
- Isi `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:8080`

### 5. Cek Error di Browser Console

**Buka DevTools (F12) → Console tab**

**Error yang mungkin muncul:**

#### "Network Error"
- Backend tidak berjalan
- URL API salah di `.env.local`
- CORS issue

#### "Email sudah terdaftar"
- Email sudah pernah digunakan
- Coba email lain atau hapus data di database

#### "Gagal membuat akun"
- Database error
- Cek log backend di terminal

### 6. Test Backend Langsung

**Test dengan curl atau Postman:**
```cmd
curl -X POST http://localhost:8080/api/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"full_name\":\"Test User\",\"birth_year\":2000,\"email\":\"test@example.com\",\"password\":\"password123\"}"
```

**Response yang diharapkan:**
```json
{
  "success": true,
  "message": "Registrasi berhasil! Cek email Anda untuk verifikasi akun.",
  "data": null
}
```

### 7. Cek Log Backend

Saat menjalankan `go run main.go`, perhatikan output di terminal:
- Error koneksi database?
- Error saat insert data?
- Panic atau crash?

### 8. Password Database Kosong

Di file `backend/cmd/.env` dan `backend/.env`, password database kosong:
```
DB_PASSWORD=""
```

Pastikan ini sesuai dengan konfigurasi MySQL Anda. Jika MySQL Anda pakai password, ubah menjadi:
```
DB_PASSWORD="your_mysql_password"
```

## 9. Email Verifikasi Tidak Terkirim

**Penyebab:**
- API key Resend belum dikonfigurasi atau tidak valid
- Email penerima belum ditambahkan di Resend (untuk onboarding@resend.dev)

**Solusi:**
Lihat panduan lengkap di **[EMAIL-SETUP-GUIDE.md](EMAIL-SETUP-GUIDE.md)**

**Quick Fix:**
1. Daftar di https://resend.com (gratis)
2. Generate API key
3. Update `backend/cmd/.env`:
   ```
   SMTP_PASSWORD=re_your_new_api_key
   ```
4. Restart backend
5. Test dengan script:
   ```cmd
   cd backend
   go run test-email.go
   ```

## Langkah Debugging Sistematis

1. ✅ Cek MySQL service berjalan
2. ✅ Cek database `alumni_albahjah` sudah dibuat
3. ✅ Cek tabel sudah ada (run migration)
4. ✅ Jalankan backend, pastikan tidak ada error
5. ✅ Cek file `.env.local` di frontend
6. ✅ Restart frontend development server
7. ✅ Buka browser console (F12) saat register
8. ✅ Lihat error message yang muncul
9. ✅ Setup email Resend (lihat EMAIL-SETUP-GUIDE.md)

## Quick Fix Commands

**Reset database (HATI-HATI: Hapus semua data!):**
```sql
DROP DATABASE IF EXISTS alumni_albahjah;
CREATE DATABASE alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alumni_albahjah;
SOURCE D:/kumpulanCodingan/Next.js dan golang/project-alumni/backend/db/migrations/001_init.sql;
```

**Restart semua service:**
```cmd
# Stop frontend (Ctrl+C di terminal frontend)
# Stop backend (Ctrl+C di terminal backend)

# Start backend
cd backend\cmd
go run main.go

# Start frontend (terminal baru)
cd frontend
npm run dev
```
