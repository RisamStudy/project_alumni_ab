# Password Management Tools

Quick reference untuk tools password management.

## 🚀 Quick Start

### Hash Password (Interactive)
```cmd
cd backend\tools
go run password-hash.go
```

### Hash Password (Quick)
```cmd
cd backend\tools
go run quick-hash.go mypassword123
```

### Reset User Password
```cmd
cd backend\tools
go run reset-user-password.go
```

## 📚 Tools

| Tool | Fungsi | Use Case |
|------|--------|----------|
| `password-hash.go` | Hash & verify password | Testing, debugging |
| `quick-hash.go` | Quick hash dari CLI | Bulk insert, quick test |
| `reset-user-password.go` | Reset password user | User lupa password |

## 💡 Common Tasks

### Create Test User
```cmd
# 1. Hash password
go run quick-hash.go testpassword

# 2. Insert ke database
mysql -u root -p alumni_albahjah
```
```sql
INSERT INTO users (id, full_name, birth_year, email, password, status, role)
VALUES (UUID(), 'Test User', 2000, 'test@example.com', '$2a$10$...', 'active', 'alumni');
```

### Reset User Password
```cmd
go run reset-user-password.go
# Email: user@example.com
# Password: newpassword123
```

### Verify Password
```cmd
go run password-hash.go
# Mode: 2
# Password: testpassword
# Hash: $2a$10$...
```

## 📖 Full Documentation

Lihat [PASSWORD-TOOLS-GUIDE.md](../../PASSWORD-TOOLS-GUIDE.md) untuk dokumentasi lengkap.

## ⚠️ Important

**Bcrypt adalah one-way hash!**
- Tidak bisa di-decrypt
- Tidak bisa diterjemahkan kembali ke password asli
- Ini adalah fitur keamanan, bukan bug

Jika perlu tahu password user:
- Reset password dengan tool
- Atau minta user reset via "Forgot Password"
