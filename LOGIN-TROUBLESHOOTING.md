# Troubleshooting: Login Stuck / Tidak Redirect

## ✅ Yang Sudah Diperbaiki

1. **Middleware diperbaiki** - Tidak lagi memblokir navigasi
2. **Login page ditambahkan logging** - Untuk debugging
3. **Redirect menggunakan window.location** - Lebih reliable daripada router.push

## 🔍 Cara Debug

### 1. Buka Browser Console (F12)

Saat login, Anda akan melihat log seperti ini:

```
🔐 Attempting login...
✅ Login response: {success: true, message: "Login berhasil", data: {...}}
👤 User data: {id: "...", full_name: "...", email: "..."}
🔑 Access token: Present
💾 Auth state updated
🚀 Redirecting to /home...
```

### 2. Cek Error di Console

Jika ada error, akan muncul:
```
❌ Login error: AxiosError: ...
```

## 🐛 Kemungkinan Masalah & Solusi

### Masalah 1: Email Belum Diverifikasi

**Error:** `Email belum diverifikasi. Cek inbox email Anda.`

**Solusi:**
1. Cek inbox email (atau spam folder)
2. Klik link verifikasi
3. Atau verifikasi manual di database:
```sql
UPDATE users SET status = 'active' WHERE email = 'your@email.com';
```

### Masalah 2: Password Salah

**Error:** `Email atau password salah`

**Solusi:**
- Pastikan password benar
- Atau reset password via "Lupa Password"

### Masalah 3: Backend Tidak Berjalan

**Error:** `Network Error` atau `ERR_FAILED`

**Solusi:**
```cmd
cd backend\cmd
go run main.go
```

### Masalah 4: CORS Error

**Error:** `Access-Control-Allow-Origin`

**Solusi:**
- Restart backend
- Pastikan frontend di port 3000

### Masalah 5: Redirect Tidak Bekerja

**Gejala:** Login berhasil tapi halaman tidak pindah

**Solusi yang sudah diterapkan:**
- Menggunakan `window.location.href` sebagai fallback
- Menambahkan delay 100ms untuk memastikan state tersimpan

**Manual fix:**
Setelah login berhasil, manual buka: http://localhost:3000/home

### Masalah 6: Stuck di Loading

**Gejala:** Button loading terus menerus

**Penyebab:**
- Request tidak selesai (backend crash)
- Network timeout

**Solusi:**
1. Cek backend log untuk error
2. Restart backend
3. Clear browser cache
4. Hard refresh (Ctrl + Shift + R)

## 🧪 Test Manual

### Test 1: Cek Backend Response

```cmd
curl -X POST http://localhost:8080/api/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"email\":\"your@email.com\",\"password\":\"yourpassword\"}"
```

**Expected response:**
```json
{
  "success": true,
  "message": "Login berhasil",
  "data": {
    "access_token": "eyJhbGc...",
    "user": {
      "id": "...",
      "full_name": "...",
      "email": "...",
      "role": "alumni",
      "profile_completion": 20
    }
  }
}
```

### Test 2: Cek LocalStorage

Setelah login, buka Console dan ketik:
```javascript
localStorage.getItem('auth-storage')
```

Harus return JSON dengan user data.

### Test 3: Cek Cookies

Di DevTools → Application → Cookies → http://localhost:3000

Harus ada cookie `refresh_token`.

## 🔧 Quick Fixes

### Fix 1: Clear Browser Data

```
1. Buka DevTools (F12)
2. Application tab
3. Clear storage → Clear site data
4. Refresh page
5. Login lagi
```

### Fix 2: Restart Everything

```cmd
# Stop frontend (Ctrl+C)
# Stop backend (Ctrl+C)

# Start backend
cd backend\cmd
go run main.go

# Start frontend (terminal baru)
cd frontend
npm run dev
```

### Fix 3: Manual Redirect

Jika login berhasil tapi tidak redirect:
1. Buka tab baru
2. Ketik: http://localhost:3000/home
3. Seharusnya sudah login

### Fix 4: Verifikasi Email Manual

Jika email tidak terkirim:
```sql
USE alumni_albahjah;
UPDATE users SET status = 'active' WHERE email = 'your@email.com';
```

## 📊 Checklist Debugging

- [ ] Backend berjalan di port 8080
- [ ] Frontend berjalan di port 3000
- [ ] Email sudah diverifikasi (status = 'active')
- [ ] Password benar
- [ ] Browser console tidak ada error
- [ ] Network tab menunjukkan request berhasil (200 OK)
- [ ] LocalStorage ada 'auth-storage'
- [ ] Cookies ada 'refresh_token'

## 🎯 Langkah Sistematis

1. **Cek Backend:**
   ```cmd
   cd backend\cmd
   go run main.go
   ```
   Pastikan muncul: `✓ Server running on http://localhost:8080`

2. **Cek Database:**
   ```sql
   SELECT email, status FROM users WHERE email = 'your@email.com';
   ```
   Pastikan status = 'active'

3. **Test Login API:**
   Gunakan curl atau Postman untuk test endpoint login

4. **Cek Browser Console:**
   Buka F12 sebelum login, lihat log

5. **Cek Network Tab:**
   Lihat request POST /api/auth/login
   - Status harus 200
   - Response harus ada access_token

6. **Cek LocalStorage:**
   ```javascript
   localStorage.getItem('auth-storage')
   ```

7. **Manual Redirect:**
   Jika semua OK tapi tidak redirect, buka manual: http://localhost:3000/home

## 💡 Tips

1. **Selalu buka Console saat login** untuk melihat log
2. **Gunakan email yang sudah verified** untuk testing
3. **Restart backend jika ada perubahan kode**
4. **Clear browser cache** jika ada masalah aneh
5. **Test dengan browser incognito** untuk isolasi masalah

## 🆘 Masih Bermasalah?

Jika masih stuck setelah semua langkah di atas:

1. Screenshot error di console
2. Copy log backend saat login
3. Cek response di Network tab
4. Pastikan semua service berjalan
5. Test dengan user lain (buat akun baru)

---

**Update Terbaru:**
- Login sekarang menggunakan `window.location.href` untuk redirect yang lebih reliable
- Middleware diperbaiki untuk tidak memblokir navigasi
- Ditambahkan extensive logging untuk debugging
