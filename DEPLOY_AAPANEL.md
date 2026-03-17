# Deploy aaPanel (Next.js + Go) untuk `project_alumni1`

Project ini memakai:
- Frontend: Next.js (`frontend`) di port `3002`
- Backend: Go (`backend/cmd/main.go`) di port `8080`

## 1. Arsitektur proxy yang dipakai

Domain: `https://islah.albahjah.or.id`

Reverse proxy:
- `/_next/static/` -> `127.0.0.1:3002` (static assets CSS/JS - HARUS paling atas)
- `/_next/image/` -> `127.0.0.1:3002`
- `/api/` -> `127.0.0.1:8080` (backend Go)
- `/uploads/` -> `127.0.0.1:8080`
- `/` -> `127.0.0.1:3002` (frontend Next.js)

> **PENTING**: Urutan location di nginx sangat berpengaruh. `/_next/static/` harus di atas `/` agar CSS/JS tidak hilang.

## 2. Environment yang perlu dipastikan

### Backend

Di `backend/.env` atau `backend/cmd/.env`:
```env
PORT=8080
FRONTEND_URL=https://islah.albahjah.or.id
PUBLIC_BASE_URL=https://islah.albahjah.or.id
```
Isi juga variabel DB/JWT/Resend sesuai server production.

### Frontend

Di `frontend/.env.production`:
```env
NEXT_PUBLIC_API_URL=https://islah.albahjah.or.id
```

## 3. Build aplikasi di server

```bash
# Backend
cd /www/wwwroot/project_alumni1/backend
go mod download
go build -o app ./cmd

# Frontend
cd /www/wwwroot/project_alumni1/frontend
npm ci
npm run build
```

> Karena `output: 'standalone'` sudah diset di `next.config.mjs`, hasil build ada di `.next/standalone/`.

## 4. Jalankan process manager (aaPanel Supervisor/PM2)

### Backend (Go)

- Working directory: `/www/wwwroot/project_alumni1/backend`
- Start command: `./app`

### Frontend (Next.js)

- Working directory: `/www/wwwroot/project_alumni1/frontend`
- Start command: `PORT=3002 npm run start`

## 5. Nginx reverse proxy (site config aaPanel)

Copy dari `proxy/aapanel-location-snippet.conf` atau paste manual:

```nginx
# PENTING: /_next/static/ harus di atas location / agar styling tidak hilang
location /_next/static/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    add_header Cache-Control "public, max-age=31536000, immutable";
}

location /_next/image/ {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /api/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /uploads/ {
    proxy_pass http://127.0.0.1:8080;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3002;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Tambahkan juga untuk upload file besar:
```nginx
client_max_body_size 20M;
```

## 6. Verifikasi setelah deploy

Buka browser DevTools > Network, pastikan:
- File `.css` dan `.js` di `/_next/static/` status 200 (bukan 404)
- Request ke `/api/` mendapat response dari backend
- Tidak ada error CORS di console

## 7. Catatan penting

- Login butuh HTTPS karena refresh token cookie diset `Secure: true`.
- Pastikan DNS domain sudah mengarah ke server sebelum test login.
- Jika styling hilang setelah deploy ulang, jalankan `npm run build` ulang lalu restart frontend process.
