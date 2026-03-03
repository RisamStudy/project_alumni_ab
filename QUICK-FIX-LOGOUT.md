# Quick Fix: Logout Otomatis

## 🚀 Langkah Cepat

### 1. Seed Database (Isi Data Dummy)

```cmd
mysql -u root -p alumni_albahjah < backend/db/seed-data.sql
```

Ini akan mengisi:
- 3 news
- 2 events  
- 4 jobs
- 2 surveys

### 2. Restart Backend

```cmd
cd backend\cmd
go run main.go
```

### 3. Enable Preserve Log

DevTools (F12) → Console → ✅ Preserve log

### 4. Clear & Login

```javascript
localStorage.clear()
```

Login lagi dan lihat console.

## 📊 Cek Error

**Di Console, cari:**
- ❌ API Error
- ❌ Failed to fetch
- 401 Unauthorized

**Di Backend Terminal, cari:**
- ❌ JWT Auth failed
- Error: ...

## 💡 Common Fixes

**Empty database:**
```cmd
mysql -u root -p alumni_albahjah < backend/db/seed-data.sql
```

**Token expired:**
```javascript
// Cek exp time
const store = JSON.parse(localStorage.getItem('auth-storage'))
const token = store.state.accessToken
const payload = JSON.parse(atob(token.split('.')[1]))
console.log('Expires:', new Date(payload.exp * 1000))
```

**JWT secret mismatch:**
- Restart backend
- Login ulang

Lihat [DEBUG-LOGOUT-ISSUE.md](DEBUG-LOGOUT-ISSUE.md) untuk detail lengkap.
