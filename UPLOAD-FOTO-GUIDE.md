# Panduan Upload Foto Profil

## Cara Kerja Upload Foto

Ada 2 pendekatan untuk upload foto profil:

### Opsi 1: Upload Lokal (Simpan di Server)

File foto disimpan di folder `frontend/public/uploads/profiles/`

**Kelebihan:**
- Sederhana, tidak perlu service eksternal
- Gratis

**Kekurangan:**
- File hilang jika server restart (di production)
- Tidak scalable untuk banyak user
- Perlu setup storage di production

### Opsi 2: Upload ke Cloud Storage (Recommended untuk Production)

Gunakan service seperti:
- **Cloudinary** (gratis 25GB)
- **AWS S3**
- **Google Cloud Storage**
- **Supabase Storage**

**Kelebihan:**
- Scalable
- File aman dan persistent
- CDN untuk loading cepat
- Automatic image optimization

**Kekurangan:**
- Perlu setup account
- Mungkin ada biaya (tapi ada free tier)

---

## Implementasi Upload Lokal (Development)

### 1. Install Package untuk Upload

```cmd
cd backend
go get github.com/google/uuid
```

### 2. Buat Handler Upload di Backend

Buat file `backend/internal/handler/upload_handler.go`:

```go
package handler

import (
    "fmt"
    "io"
    "net/http"
    "os"
    "path/filepath"
    "strings"
    
    "alumni-albahjah/internal/middleware"
    "alumni-albahjah/internal/util"
    "github.com/google/uuid"
)

type UploadHandler struct{}

func NewUploadHandler() *UploadHandler {
    return &UploadHandler{}
}

// POST /api/private/upload/profile-photo
func (h *UploadHandler) UploadProfilePhoto(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUserFromContext(r)
    if user == nil {
        util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
        return
    }

    // Parse multipart form (max 5MB)
    if err := r.ParseMultipartForm(5 << 20); err != nil {
        util.WriteError(w, http.StatusBadRequest, "File terlalu besar (max 5MB)")
        return
    }

    file, header, err := r.FormFile("photo")
    if err != nil {
        util.WriteError(w, http.StatusBadRequest, "File tidak ditemukan")
        return
    }
    defer file.Close()

    // Validasi tipe file
    ext := strings.ToLower(filepath.Ext(header.Filename))
    if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
        util.WriteError(w, http.StatusBadRequest, "Format file harus JPG atau PNG")
        return
    }

    // Generate unique filename
    filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
    uploadPath := filepath.Join("../frontend/public/uploads/profiles", filename)

    // Buat folder jika belum ada
    os.MkdirAll(filepath.Dir(uploadPath), 0755)

    // Simpan file
    dst, err := os.Create(uploadPath)
    if err != nil {
        util.WriteError(w, http.StatusInternalServerError, "Gagal menyimpan file")
        return
    }
    defer dst.Close()

    if _, err := io.Copy(dst, file); err != nil {
        util.WriteError(w, http.StatusInternalServerError, "Gagal menyimpan file")
        return
    }

    // Return URL
    photoURL := fmt.Sprintf("/uploads/profiles/%s", filename)
    util.WriteSuccess(w, http.StatusOK, "Foto berhasil diupload", map[string]interface{}{
        "photo_url": photoURL,
    })
}
```

### 3. Tambahkan Route di main.go

Di file `backend/cmd/main.go`, tambahkan:

```go
// Upload handler
uploadHandler := handler.NewUploadHandler()
mux.HandleFunc("/api/private/upload/profile-photo", 
    middleware.JWTAuth(uploadHandler.UploadProfilePhoto, jwtSecret))
```

### 4. Buat Form Upload di Frontend

Buat component `frontend/src/components/PhotoUpload.tsx`:

```tsx
"use client";

import { useState } from "react";
import { api } from "@/lib/api";

export default function PhotoUpload({ currentPhoto, onSuccess }: { 
  currentPhoto?: string; 
  onSuccess: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentPhoto || "");

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validasi ukuran (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File terlalu besar! Maksimal 5MB");
      return;
    }

    // Validasi tipe
    if (!file.type.startsWith("image/")) {
      alert("File harus berupa gambar!");
      return;
    }

    // Preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    const formData = new FormData();
    formData.append("photo", file);

    try {
      const res = await api.post("/api/private/upload/profile-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const photoURL = res.data.data.photo_url;
      onSuccess(photoURL);
      alert("Foto berhasil diupload!");
    } catch (err) {
      alert("Gagal upload foto");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-200 border-4 border-white shadow-lg">
        {preview ? (
          <img src={preview} alt="Profile" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            No Photo
          </div>
        )}
      </div>
      
      <label className="cursor-pointer bg-primary-500 text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition">
        {uploading ? "Uploading..." : "Change Photo"}
        <input
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
    </div>
  );
}
```

### 5. Gunakan di Halaman Profil

Di `frontend/src/app/profil/page.tsx`:

```tsx
import PhotoUpload from "@/components/PhotoUpload";

// Di dalam component:
const [photoURL, setPhotoURL] = useState(profile?.photo_url || "");

// Di JSX:
<PhotoUpload 
  currentPhoto={photoURL} 
  onSuccess={(url) => {
    setPhotoURL(url);
    // Update ke database
    privateApi.updateProfile({ photo_url: url });
  }} 
/>
```

---

## Implementasi dengan Cloudinary (Production Ready)

### 1. Daftar di Cloudinary

- Buka: https://cloudinary.com
- Daftar gratis (25GB storage)
- Dapatkan: Cloud Name, API Key, API Secret

### 2. Install Package

**Backend:**
```cmd
cd backend
go get github.com/cloudinary/cloudinary-go/v2
```

**Frontend:**
```cmd
cd frontend
npm install cloudinary
```

### 3. Tambahkan ke .env

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Buat Upload Handler

```go
// Gunakan Cloudinary SDK untuk upload
// File akan tersimpan di cloud, return URL
```

### 5. Update Frontend

Sama seperti upload lokal, tapi URL akan berupa:
```
https://res.cloudinary.com/your-cloud/image/upload/v123456/profiles/abc123.jpg
```

---

## Tips & Best Practices

1. **Validasi di Frontend & Backend**
   - Ukuran max 5MB
   - Format: JPG, PNG
   - Dimensi recommended: 500x500px

2. **Optimasi Gambar**
   - Compress sebelum upload
   - Gunakan library seperti `sharp` (Node.js) atau `image` (Go)

3. **Security**
   - Validasi MIME type
   - Generate random filename (jangan pakai nama asli)
   - Scan untuk malware (production)

4. **Performance**
   - Gunakan CDN (Cloudinary sudah include CDN)
   - Lazy loading untuk gambar
   - Serve dalam format WebP jika browser support

5. **Backup**
   - Jika pakai local storage, backup folder uploads
   - Jika pakai cloud, sudah otomatis backup

---

## Contoh Flow Lengkap

1. User klik "Change Photo"
2. Pilih file dari komputer
3. Frontend validasi ukuran & tipe
4. Show preview
5. Upload ke backend via FormData
6. Backend validasi lagi
7. Simpan file (lokal atau cloud)
8. Return URL
9. Frontend update state & tampilkan foto baru
10. Simpan URL ke database via API update profile

---

## Untuk Development (Sekarang)

Gunakan **Upload Lokal** dulu untuk testing:
- Simpan di `frontend/public/uploads/profiles/`
- Akses via `/uploads/profiles/filename.jpg`
- Simpan path di database: `photo_url: "/uploads/profiles/filename.jpg"`

## Untuk Production (Nanti)

Migrate ke **Cloudinary** atau cloud storage lain:
- Lebih aman
- Scalable
- Automatic optimization
- CDN included
