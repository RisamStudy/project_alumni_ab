# Deploy aaPanel (Next.js + Go) untuk `project_alumni1`

Project ini memakai:
- Frontend: Next.js (`frontend`) di port `3002`
- Backend: Go (`backend/cmd/main.go`) di port `8080`

## 1. Arsitektur proxy yang dipakai

Gunakan 1 domain utama, contoh:
- `https://islah.albahjah.or.id`

Reverse proxy:
- `/api` dan `/uploads` -> `127.0.0.1:8080` (backend Go)
- `/` -> `127.0.0.1:3002` (frontend Next.js)

Dengan pola ini frontend dan API ada di origin yang sama, jadi cookie auth dan CORS lebih stabil.

## 2. Environment yang perlu dipastikan

### Backend

Di `backend/.env` atau `backend/cmd/.env`:
- `PORT=8080`
- `FRONTEND_URL=https://islah.albahjah.or.id`
- `PUBLIC_BASE_URL=https://islah.albahjah.or.id` (agar URL hasil upload konsisten domain production)
- isi variabel DB/JWT/Resend sesuai server production.

### Frontend

Di `frontend/.env.production`:

```env
NEXT_PUBLIC_API_URL=https://islah.albahjah.or.id
```

## 3. Build aplikasi di server

```bash
cd /www/wwwroot/project_alumni1/backend
go mod download
go build -o app ./cmd

cd /www/wwwroot/project_alumni1/frontend
npm ci
npm run build
```

## 4. Jalankan process manager (aaPanel Supervisor/PM2)

### Backend (Go)

- Working directory: `/www/wwwroot/project_alumni1/backend`
- Start command:

```bash
./app
```

### Frontend (Next.js)

- Working directory: `/www/wwwroot/project_alumni1/frontend`
- Start command:

```bash
PORT=3002 npm run start
```

## 5. Nginx reverse proxy (site config aaPanel)

Tambahkan snippet berikut (atau copy dari `proxy/aapanel-location-snippet.conf`):

```nginx
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

Opsional upload lebih besar:

```nginx
client_max_body_size 20M;
```

## 6. Catatan penting

- Login butuh HTTPS karena refresh token cookie diset `Secure: true`.
- Pastikan DNS domain sudah mengarah ke server sebelum test login.
- Jika memakai `www` dan non-`www`, pilih satu domain kanonik lalu redirect yang lain.
