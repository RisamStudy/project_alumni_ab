-- Migration: 003_add_super_admin_role.sql
-- Tambahkan role super_admin ke tabel users.

ALTER TABLE users
    MODIFY COLUMN role ENUM('alumni', 'admin', 'super_admin') NOT NULL DEFAULT 'alumni';

-- Jika akun ini sudah ada, naikkan hak aksesnya sebagai super admin.
UPDATE users
SET role = 'super_admin'
WHERE email = 'risamaarif@gmail.com';
