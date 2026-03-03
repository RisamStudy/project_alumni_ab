-- Setup Database Alumni Al Bahjah
-- Jalankan dengan: mysql -u root -p < setup-database.sql

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS alumni_albahjah CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Gunakan database
USE alumni_albahjah;

-- Tampilkan info
SELECT 'Database alumni_albahjah berhasil dibuat!' AS status;
SELECT DATABASE() AS current_database;

-- Jalankan migration
SOURCE backend/db/migrations/001_init.sql;

-- Tampilkan tabel yang sudah dibuat
SHOW TABLES;

-- Tampilkan struktur tabel users
DESCRIBE users;

SELECT 'Setup database selesai! Anda bisa mulai menjalankan backend.' AS status;
