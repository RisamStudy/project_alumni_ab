-- Seed Data untuk Testing
-- Jalankan dengan: mysql -u root -p alumni_albahjah < backend/db/seed-data.sql

USE alumni_albahjah;

-- -------------------------------------------------
-- Akun default untuk testing login
-- Admin:
--   email    : admin@albahjah.test
--   password : Admin12345!
-- User biasa (alumni):
--   email    : user@albahjah.test
--   password : User12345!
-- email admin: admin2@test.com 
-- password admin (minimal 8 karakter): admin12345
-- Masukkan email super admin: admin1@yayasan.com
-- Masukkan password super admin (minimal 8 karakter): bismillah123
-- -------------------------------------------------
INSERT INTO users (id, full_name, birth_year, email, password, status, role)
VALUES
  (UUID(), 'Admin Portal', 1990, 'admin@albahjah.test', '$2a$10$dl4bnam8VPnHLR0oEZOIw.0UU3BqGbz7wEvIw7QIWVNtYLWoDpO8m', 'active', 'admin'),
  (UUID(), 'User Alumni', 2000, 'user@albahjah.test', '$2a$10$ooGiBv33MrmZPe7wQajKFevMcS9JyCOig1TVIUmhWkmv4PIJRG212', 'active', 'alumni')
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  birth_year = VALUES(birth_year),
  password = VALUES(password),
  status = VALUES(status),
  role = VALUES(role),
  updated_at = CURRENT_TIMESTAMP;

INSERT INTO profiles (user_id, city, major, graduation_year, job_title, company)
SELECT id, 'Cirebon', 'Tahfidz', 2022, 'Staff Alumni', 'Yayasan Al Bahjah'
FROM users
WHERE email = 'user@albahjah.test'
ON DUPLICATE KEY UPDATE
  city = VALUES(city),
  major = VALUES(major),
  graduation_year = VALUES(graduation_year),
  job_title = VALUES(job_title),
  company = VALUES(company),
  updated_at = CURRENT_TIMESTAMP;

-- Insert dummy news (jika belum ada)
INSERT IGNORE INTO news (id, title, slug, content, thumbnail, category, published, created_at)
VALUES 
(UUID(), 'Reuni Akbar Alumni 2024', 'reuni-akbar-alumni-2024', 
 'Reuni akbar alumni Al Bahjah akan diadakan pada bulan Desember 2024. Acara ini akan dihadiri oleh alumni dari berbagai angkatan.', 
 '/images/news1.jpg', 'Event', 1, NOW()),
(UUID(), 'Beasiswa S2 untuk Alumni', 'beasiswa-s2-untuk-alumni',
 'Tersedia beasiswa S2 untuk alumni Al Bahjah yang ingin melanjutkan studi ke jenjang magister.',
 '/images/news2.jpg', 'Beasiswa', 1, NOW()),
(UUID(), 'Pengabdian Masyarakat di Desa Terpencil', 'pengabdian-masyarakat-desa-terpencil',
 'Alumni Al Bahjah mengadakan program pengabdian masyarakat di desa terpencil.',
 '/images/news3.jpg', 'Kegiatan', 1, NOW());

-- Insert dummy events (jika belum ada)
INSERT IGNORE INTO events (id, title, description, location, event_type, start_time, end_time, thumbnail, published, created_at)
VALUES
(UUID(), 'Halaqah Bulanan Alumni', 'Kajian rutin bulanan untuk alumni Al Bahjah', 'Masjid Al Bahjah', 'offline', 
 DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 7 DAY), '/images/event1.jpg', 1, NOW()),
(UUID(), 'Webinar Karir & Entrepreneurship', 'Webinar online tentang pengembangan karir dan kewirausahaan', 'Zoom Meeting', 'online',
 DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 14 DAY), '/images/event2.jpg', 1, NOW());

-- Insert dummy jobs (jika belum ada)
INSERT IGNORE INTO jobs (id, title, company, location, job_type, description, apply_url, expires_at, published, created_at)
VALUES
(UUID(), 'Backend Developer', 'Tech Startup Indonesia', 'Jakarta', 'full_time', 
 'Mencari backend developer dengan pengalaman Go/Node.js', 'https://example.com/apply1',
 DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW()),
(UUID(), 'Frontend Developer', 'Digital Agency', 'Remote', 'remote',
 'Mencari frontend developer dengan pengalaman React/Next.js', 'https://example.com/apply2',
 DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW()),
(UUID(), 'Full Stack Developer', 'Software House', 'Bandung', 'full_time',
 'Mencari full stack developer untuk project internal', 'https://example.com/apply3',
 DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW()),
(UUID(), 'UI/UX Designer', 'Creative Studio', 'Yogyakarta', 'part_time',
 'Mencari UI/UX designer untuk project freelance', 'https://example.com/apply4',
 DATE_ADD(NOW(), INTERVAL 30 DAY), 1, NOW());

-- Insert dummy surveys (jika belum ada)
INSERT IGNORE INTO surveys (id, title, description, form_url, active, created_at)
VALUES
(UUID(), 'Survei Kepuasan Alumni', 'Bantu kami meningkatkan layanan dengan mengisi survei ini', 
 'https://forms.google.com/survey1', 1, NOW()),
(UUID(), 'Tracer Study Alumni 2024', 'Survei untuk melacak perkembangan karir alumni',
 'https://forms.google.com/survey2', 1, NOW());

-- Tampilkan hasil
SELECT 'Data berhasil di-seed!' AS status;
SELECT COUNT(*) AS total_news FROM news WHERE published = 1;
SELECT COUNT(*) AS total_events FROM events WHERE published = 1;
SELECT COUNT(*) AS total_jobs FROM jobs WHERE published = 1;
SELECT COUNT(*) AS total_surveys FROM surveys WHERE active = 1;
SELECT email, role, status FROM users WHERE email IN ('admin@albahjah.test', 'user@albahjah.test');
