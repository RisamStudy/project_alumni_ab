-- name: CreateUser :execresult
INSERT INTO users (id, full_name, birth_year, email, password, status, role)
VALUES (UUID(), ?, ?, ?, ?, 'unverified', 'alumni');

-- name: GetUserByEmail :one
SELECT id, full_name, birth_year, email, password, status, role, created_at, updated_at
FROM users
WHERE email = ?
LIMIT 1;

-- name: GetUserByID :one
SELECT id, full_name, birth_year, email, password, status, role, created_at, updated_at
FROM users
WHERE id = ?
LIMIT 1;

-- name: UpdateUserStatus :exec
UPDATE users SET status = ? WHERE id = ?;

-- name: UpdateUserPassword :exec
UPDATE users SET password = ? WHERE id = ?;

-- name: ListAlumni :many
SELECT u.id, u.full_name, u.birth_year, u.email, u.status, u.role, u.created_at,
       p.photo_url, p.city, p.job_title, p.company, p.graduation_year, p.major, p.linkedin_url, p.instagram_url
FROM users u
LEFT JOIN profiles p ON p.user_id = u.id
WHERE u.status = 'active'
  AND u.role = 'alumni'
  AND (? = '' OR u.full_name LIKE CONCAT('%', ?, '%') OR p.city LIKE CONCAT('%', ?, '%'))
ORDER BY u.full_name ASC
LIMIT ? OFFSET ?;

-- name: CountAlumni :one
SELECT COUNT(*) FROM users WHERE status = 'active' AND role = 'alumni';

-- name: CreateAlumniUserByAdmin :execresult
INSERT INTO users (id, full_name, birth_year, email, password, status, role)
VALUES (UUID(), ?, ?, ?, ?, 'active', 'alumni');

-- name: UpdateAlumniUserByAdmin :exec
UPDATE users
SET full_name = ?, birth_year = ?, email = ?
WHERE id = ? AND role = 'alumni';

-- name: DeleteAlumniUserByAdmin :exec
DELETE FROM users
WHERE id = ? AND role = 'alumni';

-- name: CreateEmailVerification :exec
INSERT INTO email_verifications (id, user_id, token, expires_at)
VALUES (UUID(), ?, ?, ?);

-- name: GetEmailVerification :one
SELECT id, user_id, token, expires_at, used
FROM email_verifications
WHERE token = ? AND used = 0 AND expires_at > NOW()
LIMIT 1;

-- name: MarkEmailVerificationUsed :exec
UPDATE email_verifications SET used = 1 WHERE token = ?;

-- name: CreatePasswordReset :exec
INSERT INTO password_resets (id, user_id, token, expires_at)
VALUES (UUID(), ?, ?, ?);

-- name: GetPasswordReset :one
SELECT id, user_id, token, expires_at, used
FROM password_resets
WHERE token = ? AND used = 0 AND expires_at > NOW()
LIMIT 1;

-- name: MarkPasswordResetUsed :exec
UPDATE password_resets SET used = 1 WHERE token = ?;

-- name: CreateRefreshToken :exec
INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
VALUES (UUID(), ?, ?, ?);

-- name: GetRefreshToken :one
SELECT id, user_id, token_hash, expires_at
FROM refresh_tokens
WHERE token_hash = ? AND expires_at > NOW()
LIMIT 1;

-- name: DeleteRefreshToken :exec
DELETE FROM refresh_tokens WHERE token_hash = ?;

-- name: DeleteAllUserRefreshTokens :exec
DELETE FROM refresh_tokens WHERE user_id = ?;

-- name: GetOrCreateProfile :one
SELECT user_id, photo_url, phone, graduation_year, major, city, job_title, company, bio, linkedin_url, instagram_url, updated_at
FROM profiles
WHERE user_id = ?
LIMIT 1;

-- name: UpsertProfile :exec
INSERT INTO profiles (user_id, photo_url, phone, graduation_year, major, city, job_title, company, bio, linkedin_url, instagram_url)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE
    photo_url       = VALUES(photo_url),
    phone           = VALUES(phone),
    graduation_year = VALUES(graduation_year),
    major           = VALUES(major),
    city            = VALUES(city),
    job_title       = VALUES(job_title),
    company         = VALUES(company),
    bio             = VALUES(bio),
    linkedin_url    = VALUES(linkedin_url),
    instagram_url   = VALUES(instagram_url),
    updated_at      = CURRENT_TIMESTAMP;

-- name: ListNews :many
SELECT id, title, slug, thumbnail, category, published, created_at
FROM news
WHERE published = 1
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: GetNewsBySlug :one
SELECT n.id, n.title, n.slug, n.content, n.thumbnail, n.category, n.published, n.created_at,
       u.full_name AS author_name
FROM news n
LEFT JOIN users u ON u.id = n.author_id
WHERE n.slug = ? AND n.published = 1
LIMIT 1;

-- name: ListNewsPrivate :many
SELECT id, title, slug, content, thumbnail, category, author_id, published, created_at
FROM news
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: GetNewsByIDPrivate :one
SELECT id, title, slug, content, thumbnail, category, author_id, published, created_at
FROM news
WHERE id = ?
LIMIT 1;

-- name: CreateNews :execresult
INSERT INTO news (id, title, slug, content, thumbnail, category, author_id, published)
VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateNews :exec
UPDATE news
SET title = ?, content = ?, thumbnail = ?, category = ?, published = ?
WHERE id = ?;

-- name: DeleteNews :exec
DELETE FROM news
WHERE id = ?;

-- name: ListEvents :many
SELECT id, title, description, location, event_type, zoom_link, start_time, end_time, thumbnail, created_at
FROM events
WHERE published = 1
ORDER BY start_time ASC
LIMIT ? OFFSET ?;

-- name: ListEventsPrivate :many
SELECT id, title, description, location, event_type, zoom_link, start_time, end_time, thumbnail, author_id, published, created_at
FROM events
WHERE author_id = ? OR ? = 1
ORDER BY start_time DESC
LIMIT ? OFFSET ?;

-- name: GetEventByID :one
SELECT id, title, description, location, event_type, zoom_link, start_time, end_time, thumbnail, created_at
FROM events
WHERE id = ? AND published = 1
LIMIT 1;

-- name: GetEventByIDPrivate :one
SELECT id, title, description, location, event_type, zoom_link, start_time, end_time, thumbnail, author_id, published, created_at
FROM events
WHERE id = ?
LIMIT 1;

-- name: CreateEvent :execresult
INSERT INTO events (id, title, description, location, event_type, zoom_link, start_time, end_time, thumbnail, author_id, published)
VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateEvent :exec
UPDATE events
SET title = ?, description = ?, location = ?, event_type = ?, zoom_link = ?, start_time = ?, end_time = ?, thumbnail = ?, published = ?
WHERE id = ?;

-- name: DeleteEvent :exec
DELETE FROM events WHERE id = ?;

-- name: CreateEventRegistration :exec
INSERT INTO event_registrations (id, event_id, user_id, status)
VALUES (UUID(), ?, ?, ?)
ON DUPLICATE KEY UPDATE status = VALUES(status);

-- name: GetUserEventRegistration :one
SELECT id, event_id, user_id, status, created_at
FROM event_registrations
WHERE event_id = ? AND user_id = ?
LIMIT 1;

-- name: ListJobs :many
SELECT id, title, company, location, job_type, apply_url, expires_at, created_at
FROM jobs
WHERE published = 1 AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY created_at DESC
LIMIT ? OFFSET ?;

-- name: GetJobByID :one
SELECT id, title, company, location, job_type, description, apply_url, posted_by, expires_at, published, created_at
FROM jobs
WHERE id = ?
LIMIT 1;

-- name: CreateJob :execresult
INSERT INTO jobs (id, title, company, location, job_type, description, apply_url, posted_by, expires_at, published)
VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?);

-- name: UpdateJob :exec
UPDATE jobs
SET title = ?, company = ?, location = ?, job_type = ?, description = ?, apply_url = ?, expires_at = ?, published = ?
WHERE id = ?;

-- name: DeleteJob :exec
DELETE FROM jobs WHERE id = ?;

-- name: ListSurveys :many
SELECT id, title, description, form_url, created_at
FROM surveys
WHERE active = 1
ORDER BY created_at DESC;

-- name: ListSurveysPrivate :many
SELECT id, title, description, form_url, author_id, active, created_at
FROM surveys
ORDER BY created_at DESC;

-- name: GetSurveyByID :one
SELECT id, title, description, form_url, author_id, active, created_at
FROM surveys
WHERE id = ?
LIMIT 1;

-- name: CreateSurvey :execresult
INSERT INTO surveys (id, title, description, form_url, author_id, active)
VALUES (UUID(), ?, ?, ?, ?, ?);

-- name: UpdateSurvey :exec
UPDATE surveys
SET title = ?, description = ?, form_url = ?, active = ?
WHERE id = ?;

-- name: DeleteSurvey :exec
DELETE FROM surveys
WHERE id = ?;
