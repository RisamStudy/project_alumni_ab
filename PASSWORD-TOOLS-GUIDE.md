# Panduan Password Tools

## 📁 Tools yang Tersedia

Saya sudah membuat 3 tools untuk management password:

1. **password-hash.go** - Interactive tool untuk hash dan verify password
2. **quick-hash.go** - Quick hash dari command line
3. **reset-user-password.go** - Reset password user di database

## 🔧 Tool 1: Password Hash (Interactive)

### Fungsi:
- Hash password untuk insert ke database
- Verify apakah password cocok dengan hash

### Cara Menggunakan:

```cmd
cd backend\tools
go run password-hash.go
```

### Mode 1: Hash Password

```
=== Password Hash Tool ===

Pilih mode:
1. Hash password (untuk insert ke database)
2. Verify password (cek apakah password cocok dengan hash)

Pilihan (1/2): 1

=== Hash Password ===
Masukkan password: mypassword123

✅ Password berhasil di-hash!

Password asli: mypassword123
Hash: $2a$10$abcdefghijklmnopqrstuvwxyz1234567890

📋 Copy hash di atas untuk disimpan di database.

Contoh SQL:
UPDATE users SET password = '$2a$10$abc...' WHERE email = 'user@example.com';
```

### Mode 2: Verify Password

```
Pilihan (1/2): 2

=== Verify Password ===
Masukkan password (plain text): mypassword123
Masukkan hash dari database: $2a$10$abc...

✅ Password COCOK!
Password yang Anda masukkan benar.
```

## ⚡ Tool 2: Quick Hash (Command Line)

### Fungsi:
Hash password langsung dari command line (lebih cepat)

### Cara Menggunakan:

```cmd
cd backend\tools
go run quick-hash.go mypassword123
```

### Output:

```
Password: mypassword123
Hash: $2a$10$abcdefghijklmnopqrstuvwxyz1234567890
```

### Use Case:

**Generate hash untuk insert user baru:**
```cmd
go run quick-hash.go password123
```

Copy hash, lalu:
```sql
INSERT INTO users (id, full_name, birth_year, email, password, status, role)
VALUES (UUID(), 'Test User', 2000, 'test@example.com', '$2a$10$abc...', 'active', 'alumni');
```

## 🔐 Tool 3: Reset User Password (Database)

### Fungsi:
- Reset password user langsung di database
- Otomatis hash password
- Hapus semua refresh tokens (force re-login)

### Cara Menggunakan:

```cmd
cd backend\tools
go run reset-user-password.go
```

### Contoh Interaksi:

```
✓ Connected to database

Masukkan email user: user@example.com

User ditemukan:
  ID: abc-123-def
  Nama: John Doe
  Email: user@example.com
  Status: active

Masukkan password baru: newpassword123
Konfirmasi password baru: newpassword123

✅ Password berhasil diubah!
✅ Semua refresh token dihapus (user harus login ulang)

User 'user@example.com' sekarang bisa login dengan password baru.
```

## 📚 Use Cases

### Use Case 1: User Lupa Password (Manual Reset)

**Scenario:** User lupa password dan email tidak terkirim.

**Solusi:**
```cmd
cd backend\tools
go run reset-user-password.go
```

Masukkan email user dan password baru.

### Use Case 2: Testing Login

**Scenario:** Ingin test login dengan password yang diketahui.

**Solusi:**
```cmd
cd backend\tools
go run quick-hash.go testpassword
```

Copy hash, lalu update database:
```sql
UPDATE users SET password = '$2a$10$...' WHERE email = 'test@example.com';
```

### Use Case 3: Verify Password dari Database

**Scenario:** Ingin cek apakah password user benar.

**Solusi:**
1. Get hash dari database:
```sql
SELECT password FROM users WHERE email = 'user@example.com';
```

2. Verify:
```cmd
go run password-hash.go
```
Pilih mode 2, masukkan password dan hash.

### Use Case 4: Bulk Create Users

**Scenario:** Ingin create banyak user dengan password yang sama.

**Solusi:**
```cmd
go run quick-hash.go defaultpassword123
```

Copy hash, lalu:
```sql
INSERT INTO users (id, full_name, birth_year, email, password, status, role) VALUES
(UUID(), 'User 1', 2000, 'user1@example.com', '$2a$10$...', 'active', 'alumni'),
(UUID(), 'User 2', 2001, 'user2@example.com', '$2a$10$...', 'active', 'alumni'),
(UUID(), 'User 3', 2002, 'user3@example.com', '$2a$10$...', 'active', 'alumni');
```

## 🔍 Memahami Bcrypt Hash

### Format Hash:

```
$2a$10$abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP
│  │  │                                                    │
│  │  │                                                    └─ Hash (31 chars)
│  │  └─ Salt (22 chars)
│  └─ Cost (10 = 2^10 iterations)
└─ Algorithm (2a = bcrypt)
```

### Properties:

1. **One-way hash** - Tidak bisa di-decrypt
2. **Salt** - Setiap hash berbeda meskipun password sama
3. **Cost** - Semakin tinggi, semakin lambat (lebih aman)
4. **Deterministic verification** - Password yang sama selalu cocok dengan hash-nya

### Contoh:

Password yang sama menghasilkan hash berbeda:
```
Password: "password123"
Hash 1: $2a$10$abc...
Hash 2: $2a$10$xyz...  (berbeda karena salt berbeda)
```

Tapi keduanya valid saat verify!

## 🛡️ Security Best Practices

### 1. Jangan Simpan Password Plain Text

❌ **SALAH:**
```sql
INSERT INTO users (password) VALUES ('password123');
```

✅ **BENAR:**
```sql
INSERT INTO users (password) VALUES ('$2a$10$...');
```

### 2. Gunakan Cost yang Cukup

- **Cost 10** (default) - Cukup untuk kebanyakan aplikasi
- **Cost 12** - Lebih aman, tapi lebih lambat
- **Cost 14+** - Sangat aman, tapi sangat lambat

```go
// Default (cost 10)
bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)

// Custom cost
bcrypt.GenerateFromPassword([]byte(password), 12)
```

### 3. Jangan Log Password

❌ **SALAH:**
```go
log.Printf("User login with password: %s", password)
```

✅ **BENAR:**
```go
log.Printf("User login attempt for email: %s", email)
```

### 4. Force Re-login Setelah Reset Password

Saat reset password, hapus semua refresh tokens:
```sql
DELETE FROM refresh_tokens WHERE user_id = ?;
```

Tool `reset-user-password.go` sudah melakukan ini otomatis.

## 🧪 Testing

### Test Hash & Verify:

```cmd
# Hash password
go run quick-hash.go testpassword

# Output: $2a$10$abc...

# Verify
go run password-hash.go
# Pilih mode 2
# Masukkan: testpassword
# Masukkan hash: $2a$10$abc...
# Output: ✅ Password COCOK!
```

### Test Reset Password:

```cmd
# Reset password user
go run reset-user-password.go
# Email: test@example.com
# Password baru: newpassword123

# Test login di aplikasi
# Email: test@example.com
# Password: newpassword123
# Harus berhasil login
```

## 📊 Troubleshooting

### Error: "package golang.org/x/crypto/bcrypt not found"

**Solusi:**
```cmd
cd backend
go get golang.org/x/crypto/bcrypt
```

### Error: "Failed to connect to database"

**Solusi:**
1. Pastikan MySQL running
2. Cek konfigurasi di `backend/cmd/.env`
3. Test koneksi:
```cmd
mysql -u root -p
```

### Error: "User tidak ditemukan"

**Solusi:**
Cek email di database:
```sql
SELECT email FROM users;
```

### Password Tidak Cocok Saat Login

**Debug:**
1. Get hash dari database:
```sql
SELECT password FROM users WHERE email = 'user@example.com';
```

2. Verify dengan tool:
```cmd
go run password-hash.go
# Mode 2
# Masukkan password yang Anda coba
# Masukkan hash dari database
```

3. Jika tidak cocok, reset password:
```cmd
go run reset-user-password.go
```

## 💡 Tips

1. **Simpan hash, bukan password** - Selalu hash sebelum simpan ke database
2. **Gunakan tool untuk testing** - Lebih cepat daripada registrasi manual
3. **Reset password via tool** - Jika user lupa dan email tidak terkirim
4. **Verify password untuk debugging** - Cek apakah password benar
5. **Backup database** - Sebelum bulk update password

## 📖 Referensi

- **Bcrypt Documentation:** https://pkg.go.dev/golang.org/x/crypto/bcrypt
- **Password Hashing Best Practices:** https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html

---

**Catatan Penting:**

⚠️ **Bcrypt adalah one-way hash** - Tidak ada cara untuk "decrypt" atau "translate" hash kembali ke password asli. Ini adalah fitur keamanan, bukan bug!

Jika user lupa password:
1. Gunakan fitur "Forgot Password" di aplikasi
2. Atau reset manual dengan `reset-user-password.go`

**Jangan pernah** simpan atau log password plain text!


email :ir.support@albahjah.or.id
pw:admin123