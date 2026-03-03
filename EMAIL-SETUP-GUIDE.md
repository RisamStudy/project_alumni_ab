# Panduan Setup Email dengan Resend

## Kenapa Email Tidak Terkirim?

API key Resend yang ada di `.env` sekarang kemungkinan:
- Sudah tidak valid
- Milik orang lain (dari tutorial/template)
- Belum dikonfigurasi dengan domain/email Anda

## Solusi: Setup Resend Account Anda Sendiri

### Langkah 1: Daftar di Resend (GRATIS)

1. Buka: https://resend.com
2. Klik "Sign Up" atau "Get Started"
3. Daftar dengan email Anda (bisa pakai Gmail)
4. Verifikasi email Anda
5. Login ke dashboard

### Langkah 2: Dapatkan API Key

1. Di dashboard Resend, klik menu **"API Keys"**
2. Klik **"Create API Key"**
3. Beri nama: `Alumni Al Bahjah - Development`
4. Permission: **Full Access** (untuk development)
5. Klik **"Create"**
6. **COPY API KEY** yang muncul (hanya muncul sekali!)
   - Format: `re_xxxxxxxxxxxxxxxxxxxxxxxxxx`

### Langkah 3: Update File .env Backend

Edit file `backend/cmd/.env` dan `backend/.env`:

```env
# SMTP Email - RESEND
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USERNAME=resend
SMTP_PASSWORD=re_xxxxxxxxxxxxxxxxxxxxxxxxxx  # <-- Ganti dengan API key Anda
SMTP_FROM=Portal Alumni Al Bahjah <onboarding@resend.dev>
```

**PENTING:** Ganti `re_xxxxxxxxxxxxxxxxxxxxxxxxxx` dengan API key yang baru Anda copy!

### Langkah 4: Restart Backend

```cmd
cd backend\cmd
```

Stop backend (Ctrl+C), lalu jalankan lagi:
```cmd
go run main.go
```

### Langkah 5: Test Registrasi

1. Buka: http://localhost:3000/register
2. Daftar dengan email ASLI Anda (yang bisa Anda akses)
3. Klik "Create Account"
4. Cek inbox email Anda (atau folder Spam)

---

## Email Sender untuk Development

Resend menyediakan domain testing gratis: `onboarding@resend.dev`

**Kelebihan:**
- Langsung bisa dipakai tanpa verifikasi domain
- Gratis untuk testing

**Keterbatasan:**
- Hanya bisa kirim ke email yang terdaftar di akun Resend Anda
- Ada limit 100 email/hari (cukup untuk development)

### Cara Menambahkan Email Penerima (Development)

1. Di dashboard Resend, klik **"Domains"**
2. Pilih domain `onboarding@resend.dev`
3. Klik **"Add Email"** atau **"Verified Emails"**
4. Tambahkan email Anda yang akan digunakan untuk testing
5. Verifikasi email tersebut

Sekarang email verifikasi akan terkirim ke email Anda!

---

## Setup Domain Sendiri (Production - Opsional)

Jika Anda punya domain sendiri (misal: `albahjah.com`):

### Langkah 1: Tambahkan Domain di Resend

1. Di dashboard Resend, klik **"Domains"**
2. Klik **"Add Domain"**
3. Masukkan domain Anda: `albahjah.com`
4. Klik "Add"

### Langkah 2: Verifikasi Domain (DNS Records)

Resend akan memberikan DNS records yang harus ditambahkan:

**SPF Record:**
```
Type: TXT
Name: @
Value: v=spf1 include:_spf.resend.com ~all
```

**DKIM Records:**
```
Type: TXT
Name: resend._domainkey
Value: [diberikan oleh Resend]
```

**DMARC Record:**
```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=none
```

Tambahkan records ini di DNS provider Anda (Cloudflare, Namecheap, dll).

### Langkah 3: Update .env

```env
SMTP_FROM=Portal Alumni Al Bahjah <noreply@albahjah.com>
```

### Langkah 4: Tunggu Verifikasi

- Verifikasi DNS biasanya 5-30 menit
- Setelah verified, Anda bisa kirim email ke siapa saja
- Limit naik jadi 3,000 email/hari (free tier)

---

## Alternatif: Gunakan Gmail SMTP (Untuk Testing Cepat)

Jika Anda ingin testing cepat tanpa setup Resend:

### Langkah 1: Enable 2-Step Verification di Gmail

1. Buka: https://myaccount.google.com/security
2. Enable "2-Step Verification"

### Langkah 2: Generate App Password

1. Buka: https://myaccount.google.com/apppasswords
2. Pilih app: "Mail"
3. Pilih device: "Other" → ketik "Alumni Portal"
4. Klik "Generate"
5. Copy password 16 digit yang muncul

### Langkah 3: Update .env

```env
# SMTP Email - GMAIL
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password 16 digit
SMTP_FROM=Portal Alumni Al Bahjah <your-email@gmail.com>
```

### Langkah 4: Restart Backend

```cmd
cd backend\cmd
go run main.go
```

**Kelebihan Gmail:**
- Setup cepat
- Langsung bisa kirim ke email mana pun
- Gratis

**Kekurangan:**
- Limit 500 email/hari
- Kurang profesional (pakai email pribadi)
- Bisa kena spam filter

---

## Troubleshooting Email

### Email Tidak Terkirim

**Cek log backend:**
Saat registrasi, lihat terminal backend. Jika ada error, akan muncul di sana.

**Test koneksi SMTP:**
Buat file `test-email.go`:

```go
package main

import (
    "fmt"
    "net/smtp"
)

func main() {
    auth := smtp.PlainAuth("", "resend", "re_your_api_key", "smtp.resend.com")
    
    msg := []byte("From: test@resend.dev\r\n" +
        "To: your-email@gmail.com\r\n" +
        "Subject: Test Email\r\n" +
        "\r\n" +
        "This is a test email.\r\n")
    
    err := smtp.SendMail("smtp.resend.com:587", auth, "onboarding@resend.dev", 
        []string{"your-email@gmail.com"}, msg)
    
    if err != nil {
        fmt.Println("Error:", err)
    } else {
        fmt.Println("Email sent successfully!")
    }
}
```

Jalankan:
```cmd
go run test-email.go
```

### Email Masuk ke Spam

- Gunakan domain verified (bukan onboarding@resend.dev)
- Setup SPF, DKIM, DMARC records
- Jangan kirim terlalu banyak email sekaligus

### Error: "535 Authentication Failed"

- API key salah atau expired
- Generate API key baru di Resend dashboard

### Error: "550 Recipient not allowed"

- Email penerima belum ditambahkan di Resend (untuk onboarding@resend.dev)
- Tambahkan email di dashboard Resend → Verified Emails

---

## Rekomendasi untuk Project Ini

### Development (Sekarang):
✅ **Gunakan Resend dengan onboarding@resend.dev**
- Gratis
- Mudah setup
- Cukup untuk testing

### Production (Nanti):
✅ **Setup domain sendiri di Resend**
- Lebih profesional
- Tidak masuk spam
- Limit lebih besar

---

## Checklist Setup Email

- [ ] Daftar akun Resend
- [ ] Generate API key
- [ ] Update `backend/cmd/.env` dengan API key baru
- [ ] Tambahkan email testing di Resend dashboard (jika pakai onboarding@resend.dev)
- [ ] Restart backend
- [ ] Test registrasi dengan email asli
- [ ] Cek inbox (atau spam folder)
- [ ] Klik link verifikasi
- [ ] Login berhasil!

---

## Bantuan Lebih Lanjut

**Resend Documentation:**
https://resend.com/docs/introduction

**Resend Dashboard:**
https://resend.com/overview

**Support:**
Jika masih ada masalah, cek log backend saat registrasi untuk melihat error message spesifik.
