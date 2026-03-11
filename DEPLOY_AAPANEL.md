# Deploy ke aaPanel (Go API + Next.js)

Project ini menggunakan:
- Backend: Go (`backend/cmd/main.go`)
- Frontend: Next.js (`frontend`)

Snippet `app.js` Node.js tidak diperlukan untuk backend ini.

## 1. Arsitektur yang disarankan

- 1 domain utama, contoh: `https://alumni.example.com`
- Reverse proxy:
  - `/api` dan `/uploads` -> `127.0.0.1:8080` (backend Go)
  - `/` -> `127.0.0.1:3001` (frontend Next.js)

Konfigurasi ini menghindari masalah CORS/cookie karena frontend dan API berada di origin yang sama.

## 2. Siapkan environment variables

### Backend

1. Copy `backend/.env.production.example` menjadi `backend/.env`
2. Isi nilai sesuai server production.

`main.go` sudah mencari `.env` dari beberapa lokasi (`backend/.env`, `backend/cmd/.env`, `../cmd/.env`).

### Frontend

1. Copy `frontend/.env.production.example` menjadi `frontend/.env.production`
2. Pastikan:
   - `NEXT_PUBLIC_API_URL=https://alumni.example.com`

## 3. Build aplikasi di server

Di folder project (contoh `/www/wwwroot/project_alumni_ab`):

```bash
cd /www/wwwroot/project_alumni_ab/backend
go mod download
go build -o app ./cmd

cd /www/wwwroot/project_alumni_ab/frontend
npm ci
npm run build
```

## 4. Jalankan process manager (aaPanel Supervisor/PM2)

### Backend (Go)

- Working directory: `/www/wwwroot/project_alumni_ab/backend`
- Start command:

```bash
./app
```

Backend akan listen ke `PORT` (default `8080`).

### Frontend (Next.js)

- Working directory: `/www/wwwroot/project_alumni_ab/frontend`
- Start command:

```bash
PORT=3001 npm run start
```

## 5. Nginx reverse proxy (di site config aaPanel)

Tambahkan `location` berikut:

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
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

Opsional upload besar:

```nginx
client_max_body_size 20M;
```

## 6. Catatan penting

- Login membutuhkan HTTPS karena refresh cookie diset `Secure: true`.
- Set `FRONTEND_URL` harus sama persis dengan domain frontend aktif (contoh `https://alumni.example.com`).
- Jika ada `www` dan non-`www`, pilih satu domain kanonik dan redirect yang lain.
