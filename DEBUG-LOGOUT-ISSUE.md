# Debug: Logout Otomatis Setelah Login

## 🔍 Gejala

1. Login berhasil
2. Token terkirim (log: "✅ Authorization header set")
3. Tiba-tiba ada error (hilang karena refresh)
4. Logout otomatis

## 🎯 Cara Debug

### 1. Preserve Log di Console

**Penting:** Agar error tidak hilang saat refresh!

1. Buka DevTools (F12)
2. Console tab
3. ✅ **Centang "Preserve log"** (di atas console)
4. Login dan tunggu error
5. Error akan tetap ada meskipun page refresh

### 2. Cek Network Tab

1. DevTools → Network tab
2. ✅ **Centang "Preserve log"**
3. Login
4. Lihat semua request yang gagal (merah)
5. Klik request yang error
6. Lihat Response tab

### 3. Cek Backend Log

Di terminal backend, akan muncul log:

**Jika token valid:**
```
✅ JWT Auth success: User user@example.com (alumni) accessing /api/private/jobs
```

**Jika token invalid:**
```
❌ JWT Auth failed: Invalid token for /api/private/jobs - token is expired
```

**Jika token tidak ada:**
```
❌ JWT Auth failed: No authorization header for /api/private/jobs
```

## 🐛 Kemungkinan Error

### Error 1: Token Expired Immediately

**Gejala:**
```
❌ JWT Auth failed: Invalid token - token is expired
```

**Penyebab:** System time salah atau token expired time terlalu pendek

**Solusi:**
```go
// Di backend/internal/util/jwt.go
// Cek GenerateAccessToken
// Pastikan exp time cukup lama (15 menit)
```

### Error 2: JWT Secret Mismatch

**Gejala:**
```
❌ JWT Auth failed: Invalid token - signature is invalid
```

**Penyebab:** JWT_SECRET berbeda antara saat generate dan validate

**Solusi:**
1. Cek `backend/cmd/.env`
2. Pastikan JWT_SECRET sama
3. Restart backend
4. Login ulang

### Error 3: Malformed Token

**Gejala:**
```
❌ JWT Auth failed: Invalid token - token contains an invalid number of segments
```

**Penyebab:** Token tidak lengkap atau corrupt

**Solusi:**
1. Clear localStorage
2. Login ulang

### Error 4: Database Error

**Gejala:**
```
❌ Failed to fetch jobs: Error 500
```

**Penyebab:** Query database gagal (tabel tidak ada, dll)

**Solusi:**
```sql
-- Cek tabel jobs ada
SHOW TABLES LIKE 'jobs';

-- Jika tidak ada, run migration
SOURCE backend/db/migrations/001_init.sql;
```

### Error 5: CORS Error

**Gejala:**
```
Access-Control-Allow-Origin header missing
```

**Penyebab:** CORS middleware tidak berfungsi

**Solusi:**
- Restart backend
- Pastikan frontend di port 3000

## 📊 Debugging Checklist

### Frontend (Console):

- [ ] Preserve log enabled
- [ ] Login log muncul
- [ ] Token present di request
- [ ] Error message visible
- [ ] Network tab shows failed request

### Backend (Terminal):

- [ ] Server running
- [ ] JWT auth log muncul
- [ ] No database errors
- [ ] No panic/crash

### Database:

- [ ] MySQL running
- [ ] Tables exist (users, jobs, events, etc)
- [ ] User status = 'active'
- [ ] Refresh token exists

## 🔧 Step-by-Step Debug

### Step 1: Enable Preserve Log

Console & Network tab → ✅ Preserve log

### Step 2: Clear Everything

```javascript
localStorage.clear()
```

### Step 3: Login dengan Console Terbuka

Lihat semua log yang muncul.

### Step 4: Identifikasi Error

**Cari log yang dimulai dengan:**
- ❌ API Error
- ❌ Failed to fetch
- ❌ JWT Auth failed (di backend)

### Step 5: Copy Error Message

Copy full error message sebelum page refresh.

### Step 6: Cek Backend Log

Lihat terminal backend untuk error yang sesuai.

### Step 7: Fix Berdasarkan Error

Lihat section "Kemungkinan Error" di atas.

## 💡 Quick Fixes

### Fix 1: Restart Everything

```cmd
# Stop backend & frontend (Ctrl+C)

# Backend
cd backend\cmd
go run main.go

# Frontend (terminal baru)
cd frontend
npm run dev

# Clear browser
localStorage.clear()

# Login ulang
```

### Fix 2: Check Token Validity

```javascript
// Di Console setelah login
const store = JSON.parse(localStorage.getItem('auth-storage'))
const token = store.state.accessToken

// Decode token (tanpa verify)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

const decoded = parseJwt(token);
console.log('Token payload:', decoded);
console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Is expired:', Date.now() > decoded.exp * 1000);
```

### Fix 3: Test API Manually

```javascript
// Test private API dengan token
const store = JSON.parse(localStorage.getItem('auth-storage'))
const token = store.state.accessToken

fetch('http://localhost:8080/api/private/jobs?page=1&limit=3', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

### Fix 4: Check Database

```sql
-- Cek user status
SELECT email, status FROM users WHERE email = 'your@email.com';

-- Cek refresh token
SELECT * FROM refresh_tokens WHERE user_id = 'your-user-id';

-- Cek tabel jobs
SELECT COUNT(*) FROM jobs;
```

## 🎯 Common Scenarios

### Scenario 1: Token Expired Immediately

**Debug:**
```javascript
// Cek token exp time
const decoded = parseJwt(token);
const expTime = new Date(decoded.exp * 1000);
const now = new Date();
console.log('Token expires:', expTime);
console.log('Current time:', now);
console.log('Difference (minutes):', (expTime - now) / 1000 / 60);
```

**Expected:** Difference should be ~15 minutes

**If negative:** Token already expired → Check system time or backend JWT generation

### Scenario 2: Database Query Fails

**Backend log:**
```
Error: Table 'alumni_albahjah.jobs' doesn't exist
```

**Fix:**
```sql
USE alumni_albahjah;
SOURCE backend/db/migrations/001_init.sql;
```

### Scenario 3: Refresh Token Missing

**Error:**
```
❌ Token refresh failed: 401 Unauthorized
```

**Debug:**
```javascript
// Cek cookies
document.cookie
```

**Should have:** `refresh_token=...`

**If missing:** Login creates refresh token but not saved → Check backend cookie settings

## 📖 Logging Reference

### Frontend Console Logs:

```
🔐 Attempting login...
✅ Login response: {...}
💾 Auth state updated
🚀 Redirecting to /home...
🏠 Home page mounted, fetching data...
🔑 Request interceptor - Token: Present
✅ Authorization header set
✅ Data fetched successfully
```

### Backend Terminal Logs:

```
✓ Database connected
✓ Server running on http://localhost:8080
✅ JWT Auth success: User user@example.com (alumni) accessing /api/private/jobs
```

### Error Logs:

**Frontend:**
```
❌ API Error: {url: "/api/private/jobs", status: 401, message: "..."}
🔄 Got 401, attempting token refresh...
❌ Token refresh failed: ...
🚪 Logging out and redirecting to login...
```

**Backend:**
```
❌ JWT Auth failed: Invalid token for /api/private/jobs - token is expired
```

## 🆘 Still Having Issues?

### Collect Debug Info:

1. **Frontend Console Log** (with Preserve log)
2. **Backend Terminal Log**
3. **Network Tab** (failed requests)
4. **LocalStorage content:**
   ```javascript
   JSON.parse(localStorage.getItem('auth-storage'))
   ```
5. **Cookies:**
   ```javascript
   document.cookie
   ```
6. **Token payload:**
   ```javascript
   parseJwt(token)
   ```

### Share for Help:

Dengan info di atas, akan lebih mudah untuk diagnose masalahnya.

---

**Update Terbaru:**
- ✅ Error logging ditambahkan di frontend & backend
- ✅ Preserve log reminder
- ✅ Delay 1 detik sebelum redirect (untuk lihat error)
- ✅ Detailed error info di console
