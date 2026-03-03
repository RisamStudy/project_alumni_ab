# Troubleshooting: 401 Unauthorized Error

## 🔍 Masalah

Setelah login berhasil, tiba-tiba muncul error:
```
GET http://localhost:8080/api/private/jobs?page=1&limit=3 401 (Unauthorized)
```

Dan user otomatis logout.

## 🎯 Penyebab Umum

### 1. Access Token Tidak Tersimpan
- Token tidak di-persist di localStorage
- Token hilang saat page refresh

### 2. Access Token Expired
- Token JWT expired (default 15 menit)
- Refresh token gagal

### 3. Token Tidak Dikirim
- Interceptor tidak attach token ke request
- Header Authorization tidak ada

### 4. Backend Tidak Menerima Token
- JWT secret salah
- Token format salah
- Middleware JWT error

## ✅ Yang Sudah Diperbaiki

### 1. Auth Store - Persist Access Token
Sekarang access token disimpan di localStorage:

```typescript
// Sebelum: hanya persist user & isAuthenticated
partialize: (state) => ({
  user: state.user,
  isAuthenticated: state.isAuthenticated,
})

// Sekarang: persist semua termasuk accessToken
// (tidak ada partialize, semua state di-persist)
```

### 2. Interceptor - Logging
Ditambahkan logging untuk debugging:

```typescript
🔑 Request interceptor - Token: Present/Missing
✅ Authorization header set
🔄 Got 401, attempting token refresh...
✅ Token refreshed successfully
```

## 🧪 Cara Debug

### 1. Buka Browser Console (F12)

Saat request API, akan muncul log:

**Request berhasil:**
```
🔑 Request interceptor - Token: Present
✅ Authorization header set
```

**Request 401:**
```
🔑 Request interceptor - Token: Missing
⚠️  No access token found in store
🔄 Got 401, attempting token refresh...
📡 Calling refresh token endpoint...
✅ Token refreshed successfully
```

**Refresh gagal:**
```
❌ Token refresh failed: AxiosError...
```

### 2. Cek LocalStorage

Di Console, ketik:
```javascript
JSON.parse(localStorage.getItem('auth-storage'))
```

**Harus ada:**
```json
{
  "state": {
    "accessToken": "eyJhbGc...",
    "user": {...},
    "isAuthenticated": true
  }
}
```

### 3. Cek Cookies

DevTools → Application → Cookies → http://localhost:3000

**Harus ada:**
- `refresh_token` (HttpOnly)

### 4. Cek Network Tab

Klik request yang 401:
- Headers → Request Headers
- Harus ada: `Authorization: Bearer eyJhbGc...`

## 🔧 Solusi

### Solusi 1: Clear Storage & Login Ulang

```javascript
// Di Console
localStorage.clear()
// Refresh page
// Login lagi
```

### Solusi 2: Restart Frontend

```cmd
cd frontend
# Stop (Ctrl+C)
npm run dev
```

### Solusi 3: Cek JWT Secret

Pastikan JWT_SECRET sama di backend:

**backend/cmd/.env:**
```env
JWT_SECRET=your_super_secret_jwt_key_min_32_chars_long
```

Jika diubah, restart backend dan login ulang.

### Solusi 4: Manual Set Token (Testing)

```javascript
// Di Console setelah login
const store = JSON.parse(localStorage.getItem('auth-storage'))
console.log('Access Token:', store.state.accessToken)
console.log('User:', store.state.user)
```

Jika token null, ada masalah di login flow.

## 🐛 Debugging Step-by-Step

### Step 1: Cek Login Response

Di Network tab saat login:
```
POST /api/auth/login
Response:
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",  // Harus ada
    "user": {...}
  }
}
```

### Step 2: Cek Auth Store Setelah Login

```javascript
const store = JSON.parse(localStorage.getItem('auth-storage'))
console.log(store.state.accessToken) // Harus ada token
```

### Step 3: Cek Request Header

Di Network tab untuk request private API:
```
Request Headers:
Authorization: Bearer eyJhbGc...  // Harus ada
```

### Step 4: Cek Backend Log

Di terminal backend, saat request 401:
```
[JWT] Invalid token: token is expired
```

Atau:
```
[JWT] No authorization header
```

### Step 5: Test Refresh Token

```javascript
// Di Console
fetch('http://localhost:8080/api/auth/refresh', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(console.log)
```

**Expected:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc..."
  }
}
```

## 📊 Checklist

- [ ] Backend running di port 8080
- [ ] Frontend running di port 3000
- [ ] Login berhasil (200 OK)
- [ ] Access token ada di response
- [ ] Access token tersimpan di localStorage
- [ ] Refresh token ada di cookies
- [ ] Request header ada Authorization
- [ ] JWT_SECRET benar di backend
- [ ] Token belum expired

## 🎯 Common Scenarios

### Scenario 1: Token Hilang Setelah Refresh

**Penyebab:** Access token tidak di-persist

**Solusi:** Sudah diperbaiki - sekarang token di-persist di localStorage

### Scenario 2: Token Expired

**Penyebab:** Access token expired (15 menit)

**Solusi:** Auto refresh sudah diimplementasi di interceptor

**Test:**
- Tunggu 15 menit setelah login
- Klik sesuatu yang trigger API
- Harus auto refresh token

### Scenario 3: Refresh Token Expired

**Penyebab:** Refresh token expired (7 hari)

**Solusi:** User harus login ulang

**Cek:**
```sql
SELECT * FROM refresh_tokens WHERE user_id = 'your-user-id';
```

Jika expired, hapus dan login ulang:
```sql
DELETE FROM refresh_tokens WHERE user_id = 'your-user-id';
```

### Scenario 4: CORS Error pada Refresh

**Error:**
```
Access-Control-Allow-Origin header missing
```

**Solusi:**
- Restart backend
- Pastikan CORS middleware aktif

## 💡 Tips

### 1. Monitor Token di Console

Tambahkan di login page:
```typescript
login(access_token, user);
console.log('✅ Token saved:', access_token.substring(0, 20) + '...');
```

### 2. Test Token Validity

```javascript
// Decode JWT (tanpa verify)
function parseJwt(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

const token = JSON.parse(localStorage.getItem('auth-storage')).state.accessToken;
const decoded = parseJwt(token);
console.log('Token expires at:', new Date(decoded.exp * 1000));
console.log('Is expired:', Date.now() > decoded.exp * 1000);
```

### 3. Force Refresh Token

```javascript
// Di Console
fetch('http://localhost:8080/api/auth/refresh', {
  method: 'POST',
  credentials: 'include'
})
.then(r => r.json())
.then(data => {
  const store = JSON.parse(localStorage.getItem('auth-storage'));
  store.state.accessToken = data.data.access_token;
  localStorage.setItem('auth-storage', JSON.stringify(store));
  console.log('✅ Token refreshed manually');
  location.reload();
});
```

## 🆘 Masih Bermasalah?

### Quick Fix: Reset Everything

```cmd
# 1. Stop backend & frontend

# 2. Clear database tokens
mysql -u root -p alumni_albahjah
```
```sql
DELETE FROM refresh_tokens;
```

```cmd
# 3. Clear browser
# DevTools → Application → Clear storage

# 4. Restart backend
cd backend\cmd
go run main.go

# 5. Restart frontend
cd frontend
npm run dev

# 6. Login ulang
```

## 📖 Referensi

- **JWT Best Practices:** https://tools.ietf.org/html/rfc8725
- **Token Refresh Pattern:** https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/

---

**Update Terbaru:**
- ✅ Access token sekarang di-persist di localStorage
- ✅ Interceptor ditambahkan logging untuk debugging
- ✅ Auto refresh token sudah diimplementasi
- ✅ Logout otomatis jika refresh gagal
