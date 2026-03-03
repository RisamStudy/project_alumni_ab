# Folder Public - Panduan File Statis

## Cara Menggunakan Folder Public

Folder `public` digunakan untuk menyimpan file statis seperti gambar, font, dan file lainnya yang dapat diakses langsung dari browser.

### Struktur yang Disarankan:

```
public/
├── images/          # Gambar umum (logo, banner, dll)
├── uploads/         # Foto profil user (jika upload lokal)
├── mosque-bg.jpg    # Background masjid untuk halaman register
└── favicon.ico      # Icon website
```

### Cara Mengakses File:

Jika Anda meletakkan file di `public/images/logo.png`, aksesnya:

**Di kode JSX/TSX:**
```tsx
<img src="/images/logo.png" alt="Logo" />
```

**Di CSS:**
```css
background-image: url('/images/banner.jpg');
```

### Contoh untuk Foto Profil:

1. Simpan foto di: `public/uploads/profiles/user-123.jpg`
2. Akses dengan: `/uploads/profiles/user-123.jpg`
3. Di database simpan path: `/uploads/profiles/user-123.jpg`

### Catatan Penting:

- File di folder `public` dapat diakses langsung tanpa prefix `/public`
- Jangan simpan file sensitif di sini (semua orang bisa akses)
- Untuk production, sebaiknya gunakan cloud storage (AWS S3, Cloudinary, dll)
