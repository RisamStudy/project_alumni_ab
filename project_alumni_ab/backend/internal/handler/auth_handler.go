package handler

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	db "alumni-albahjah/db/sqlc"
	"alumni-albahjah/internal/middleware"
	"alumni-albahjah/internal/util"

	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	queries   db.Querier
	jwtSecret string
	emailCfg  util.EmailConfig
}

func NewAuthHandler(queries db.Querier, jwtSecret string, emailCfg util.EmailConfig) *AuthHandler {
	return &AuthHandler{queries: queries, jwtSecret: jwtSecret, emailCfg: emailCfg}
}

// POST /api/auth/register
func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FullName  string `json:"full_name"`
		BirthYear int16  `json:"birth_year"`
		Email     string `json:"email"`
		Password  string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if req.FullName == "" || req.Email == "" || req.Password == "" || req.BirthYear == 0 {
		util.WriteError(w, http.StatusBadRequest, "Semua field wajib diisi")
		return
	}
	if len(req.Password) < 8 {
		util.WriteError(w, http.StatusBadRequest, "Password minimal 8 karakter")
		return
	}

	// Check email exist
	_, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err == nil {
		util.WriteError(w, http.StatusConflict, "Email sudah terdaftar")
		return
	}
	if !errors.Is(err, sql.ErrNoRows) {
		util.WriteError(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}

	// Create user
	if _, err = h.queries.CreateUser(r.Context(), db.CreateUserParams{
		FullName:  req.FullName,
		BirthYear: req.BirthYear,
		Email:     req.Email,
		Password:  string(hash),
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat akun")
		return
	}

	// Get user to get ID
	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}

	// Create email verification token
	token, err := util.GenerateSecureToken()
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}
	if err = h.queries.CreateEmailVerification(r.Context(), db.CreateEmailVerificationParams{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat token verifikasi")
		return
	}

	// Send verification email (non-blocking)
	go util.SendVerificationEmail(h.emailCfg, req.Email, req.FullName, token)

	util.WriteSuccess(w, http.StatusCreated, "Registrasi berhasil! Cek email Anda untuk verifikasi akun.", nil)
}

// GET /api/auth/verify?token=xxx
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	token := r.URL.Query().Get("token")
	if token == "" {
		util.WriteError(w, http.StatusBadRequest, "Token tidak ditemukan")
		return
	}

	ev, err := h.queries.GetEmailVerification(r.Context(), token)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "Token tidak valid atau sudah kadaluarsa")
		return
	}

	if err = h.queries.UpdateUserStatus(r.Context(), db.UpdateUserStatusParams{
		Status: db.UsersStatusActive,
		ID:     ev.UserID,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal verifikasi email")
		return
	}

	h.queries.MarkEmailVerificationUsed(r.Context(), token)
	util.WriteSuccess(w, http.StatusOK, "Email berhasil diverifikasi! Silakan login.", nil)
}

// POST /api/auth/login
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}
	if user.Status == db.UsersStatusUnverified {
		util.WriteError(w, http.StatusUnauthorized, "Email belum diverifikasi. Cek inbox email Anda.")
		return
	}
	if user.Status == db.UsersStatusSuspended {
		util.WriteError(w, http.StatusForbidden, "Akun Anda telah ditangguhkan")
		return
	}
	if err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		util.WriteError(w, http.StatusUnauthorized, "Email atau password salah")
		return
	}

	// Generate tokens
	accessToken, err := util.GenerateAccessToken(user.ID, user.Email, string(user.Role), h.jwtSecret)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat token")
		return
	}
	refreshToken, err := util.GenerateRefreshToken(user.ID, h.jwtSecret)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat token")
		return
	}

	// Store refresh token hash
	tokenHash := util.HashToken(refreshToken)
	h.queries.CreateRefreshToken(r.Context(), db.CreateRefreshTokenParams{
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(7 * 24 * time.Hour),
	})

	// Set refresh token as HttpOnly cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		HttpOnly: true,
		Secure:   true,
		SameSite: http.SameSiteStrictMode,
		Path:     "/api/auth",
		Expires:  time.Now().Add(7 * 24 * time.Hour),
	})

	// Get profile for completion calc
	profile, _ := h.queries.GetOrCreateProfile(r.Context(), user.ID)

	util.WriteSuccess(w, http.StatusOK, "Login berhasil", map[string]interface{}{
		"access_token": accessToken,
		"user": map[string]interface{}{
			"id":                 user.ID,
			"full_name":          user.FullName,
			"email":              user.Email,
			"role":               string(user.Role),
			"profile_completion": calcProfileCompletion(profile),
		},
	})
}

// POST /api/auth/refresh
func (h *AuthHandler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "Refresh token tidak ditemukan")
		return
	}

	claims, err := util.ValidateToken(cookie.Value, h.jwtSecret)
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "Refresh token tidak valid")
		return
	}

	tokenHash := util.HashToken(cookie.Value)
	rt, err := h.queries.GetRefreshToken(r.Context(), tokenHash)
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "Refresh token tidak ditemukan di server")
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), rt.UserID)
	if err != nil {
		util.WriteError(w, http.StatusUnauthorized, "User tidak ditemukan")
		return
	}

	_ = claims
	accessToken, err := util.GenerateAccessToken(user.ID, user.Email, string(user.Role), h.jwtSecret)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat token")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Token berhasil diperbarui", map[string]interface{}{
		"access_token": accessToken,
	})
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	cookie, err := r.Cookie("refresh_token")
	if err == nil {
		tokenHash := util.HashToken(cookie.Value)
		h.queries.DeleteRefreshToken(r.Context(), tokenHash)
	}
	http.SetCookie(w, &http.Cookie{
		Name:    "refresh_token",
		Value:   "",
		MaxAge:  -1,
		Path:    "/api/auth",
		Expires: time.Unix(0, 0),
	})
	util.WriteSuccess(w, http.StatusOK, "Logout berhasil", nil)
}

// POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	// Always return success to prevent user enumeration
	msg := "Jika email terdaftar, link reset password telah dikirim."

	user, err := h.queries.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		util.WriteSuccess(w, http.StatusOK, msg, nil)
		return
	}

	token, err := util.GenerateSecureToken()
	if err != nil {
		util.WriteSuccess(w, http.StatusOK, msg, nil)
		return
	}

	h.queries.CreatePasswordReset(r.Context(), db.CreatePasswordResetParams{
		UserID:    user.ID,
		Token:     token,
		ExpiresAt: time.Now().Add(1 * time.Hour),
	})

	go util.SendPasswordResetEmail(h.emailCfg, user.Email, user.FullName, token)

	util.WriteSuccess(w, http.StatusOK, msg, nil)
}

// POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if len(req.NewPassword) < 8 {
		util.WriteError(w, http.StatusBadRequest, "Password minimal 8 karakter")
		return
	}

	pr, err := h.queries.GetPasswordReset(r.Context(), req.Token)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "Token tidak valid atau sudah kadaluarsa")
		return
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Terjadi kesalahan server")
		return
	}

	h.queries.UpdateUserPassword(r.Context(), db.UpdateUserPasswordParams{
		Password: string(hash),
		ID:       pr.UserID,
	})
	h.queries.MarkPasswordResetUsed(r.Context(), req.Token)
	h.queries.DeleteAllUserRefreshTokens(r.Context(), pr.UserID)

	util.WriteSuccess(w, http.StatusOK, "Password berhasil diubah. Silakan login kembali.", nil)
}

// Profile completion percentage
func calcProfileCompletion(p db.GetOrCreateProfileRow) int {
	total := 0
	if p.PhotoUrl.Valid && p.PhotoUrl.String != "" {
		total += 20
	}
	if p.Phone.Valid && p.Phone.String != "" {
		total += 15
	}
	if p.GraduationYear.Valid {
		total += 15
	}
	if p.Major.Valid && p.Major.String != "" {
		total += 15
	}
	if p.City.Valid && p.City.String != "" {
		total += 15
	}
	if p.JobTitle.Valid && p.JobTitle.String != "" {
		total += 20
	}
	return total
}

// GET /api/private/profile
func (h *AuthHandler) GetProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	u, err := h.queries.GetUserByID(r.Context(), user.UserID)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "User tidak ditemukan")
		return
	}

	profile, _ := h.queries.GetOrCreateProfile(r.Context(), user.UserID)

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"id":                 u.ID,
		"full_name":          u.FullName,
		"birth_year":         u.BirthYear,
		"email":              u.Email,
		"role":               string(u.Role),
		"profile_completion": calcProfileCompletion(profile),
		"profile":            profile,
	})
}

// PUT /api/private/profile
func (h *AuthHandler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		PhotoURL       string `json:"photo_url"`
		Phone          string `json:"phone"`
		GraduationYear *int16 `json:"graduation_year"`
		Major          string `json:"major"`
		City           string `json:"city"`
		JobTitle       string `json:"job_title"`
		Company        string `json:"company"`
		Bio            string `json:"bio"`
		LinkedinURL    string `json:"linkedin_url"`
		InstagramURL   string `json:"instagram_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	nullStr := func(s string) sql.NullString {
		return sql.NullString{String: s, Valid: s != ""}
	}
	var gradYear sql.NullInt16
	if req.GraduationYear != nil {
		gradYear = sql.NullInt16{Int16: *req.GraduationYear, Valid: true}
	}

	if err := h.queries.UpsertProfile(r.Context(), db.UpsertProfileParams{
		UserID:         user.UserID,
		PhotoUrl:       nullStr(req.PhotoURL),
		Phone:          nullStr(req.Phone),
		GraduationYear: gradYear,
		Major:          nullStr(req.Major),
		City:           nullStr(req.City),
		JobTitle:       nullStr(req.JobTitle),
		Company:        nullStr(req.Company),
		Bio:            nullStr(req.Bio),
		LinkedinUrl:    nullStr(req.LinkedinURL),
		InstagramUrl:   nullStr(req.InstagramURL),
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal update profil")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Profil berhasil diperbarui", nil)
}

// POST /api/private/upload/profile-photo
func (h *AuthHandler) UploadProfilePhoto(w http.ResponseWriter, r *http.Request) {
	const maxPhotoSize = 10 * 1024 * 1024 // 10MB

	if err := r.ParseMultipartForm(maxPhotoSize); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Ukuran file maksimal 10MB")
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "File foto tidak ditemukan")
		return
	}
	defer file.Close()

	if header.Size > maxPhotoSize {
		util.WriteError(w, http.StatusBadRequest, "Ukuran file maksimal 10MB")
		return
	}

	// Read file header to detect content type.
	sniff := make([]byte, 512)
	n, _ := file.Read(sniff)
	contentType := http.DetectContentType(sniff[:n])
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membaca file upload")
		return
	}

	var ext string
	switch contentType {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	default:
		util.WriteError(w, http.StatusBadRequest, "Format file harus JPG, PNG, atau WebP")
		return
	}

	filename, err := generateProfilePhotoFilename(ext)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal memproses nama file")
		return
	}

	uploadDir := resolveProfileUploadDir()
	if err := os.MkdirAll(uploadDir, 0o755); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menyiapkan folder upload")
		return
	}

	dstPath := filepath.Join(uploadDir, filename)
	dst, err := os.Create(dstPath)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menyimpan foto")
		return
	}
	defer dst.Close()

	written, err := io.Copy(dst, io.LimitReader(file, maxPhotoSize+1))
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menyimpan foto")
		return
	}
	if written > maxPhotoSize {
		_ = os.Remove(dstPath)
		util.WriteError(w, http.StatusBadRequest, "Ukuran file maksimal 10MB")
		return
	}

	photoURL := buildPublicUploadURL(r, filename)
	util.WriteSuccess(w, http.StatusOK, "Foto profil berhasil diupload", map[string]interface{}{
		"photo_url": photoURL,
	})
}

func generateProfilePhotoFilename(ext string) (string, error) {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return fmt.Sprintf("profile_%d_%s%s", time.Now().UnixNano(), strings.ToLower(fmt.Sprintf("%x", b)), ext), nil
}

func resolveProfileUploadDir() string {
	if _, err := os.Stat(filepath.Join("frontend", "public")); err == nil {
		return filepath.Join("frontend", "public", "uploads", "profiles")
	}
	if _, err := os.Stat(filepath.Join("..", "frontend", "public")); err == nil {
		return filepath.Join("..", "frontend", "public", "uploads", "profiles")
	}
	return filepath.Join("uploads", "profiles")
}

func buildPublicUploadURL(r *http.Request, filename string) string {
	scheme := "http"
	if r.TLS != nil {
		scheme = "https"
	}
	if forwardedProto := strings.TrimSpace(r.Header.Get("X-Forwarded-Proto")); forwardedProto != "" {
		scheme = forwardedProto
	}
	return fmt.Sprintf("%s://%s/uploads/profiles/%s", scheme, r.Host, filename)
}
