# Panduan Setup Resend Webhooks

## 📡 Apa itu Webhook?

Webhook adalah cara Resend memberitahu aplikasi Anda tentang event email secara real-time:
- Email terkirim
- Email diterima (delivered)
- Email dibuka (opened)
- Link di email diklik
- Email bounce atau masuk spam

## 🎯 Endpoint Webhook

Saya sudah membuat endpoint webhook di backend:

```
POST http://localhost:8080/api/webhooks/resend
```

**Untuk production, endpoint akan menjadi:**
```
POST https://your-domain.com/api/webhooks/resend
```

## 📁 File yang Sudah Dibuat

### 1. `backend/internal/handler/webhook_handler.go`

Handler untuk menerima dan memproses webhook dari Resend.

**Event yang di-handle:**
- `email.sent` - Email berhasil dikirim
- `email.delivered` - Email diterima oleh penerima
- `email.delivery_delayed` - Pengiriman tertunda
- `email.complained` - Email ditandai sebagai spam
- `email.bounced` - Email bounce (gagal terkirim)
- `email.opened` - Email dibuka oleh penerima
- `email.clicked` - Link di email diklik

### 2. Route di `backend/cmd/main.go`

```go
mux.HandleFunc("POST /api/webhooks/resend", webhookH.HandleResendWebhook)
```

## 🚀 Setup Webhook di Resend (Development)

### Masalah: Localhost Tidak Bisa Diakses dari Internet

Resend perlu mengakses endpoint webhook Anda, tapi `localhost:8080` tidak bisa diakses dari internet.

### Solusi: Gunakan Ngrok atau Localtunnel

#### Opsi 1: Ngrok (Recommended)

**1. Install Ngrok:**
- Download dari: https://ngrok.com/download
- Extract dan jalankan

**2. Expose Backend ke Internet:**
```cmd
ngrok http 8080
```

**3. Copy URL yang diberikan:**
```
Forwarding: https://abc123.ngrok.io -> http://localhost:8080
```

**4. Webhook URL:**
```
https://abc123.ngrok.io/api/webhooks/resend
```

#### Opsi 2: Localtunnel

**1. Install:**
```cmd
npm install -g localtunnel
```

**2. Expose Backend:**
```cmd
lt --port 8080
```

**3. Copy URL:**
```
https://random-name.loca.lt
```

**4. Webhook URL:**
```
https://random-name.loca.lt/api/webhooks/resend
```

## 🔧 Konfigurasi Webhook di Resend Dashboard

### 1. Login ke Resend

https://resend.com

### 2. Buka Webhooks Settings

Dashboard → **Webhooks** → **Add Webhook**

### 3. Isi Form:

**Endpoint URL:**
```
https://your-ngrok-url.ngrok.io/api/webhooks/resend
```

**Events to Subscribe:**
Pilih event yang ingin Anda track:
- ✅ `email.sent`
- ✅ `email.delivered`
- ✅ `email.bounced`
- ✅ `email.complained`
- ⬜ `email.opened` (optional - untuk analytics)
- ⬜ `email.clicked` (optional - untuk analytics)

**Webhook Secret:**
Resend akan generate secret key untuk verifikasi. Copy key ini!

### 4. Simpan Webhook Secret

Edit `backend/cmd/.env`:
```env
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 5. Test Webhook

Di Resend dashboard, klik **"Send Test Event"** untuk memastikan webhook berfungsi.

## 🧪 Testing Webhook

### 1. Jalankan Ngrok
```cmd
ngrok http 8080
```

### 2. Jalankan Backend
```cmd
cd backend\cmd
go run main.go
```

### 3. Update Webhook URL di Resend

Ganti dengan URL ngrok yang baru (ngrok URL berubah setiap restart di free tier).

### 4. Test Registrasi

1. Buka: http://localhost:3000/register
2. Daftar dengan email
3. Lihat log backend - akan muncul webhook event:

```
📧 Resend Webhook Event: email.sent
✅ Email sent - ID: abc123, To: user@example.com
📬 Email delivered - ID: abc123, To: user@example.com
```

## 📊 Monitoring Webhook

### Via Backend Log

Saat webhook diterima, akan muncul log di terminal backend:

```
📧 Resend Webhook Event: email.delivered
📬 Email delivered - ID: re_abc123, To: user@example.com
```

### Via Resend Dashboard

1. Login ke Resend
2. Klik **"Webhooks"**
3. Klik webhook Anda
4. Lihat **"Recent Deliveries"** untuk melihat history webhook

## 🔒 Security: Webhook Signature Verification

Webhook handler sudah include signature verification untuk memastikan request benar-benar dari Resend.

**Cara kerja:**
1. Resend mengirim signature di header `svix-signature`
2. Backend verify signature menggunakan `RESEND_WEBHOOK_SECRET`
3. Jika signature tidak valid, request ditolak

**Konfigurasi:**
```env
RESEND_WEBHOOK_SECRET=whsec_your_secret_here
```

Jika tidak diset, signature verification akan di-skip (hanya untuk development).

## 📈 Implementasi Lanjutan (Optional)

### 1. Simpan Email Log ke Database

Buat tabel `email_logs`:

```sql
CREATE TABLE email_logs (
    id VARCHAR(36) PRIMARY KEY,
    email_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(36),
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    status ENUM('sent', 'delivered', 'bounced', 'complained') NOT NULL,
    event_type VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

### 2. Update Handler untuk Simpan ke Database

Di `webhook_handler.go`, tambahkan query untuk insert/update email_logs.

### 3. Track Email Analytics

Buat dashboard untuk monitoring:
- Email delivery rate
- Open rate
- Click rate
- Bounce rate
- Spam complaints

## 🌐 Setup untuk Production

### 1. Deploy Backend ke Server

Deploy backend Anda ke:
- VPS (DigitalOcean, Linode, AWS EC2)
- Cloud Platform (Heroku, Railway, Render)
- Serverless (AWS Lambda, Google Cloud Functions)

### 2. Update Webhook URL

Ganti dengan URL production:
```
https://api.albahjah.com/api/webhooks/resend
```

### 3. Setup SSL/HTTPS

Resend hanya mengirim webhook ke HTTPS endpoint (bukan HTTP).

### 4. Update CORS

Pastikan CORS middleware mengizinkan Resend:
```go
// Webhook endpoint tidak perlu CORS check karena server-to-server
```

## 🐛 Troubleshooting

### Webhook Tidak Diterima

**Cek:**
1. Ngrok/Localtunnel berjalan?
2. Backend berjalan di port 8080?
3. URL webhook di Resend benar?
4. Firewall tidak memblokir?

**Test manual dengan curl:**
```cmd
curl -X POST http://localhost:8080/api/webhooks/resend ^
  -H "Content-Type: application/json" ^
  -d "{\"type\":\"email.sent\",\"data\":{\"email_id\":\"test123\",\"to\":\"test@example.com\"}}"
```

### Signature Verification Failed

**Penyebab:**
- `RESEND_WEBHOOK_SECRET` salah
- Secret tidak match dengan yang di Resend dashboard

**Solusi:**
1. Copy secret dari Resend dashboard
2. Update `.env`
3. Restart backend

### Ngrok URL Berubah Terus

**Masalah:** Ngrok free tier memberikan random URL setiap restart.

**Solusi:**
1. Upgrade ke Ngrok paid plan (custom domain)
2. Atau gunakan Localtunnel dengan custom subdomain:
   ```cmd
   lt --port 8080 --subdomain alumni-albahjah
   ```
3. Atau deploy ke production server

## 📚 Event Types Reference

| Event Type | Deskripsi | Kapan Terjadi |
|------------|-----------|---------------|
| `email.sent` | Email berhasil dikirim ke SMTP server | Segera setelah send |
| `email.delivered` | Email diterima oleh penerima | Beberapa detik/menit setelah sent |
| `email.delivery_delayed` | Pengiriman tertunda | Jika ada masalah sementara |
| `email.bounced` | Email bounce (gagal) | Jika email invalid atau mailbox penuh |
| `email.complained` | Ditandai sebagai spam | Jika penerima klik "Report Spam" |
| `email.opened` | Email dibuka | Saat penerima buka email (tracking pixel) |
| `email.clicked` | Link diklik | Saat penerima klik link di email |

## ✅ Checklist Setup

- [ ] Buat webhook handler (`webhook_handler.go`)
- [ ] Tambahkan route di `main.go`
- [ ] Install Ngrok atau Localtunnel
- [ ] Expose backend ke internet
- [ ] Setup webhook di Resend dashboard
- [ ] Copy webhook secret ke `.env`
- [ ] Test dengan "Send Test Event"
- [ ] Test dengan registrasi real
- [ ] Cek log backend untuk webhook events
- [ ] (Optional) Implementasi database logging

## 🎓 Best Practices

1. **Always verify webhook signature** di production
2. **Log semua webhook events** untuk debugging
3. **Handle webhook idempotently** (bisa dipanggil multiple kali dengan hasil sama)
4. **Return 200 OK quickly** - jangan lakukan processing berat di webhook handler
5. **Use background jobs** untuk processing yang lama
6. **Monitor webhook failures** di Resend dashboard
7. **Setup alerts** jika bounce rate atau spam rate tinggi

## 📖 Dokumentasi Resend

- **Webhooks Guide:** https://resend.com/docs/dashboard/webhooks/introduction
- **Event Types:** https://resend.com/docs/dashboard/webhooks/event-types
- **Signature Verification:** https://resend.com/docs/dashboard/webhooks/signature-verification

---

Sekarang aplikasi Anda bisa menerima notifikasi real-time dari Resend tentang status email! 🎉
