package handler

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	db "alumni-albahjah/db/sqlc"
	"alumni-albahjah/internal/middleware"
	"alumni-albahjah/internal/util"
	"golang.org/x/crypto/bcrypt"
)

type PrivateHandler struct {
	queries db.Querier
}

const (
	privilegedManagerEmail = "risamaarif@gmail.com"
	maxNewsThumbnailBytes  = 60000
)

func NewPrivateHandler(queries db.Querier) *PrivateHandler {
	return &PrivateHandler{queries: queries}
}

var allowedJobTypes = map[string]db.JobsJobType{
	"full_time": db.JobsJobTypeFullTime,
	"part_time": db.JobsJobTypePartTime,
	"remote":    db.JobsJobTypeRemote,
	"contract":  db.JobsJobTypeContract,
}

type jobPoster struct {
	ID       string  `json:"id"`
	FullName string  `json:"full_name"`
	Phone    *string `json:"phone,omitempty"`
	Email    string  `json:"email"`
}

func (h *PrivateHandler) resolveJobPoster(ctx context.Context, postedBy sql.NullString) *jobPoster {
	if !postedBy.Valid || postedBy.String == "" {
		return nil
	}

	u, err := h.queries.GetUserByID(ctx, postedBy.String)
	if err != nil {
		return nil
	}

	poster := &jobPoster{
		ID:       u.ID,
		FullName: u.FullName,
		Email:    u.Email,
	}

	p, err := h.queries.GetOrCreateProfile(ctx, postedBy.String)
	if err == nil && p.Phone.Valid && p.Phone.String != "" {
		poster.Phone = &p.Phone.String
	}

	return poster
}

func canManageJob(user *middleware.UserContext, job db.Job) bool {
	if user == nil {
		return false
	}
	if user.Role == "admin" {
		return true
	}
	if strings.EqualFold(user.Email, privilegedManagerEmail) {
		return true
	}
	return job.PostedBy.Valid && job.PostedBy.String == user.UserID
}

func canManageEvent(user *middleware.UserContext, event db.Event) bool {
	if user == nil {
		return false
	}
	if user.Role == "admin" {
		return true
	}
	return event.AuthorID.Valid && event.AuthorID.String == user.UserID
}

func canManageSurveys(user *middleware.UserContext) bool {
	if user == nil {
		return false
	}
	if user.Role == "admin" {
		return true
	}
	return strings.EqualFold(user.Email, privilegedManagerEmail)
}

func canManageNews(user *middleware.UserContext) bool {
	return canManageSurveys(user)
}

func canManageDirectory(user *middleware.UserContext) bool {
	return canManageSurveys(user)
}

var newsSlugSanitizer = regexp.MustCompile(`[^a-z0-9]+`)

func makeNewsSlug(title string) string {
	base := strings.TrimSpace(strings.ToLower(title))
	base = newsSlugSanitizer.ReplaceAllString(base, "-")
	base = strings.Trim(base, "-")
	if base == "" {
		base = "news"
	}
	return base + "-" + strconv.FormatInt(time.Now().Unix(), 10)
}

// GET /api/private/directory
func (h *PrivateHandler) ListDirectory(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, offset := parsePagination(r)
	search := r.URL.Query().Get("q")

	alumni, err := h.queries.ListAlumni(r.Context(), db.ListAlumniParams{
		Column1:  search,
		CONCAT:   search,
		CONCAT_2: search,
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil direktori alumni")
		return
	}
	if alumni == nil {
		alumni = []db.ListAlumniRow{}
	}

	total, _ := h.queries.CountAlumni(r.Context())

	// Normalize sql.NullString fields to plain strings for JSON response
	type AlumniItem struct {
		ID             string  `json:"id"`
		FullName       string  `json:"full_name"`
		BirthYear      int16   `json:"birth_year"`
		Email          string  `json:"email"`
		PhotoURL       *string `json:"photo_url"`
		City           *string `json:"city"`
		JobTitle       *string `json:"job_title"`
		Company        *string `json:"company"`
		GraduationYear *int16  `json:"graduation_year"`
		Major          *string `json:"major"`
		LinkedinURL    *string `json:"linkedin_url"`
		InstagramURL   *string `json:"instagram_url"`
		CanManage      bool    `json:"can_manage"`
	}

	result := make([]AlumniItem, len(alumni))
	canManage := canManageDirectory(user)
	for i, a := range alumni {
		item := AlumniItem{
			ID:        a.ID,
			FullName:  a.FullName,
			BirthYear: a.BirthYear,
			Email:     a.Email,
			CanManage: canManage,
		}
		if a.PhotoUrl.Valid {
			item.PhotoURL = &a.PhotoUrl.String
		}
		if a.City.Valid {
			item.City = &a.City.String
		}
		if a.JobTitle.Valid {
			item.JobTitle = &a.JobTitle.String
		}
		if a.Company.Valid {
			item.Company = &a.Company.String
		}
		if a.GraduationYear.Valid {
			item.GraduationYear = &a.GraduationYear.Int16
		}
		if a.Major.Valid {
			item.Major = &a.Major.String
		}
		if a.LinkedinUrl.Valid {
			item.LinkedinURL = &a.LinkedinUrl.String
		}
		if a.InstagramUrl.Valid {
			item.InstagramURL = &a.InstagramUrl.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"alumni":     result,
		"total":      total,
		"limit":      limit,
		"can_manage": canManage,
	})
}

// POST /api/private/directory
func (h *PrivateHandler) CreateDirectoryAlumni(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageDirectory(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola direktori alumni")
		return
	}

	var req struct {
		FullName       string  `json:"full_name"`
		BirthYear      int16   `json:"birth_year"`
		Email          string  `json:"email"`
		PhotoURL       *string `json:"photo_url"`
		City           *string `json:"city"`
		JobTitle       *string `json:"job_title"`
		Company        *string `json:"company"`
		GraduationYear *int16  `json:"graduation_year"`
		Major          *string `json:"major"`
		LinkedinURL    *string `json:"linkedin_url"`
		InstagramURL   *string `json:"instagram_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	fullName := strings.TrimSpace(req.FullName)
	email := strings.ToLower(strings.TrimSpace(req.Email))
	currentYear := int16(time.Now().Year() + 1)
	if fullName == "" || email == "" || req.BirthYear < 1940 || req.BirthYear > currentYear {
		util.WriteError(w, http.StatusBadRequest, "Nama, email, dan tahun lahir valid wajib diisi")
		return
	}

	passwordHash, err := generateRandomPasswordHash()
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menyiapkan data akun alumni")
		return
	}

	if _, err := h.queries.CreateAlumniUserByAdmin(r.Context(), db.CreateAlumniUserByAdminParams{
		FullName:  fullName,
		BirthYear: req.BirthYear,
		Email:     email,
		Password:  passwordHash,
	}); err != nil {
		if isDuplicateEmailErr(err) {
			util.WriteError(w, http.StatusConflict, "Email sudah digunakan alumni lain")
			return
		}
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat data alumni")
		return
	}

	createdUser, err := h.queries.GetUserByEmail(r.Context(), email)
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Data alumni dibuat tapi gagal mengambil detail user")
		return
	}

	if hasProfilePayload(req.PhotoURL, req.City, req.JobTitle, req.Company, req.GraduationYear, req.Major, req.LinkedinURL, req.InstagramURL) {
		if err := h.queries.UpsertProfile(r.Context(), db.UpsertProfileParams{
			UserID:         createdUser.ID,
			PhotoUrl:       normalizeOptionalString(req.PhotoURL),
			Phone:          sql.NullString{},
			GraduationYear: normalizeOptionalInt16(req.GraduationYear),
			Major:          normalizeOptionalString(req.Major),
			City:           normalizeOptionalString(req.City),
			JobTitle:       normalizeOptionalString(req.JobTitle),
			Company:        normalizeOptionalString(req.Company),
			Bio:            sql.NullString{},
			LinkedinUrl:    normalizeOptionalString(req.LinkedinURL),
			InstagramUrl:   normalizeOptionalString(req.InstagramURL),
		}); err != nil {
			util.WriteError(w, http.StatusInternalServerError, "Data alumni dibuat tetapi profil gagal disimpan")
			return
		}
	}

	util.WriteSuccess(w, http.StatusCreated, "Data alumni berhasil ditambahkan", map[string]interface{}{
		"id": createdUser.ID,
	})
}

// PUT /api/private/directory/{id}
func (h *PrivateHandler) UpdateDirectoryAlumni(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageDirectory(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola direktori alumni")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID alumni tidak valid")
		return
	}

	var req struct {
		FullName       *string `json:"full_name"`
		BirthYear      *int16  `json:"birth_year"`
		Email          *string `json:"email"`
		PhotoURL       *string `json:"photo_url"`
		City           *string `json:"city"`
		JobTitle       *string `json:"job_title"`
		Company        *string `json:"company"`
		GraduationYear *int16  `json:"graduation_year"`
		Major          *string `json:"major"`
		LinkedinURL    *string `json:"linkedin_url"`
		InstagramURL   *string `json:"instagram_url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	existingUser, err := h.queries.GetUserByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Data alumni tidak ditemukan")
		return
	}
	if existingUser.Role != db.UsersRoleAlumni {
		util.WriteError(w, http.StatusBadRequest, "Hanya data user alumni yang dapat diubah")
		return
	}

	newFullName := existingUser.FullName
	if req.FullName != nil {
		if strings.TrimSpace(*req.FullName) == "" {
			util.WriteError(w, http.StatusBadRequest, "Nama tidak boleh kosong")
			return
		}
		newFullName = strings.TrimSpace(*req.FullName)
	}

	newBirthYear := existingUser.BirthYear
	if req.BirthYear != nil {
		currentYear := int16(time.Now().Year() + 1)
		if *req.BirthYear < 1940 || *req.BirthYear > currentYear {
			util.WriteError(w, http.StatusBadRequest, "Tahun lahir tidak valid")
			return
		}
		newBirthYear = *req.BirthYear
	}

	newEmail := existingUser.Email
	if req.Email != nil {
		if strings.TrimSpace(*req.Email) == "" {
			util.WriteError(w, http.StatusBadRequest, "Email tidak boleh kosong")
			return
		}
		newEmail = strings.ToLower(strings.TrimSpace(*req.Email))
	}

	if err := h.queries.UpdateAlumniUserByAdmin(r.Context(), db.UpdateAlumniUserByAdminParams{
		FullName:  newFullName,
		BirthYear: newBirthYear,
		Email:     newEmail,
		ID:        id,
	}); err != nil {
		if isDuplicateEmailErr(err) {
			util.WriteError(w, http.StatusConflict, "Email sudah digunakan alumni lain")
			return
		}
		util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui data alumni")
		return
	}

	if hasProfilePayload(req.PhotoURL, req.City, req.JobTitle, req.Company, req.GraduationYear, req.Major, req.LinkedinURL, req.InstagramURL) {
		existingProfile, err := h.queries.GetOrCreateProfile(r.Context(), id)
		if err != nil && err != sql.ErrNoRows {
			util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil profil alumni")
			return
		}

		photoURL := mergeOptionalString(existingProfile.PhotoUrl, req.PhotoURL)
		phone := existingProfile.Phone
		gradYear := mergeOptionalInt16(existingProfile.GraduationYear, req.GraduationYear)
		major := mergeOptionalString(existingProfile.Major, req.Major)
		city := mergeOptionalString(existingProfile.City, req.City)
		jobTitle := mergeOptionalString(existingProfile.JobTitle, req.JobTitle)
		company := mergeOptionalString(existingProfile.Company, req.Company)
		bio := existingProfile.Bio
		linkedinURL := mergeOptionalString(existingProfile.LinkedinUrl, req.LinkedinURL)
		instagramURL := mergeOptionalString(existingProfile.InstagramUrl, req.InstagramURL)

		if err := h.queries.UpsertProfile(r.Context(), db.UpsertProfileParams{
			UserID:         id,
			PhotoUrl:       photoURL,
			Phone:          phone,
			GraduationYear: gradYear,
			Major:          major,
			City:           city,
			JobTitle:       jobTitle,
			Company:        company,
			Bio:            bio,
			LinkedinUrl:    linkedinURL,
			InstagramUrl:   instagramURL,
		}); err != nil {
			util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui profil alumni")
			return
		}
	}

	util.WriteSuccess(w, http.StatusOK, "Data alumni berhasil diperbarui", nil)
}

// DELETE /api/private/directory/{id}
func (h *PrivateHandler) DeleteDirectoryAlumni(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageDirectory(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola direktori alumni")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID alumni tidak valid")
		return
	}

	existingUser, err := h.queries.GetUserByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Data alumni tidak ditemukan")
		return
	}
	if existingUser.Role != db.UsersRoleAlumni {
		util.WriteError(w, http.StatusBadRequest, "Hanya data user alumni yang dapat dihapus")
		return
	}
	if strings.EqualFold(existingUser.Email, privilegedManagerEmail) {
		util.WriteError(w, http.StatusBadRequest, "Akun manager khusus tidak dapat dihapus")
		return
	}

	if err := h.queries.DeleteAlumniUserByAdmin(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menghapus data alumni")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Data alumni berhasil dihapus", nil)
}

// GET /api/private/jobs
func (h *PrivateHandler) ListJobs(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, offset := parsePagination(r)
	jobs, err := h.queries.ListJobs(r.Context(), db.ListJobsParams{Limit: limit, Offset: offset})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil lowongan")
		return
	}
	if jobs == nil {
		jobs = []db.ListJobsRow{}
	}

	// Normalize sql.NullString fields to plain strings for JSON response
	type JobItem struct {
		ID          string     `json:"id"`
		Title       string     `json:"title"`
		Company     string     `json:"company"`
		Location    *string    `json:"location"`
		JobType     string     `json:"job_type"`
		ApplyURL    *string    `json:"apply_url"`
		Description *string    `json:"description"`
		PostedBy    *string    `json:"posted_by"`
		Poster      *jobPoster `json:"poster"`
		ExpiresAt   *string    `json:"expires_at"`
		CanManage   bool       `json:"can_manage"`
		CreatedAt   string     `json:"created_at"`
	}

	result := make([]JobItem, len(jobs))
	for i, j := range jobs {
		fullJob, err := h.queries.GetJobByID(r.Context(), j.ID)
		if err != nil {
			util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil detail lowongan")
			return
		}

		item := JobItem{
			ID:        j.ID,
			Title:     j.Title,
			Company:   j.Company,
			JobType:   string(j.JobType),
			Poster:    h.resolveJobPoster(r.Context(), fullJob.PostedBy),
			CanManage: canManageJob(user, fullJob),
			CreatedAt: j.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if fullJob.Description.Valid {
			item.Description = &fullJob.Description.String
		}
		if j.Location.Valid {
			item.Location = &j.Location.String
		}
		if j.ApplyUrl.Valid {
			item.ApplyURL = &j.ApplyUrl.String
		}
		if j.ExpiresAt.Valid {
			t := j.ExpiresAt.Time.Format("2006-01-02T15:04:05Z07:00")
			item.ExpiresAt = &t
		}
		if fullJob.PostedBy.Valid {
			item.PostedBy = &fullJob.PostedBy.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"jobs":  result,
		"limit": limit,
	})
}

// GET /api/private/jobs/{id}
func (h *PrivateHandler) GetJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID lowongan tidak valid")
		return
	}

	job, err := h.queries.GetJobByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Lowongan tidak ditemukan")
		return
	}

	type JobDetail struct {
		ID          string     `json:"id"`
		Title       string     `json:"title"`
		Company     string     `json:"company"`
		Location    *string    `json:"location"`
		JobType     string     `json:"job_type"`
		Description *string    `json:"description"`
		ApplyURL    *string    `json:"apply_url"`
		PostedBy    *string    `json:"posted_by"`
		Poster      *jobPoster `json:"poster"`
		ExpiresAt   *string    `json:"expires_at"`
		Published   bool       `json:"published"`
		CanManage   bool       `json:"can_manage"`
		CreatedAt   string     `json:"created_at"`
	}

	item := JobDetail{
		ID:        job.ID,
		Title:     job.Title,
		Company:   job.Company,
		JobType:   string(job.JobType),
		Poster:    h.resolveJobPoster(r.Context(), job.PostedBy),
		Published: job.Published,
		CanManage: canManageJob(user, job),
		CreatedAt: job.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if job.Location.Valid {
		item.Location = &job.Location.String
	}
	if job.Description.Valid {
		item.Description = &job.Description.String
	}
	if job.ApplyUrl.Valid {
		item.ApplyURL = &job.ApplyUrl.String
	}
	if job.PostedBy.Valid {
		item.PostedBy = &job.PostedBy.String
	}
	if job.ExpiresAt.Valid {
		t := job.ExpiresAt.Time.Format("2006-01-02T15:04:05Z07:00")
		item.ExpiresAt = &t
	}

	util.WriteSuccess(w, http.StatusOK, "", item)
}

// POST /api/private/jobs
func (h *PrivateHandler) CreateJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Company     string  `json:"company"`
		Location    *string `json:"location"`
		JobType     string  `json:"job_type"`
		Description *string `json:"description"`
		ApplyURL    *string `json:"apply_url"`
		ExpiresAt   *string `json:"expires_at"`
		Published   *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if req.Title == "" || req.Company == "" {
		util.WriteError(w, http.StatusBadRequest, "Judul dan perusahaan wajib diisi")
		return
	}
	jobType := db.JobsJobTypeFullTime
	if req.JobType != "" {
		if jt, ok := allowedJobTypes[req.JobType]; ok {
			jobType = jt
		} else {
			util.WriteError(w, http.StatusBadRequest, "Tipe pekerjaan tidak valid")
			return
		}
	}

	expiresAt := sql.NullTime{}
	if req.ExpiresAt != nil && *req.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, "Format expires_at tidak valid (gunakan RFC3339)")
			return
		}
		expiresAt = sql.NullTime{Time: t, Valid: true}
	}

	published := true
	if req.Published != nil {
		published = *req.Published
	}

	if _, err := h.queries.CreateJob(r.Context(), db.CreateJobParams{
		Title:       req.Title,
		Company:     req.Company,
		Location:    nullStringFromPtr(req.Location),
		JobType:     jobType,
		Description: nullStringFromPtr(req.Description),
		ApplyUrl:    nullStringFromPtr(req.ApplyURL),
		PostedBy:    sql.NullString{String: user.UserID, Valid: true},
		ExpiresAt:   expiresAt,
		Published:   published,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat lowongan")
		return
	}

	util.WriteSuccess(w, http.StatusCreated, "Lowongan berhasil dibuat", nil)
}

// PUT /api/private/jobs/{id}
func (h *PrivateHandler) UpdateJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID lowongan tidak valid")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Company     string  `json:"company"`
		Location    *string `json:"location"`
		JobType     string  `json:"job_type"`
		Description *string `json:"description"`
		ApplyURL    *string `json:"apply_url"`
		ExpiresAt   *string `json:"expires_at"`
		Published   *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	job, err := h.queries.GetJobByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Lowongan tidak ditemukan")
		return
	}
	if !canManageJob(user, job) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin untuk mengubah lowongan ini")
		return
	}

	title := job.Title
	if req.Title != "" {
		title = req.Title
	}
	company := job.Company
	if req.Company != "" {
		company = req.Company
	}
	jobType := job.JobType
	if req.JobType != "" {
		if jt, ok := allowedJobTypes[req.JobType]; ok {
			jobType = jt
		} else {
			util.WriteError(w, http.StatusBadRequest, "Tipe pekerjaan tidak valid")
			return
		}
	}

	location := job.Location
	if req.Location != nil {
		if *req.Location == "" {
			location = sql.NullString{}
		} else {
			location = sql.NullString{String: *req.Location, Valid: true}
		}
	}
	description := job.Description
	if req.Description != nil {
		if *req.Description == "" {
			description = sql.NullString{}
		} else {
			description = sql.NullString{String: *req.Description, Valid: true}
		}
	}
	applyURL := job.ApplyUrl
	if req.ApplyURL != nil {
		if *req.ApplyURL == "" {
			applyURL = sql.NullString{}
		} else {
			applyURL = sql.NullString{String: *req.ApplyURL, Valid: true}
		}
	}

	expiresAt := job.ExpiresAt
	if req.ExpiresAt != nil {
		if *req.ExpiresAt == "" {
			expiresAt = sql.NullTime{}
		} else {
			t, err := time.Parse(time.RFC3339, *req.ExpiresAt)
			if err != nil {
				util.WriteError(w, http.StatusBadRequest, "Format expires_at tidak valid (gunakan RFC3339)")
				return
			}
			expiresAt = sql.NullTime{Time: t, Valid: true}
		}
	}

	published := job.Published
	if req.Published != nil {
		published = *req.Published
	}

	if err := h.queries.UpdateJob(r.Context(), db.UpdateJobParams{
		Title:       title,
		Company:     company,
		Location:    location,
		JobType:     jobType,
		Description: description,
		ApplyUrl:    applyURL,
		ExpiresAt:   expiresAt,
		Published:   published,
		ID:          id,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui lowongan")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Lowongan berhasil diperbarui", nil)
}

// DELETE /api/private/jobs/{id}
func (h *PrivateHandler) DeleteJob(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID lowongan tidak valid")
		return
	}

	job, err := h.queries.GetJobByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Lowongan tidak ditemukan")
		return
	}
	if !canManageJob(user, job) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin untuk menghapus lowongan ini")
		return
	}

	if err := h.queries.DeleteJob(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menghapus lowongan")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Lowongan berhasil dihapus", nil)
}

func nullStringFromPtr(v *string) sql.NullString {
	if v == nil || *v == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: *v, Valid: true}
}

func normalizeOptionalString(v *string) sql.NullString {
	if v == nil {
		return sql.NullString{}
	}
	trimmed := strings.TrimSpace(*v)
	if trimmed == "" {
		return sql.NullString{}
	}
	return sql.NullString{String: trimmed, Valid: true}
}

func normalizeOptionalInt16(v *int16) sql.NullInt16 {
	if v == nil || *v <= 0 {
		return sql.NullInt16{}
	}
	return sql.NullInt16{Int16: *v, Valid: true}
}

func mergeOptionalString(existing sql.NullString, next *string) sql.NullString {
	if next == nil {
		return existing
	}
	return normalizeOptionalString(next)
}

func mergeOptionalInt16(existing sql.NullInt16, next *int16) sql.NullInt16 {
	if next == nil {
		return existing
	}
	return normalizeOptionalInt16(next)
}

func hasProfilePayload(photoURL, city, jobTitle, company *string, graduationYear *int16, major, linkedinURL, instagramURL *string) bool {
	return photoURL != nil ||
		city != nil ||
		jobTitle != nil ||
		company != nil ||
		graduationYear != nil ||
		major != nil ||
		linkedinURL != nil ||
		instagramURL != nil
}

func generateRandomPasswordHash() (string, error) {
	seed, err := util.GenerateSecureToken()
	if err != nil {
		return "", err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(seed), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func isDuplicateEmailErr(err error) bool {
	if err == nil {
		return false
	}
	errMsg := strings.ToLower(err.Error())
	return strings.Contains(errMsg, "duplicate") && strings.Contains(errMsg, "email")
}

func boolToTinyInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

// ---- News Feed CRUD (admin or privileged email) ----

// GET /api/private/news
func (h *PrivateHandler) ListNewsPrivate(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageNews(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola news feed")
		return
	}

	limit, offset := parsePagination(r)
	news, err := h.queries.ListNewsPrivate(r.Context(), db.ListNewsPrivateParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil news feed")
		return
	}
	if news == nil {
		news = []db.ListNewsPrivateRow{}
	}

	type NewsItem struct {
		ID        string  `json:"id"`
		Title     string  `json:"title"`
		Slug      string  `json:"slug"`
		Content   string  `json:"content"`
		Thumbnail *string `json:"thumbnail"`
		Category  *string `json:"category"`
		Published bool    `json:"published"`
		CanManage bool    `json:"can_manage"`
		CreatedAt string  `json:"created_at"`
	}

	result := make([]NewsItem, len(news))
	for i, n := range news {
		item := NewsItem{
			ID:        n.ID,
			Title:     n.Title,
			Slug:      n.Slug,
			Content:   n.Content,
			Published: n.Published,
			CanManage: true,
			CreatedAt: n.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if n.Thumbnail.Valid {
			item.Thumbnail = &n.Thumbnail.String
		}
		if n.Category.Valid {
			item.Category = &n.Category.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"news":  result,
		"limit": limit,
	})
}

// POST /api/private/news
func (h *PrivateHandler) CreateNews(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageNews(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola news feed")
		return
	}

	var req struct {
		Title     string  `json:"title"`
		Content   string  `json:"content"`
		Thumbnail *string `json:"thumbnail"`
		Category  *string `json:"category"`
		Published *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.Content) == "" {
		util.WriteError(w, http.StatusBadRequest, "Judul dan konten wajib diisi")
		return
	}
	if req.Thumbnail != nil && len(*req.Thumbnail) > maxNewsThumbnailBytes {
		util.WriteError(w, http.StatusBadRequest, "Thumbnail terlalu besar untuk disimpan. Gunakan gambar lebih kecil.")
		return
	}

	published := true
	if req.Published != nil {
		published = *req.Published
	}

	if _, err := h.queries.CreateNews(r.Context(), db.CreateNewsParams{
		Title:     strings.TrimSpace(req.Title),
		Slug:      makeNewsSlug(req.Title),
		Content:   strings.TrimSpace(req.Content),
		Thumbnail: nullStringFromPtr(req.Thumbnail),
		Category:  nullStringFromPtr(req.Category),
		AuthorID:  sql.NullString{String: user.UserID, Valid: true},
		Published: published,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat news feed")
		return
	}

	util.WriteSuccess(w, http.StatusCreated, "News feed berhasil dibuat", nil)
}

// PUT /api/private/news/{id}
func (h *PrivateHandler) UpdateNews(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageNews(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola news feed")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID news tidak valid")
		return
	}

	var req struct {
		Title     *string `json:"title"`
		Content   *string `json:"content"`
		Thumbnail *string `json:"thumbnail"`
		Category  *string `json:"category"`
		Published *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	existing, err := h.queries.GetNewsByIDPrivate(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "News tidak ditemukan")
		return
	}

	title := existing.Title
	if req.Title != nil {
		if strings.TrimSpace(*req.Title) == "" {
			util.WriteError(w, http.StatusBadRequest, "Judul tidak boleh kosong")
			return
		}
		title = strings.TrimSpace(*req.Title)
	}

	content := existing.Content
	if req.Content != nil {
		if strings.TrimSpace(*req.Content) == "" {
			util.WriteError(w, http.StatusBadRequest, "Konten tidak boleh kosong")
			return
		}
		content = strings.TrimSpace(*req.Content)
	}

	thumbnail := existing.Thumbnail
	if req.Thumbnail != nil {
		if len(*req.Thumbnail) > maxNewsThumbnailBytes {
			util.WriteError(w, http.StatusBadRequest, "Thumbnail terlalu besar untuk disimpan. Gunakan gambar lebih kecil.")
			return
		}
		thumbnail = nullStringFromPtr(req.Thumbnail)
	}

	category := existing.Category
	if req.Category != nil {
		category = nullStringFromPtr(req.Category)
	}

	published := existing.Published
	if req.Published != nil {
		published = *req.Published
	}

	if err := h.queries.UpdateNews(r.Context(), db.UpdateNewsParams{
		Title:     title,
		Content:   content,
		Thumbnail: thumbnail,
		Category:  category,
		Published: published,
		ID:        id,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui news feed")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "News feed berhasil diperbarui", nil)
}

// DELETE /api/private/news/{id}
func (h *PrivateHandler) DeleteNews(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageNews(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola news feed")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID news tidak valid")
		return
	}

	if _, err := h.queries.GetNewsByIDPrivate(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusNotFound, "News tidak ditemukan")
		return
	}

	if err := h.queries.DeleteNews(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menghapus news feed")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "News feed berhasil dihapus", nil)
}

// ---- Events CRUD (owner or admin) ----

// GET /api/private/events
func (h *PrivateHandler) ListEventsPrivate(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	limit, offset := parsePagination(r)
	isAdmin := user.Role == "admin"

	events, err := h.queries.ListEventsPrivate(r.Context(), db.ListEventsPrivateParams{
		AuthorID: sql.NullString{String: user.UserID, Valid: true},
		Column2:  boolToTinyInt(isAdmin),
		Limit:    limit,
		Offset:   offset,
	})
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil event")
		return
	}
	if events == nil {
		events = []db.Event{}
	}

	type EventItem struct {
		ID        string  `json:"id"`
		Title     string  `json:"title"`
		Location  *string `json:"location"`
		EventType string  `json:"event_type"`
		StartTime string  `json:"start_time"`
		EndTime   *string `json:"end_time"`
		Published bool    `json:"published"`
		CanManage bool    `json:"can_manage"`
	}

	result := make([]EventItem, len(events))
	for i, e := range events {
		item := EventItem{
			ID:        e.ID,
			Title:     e.Title,
			EventType: string(e.EventType),
			StartTime: e.StartTime.Format("2006-01-02T15:04:05Z07:00"),
			Published: e.Published,
			CanManage: canManageEvent(user, e),
		}
		if e.Location.Valid {
			item.Location = &e.Location.String
		}
		if e.EndTime.Valid {
			t := e.EndTime.Time.Format("2006-01-02T15:04:05Z07:00")
			item.EndTime = &t
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"events": result,
		"limit":  limit,
	})
}

// GET /api/private/events/{id}
func (h *PrivateHandler) GetEventPrivate(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID event tidak valid")
		return
	}

	e, err := h.queries.GetEventByIDPrivate(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Event tidak ditemukan")
		return
	}

	type EventDetail struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		EventType   string  `json:"event_type"`
		ZoomLink    *string `json:"zoom_link"`
		StartTime   string  `json:"start_time"`
		EndTime     *string `json:"end_time"`
		Thumbnail   *string `json:"thumbnail"`
		Published   bool    `json:"published"`
		CanManage   bool    `json:"can_manage"`
		CreatedAt   string  `json:"created_at"`
	}

	item := EventDetail{
		ID:        e.ID,
		Title:     e.Title,
		EventType: string(e.EventType),
		Published: e.Published,
		CanManage: canManageEvent(user, e),
		StartTime: e.StartTime.Format("2006-01-02T15:04:05Z07:00"),
		CreatedAt: e.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
	}
	if e.Description.Valid {
		item.Description = &e.Description.String
	}
	if e.Location.Valid {
		item.Location = &e.Location.String
	}
	if e.ZoomLink.Valid {
		item.ZoomLink = &e.ZoomLink.String
	}
	if e.EndTime.Valid {
		t := e.EndTime.Time.Format("2006-01-02T15:04:05Z07:00")
		item.EndTime = &t
	}
	if e.Thumbnail.Valid {
		item.Thumbnail = &e.Thumbnail.String
	}

	util.WriteSuccess(w, http.StatusOK, "", item)
}

// POST /api/private/events
func (h *PrivateHandler) CreateEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		EventType   string  `json:"event_type"`
		ZoomLink    *string `json:"zoom_link"`
		StartTime   string  `json:"start_time"`
		EndTime     *string `json:"end_time"`
		Thumbnail   *string `json:"thumbnail"`
		Published   *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if req.Title == "" || req.StartTime == "" {
		util.WriteError(w, http.StatusBadRequest, "Judul dan start_time wajib diisi")
		return
	}

	eventType := db.EventsEventTypeOffline
	if req.EventType != "" {
		switch req.EventType {
		case "offline":
			eventType = db.EventsEventTypeOffline
		case "online":
			eventType = db.EventsEventTypeOnline
		default:
			util.WriteError(w, http.StatusBadRequest, "Tipe event tidak valid")
			return
		}
	}

	startTime, err := time.Parse(time.RFC3339, req.StartTime)
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format start_time tidak valid (gunakan RFC3339)")
		return
	}

	endTime := sql.NullTime{}
	if req.EndTime != nil && *req.EndTime != "" {
		t, err := time.Parse(time.RFC3339, *req.EndTime)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, "Format end_time tidak valid (gunakan RFC3339)")
			return
		}
		endTime = sql.NullTime{Time: t, Valid: true}
	}

	published := true
	if req.Published != nil {
		published = *req.Published
	}

	if _, err := h.queries.CreateEvent(r.Context(), db.CreateEventParams{
		Title:       req.Title,
		Description: nullStringFromPtr(req.Description),
		Location:    nullStringFromPtr(req.Location),
		EventType:   eventType,
		ZoomLink:    nullStringFromPtr(req.ZoomLink),
		StartTime:   startTime,
		EndTime:     endTime,
		Thumbnail:   nullStringFromPtr(req.Thumbnail),
		AuthorID:    sql.NullString{String: user.UserID, Valid: true},
		Published:   published,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat event")
		return
	}

	util.WriteSuccess(w, http.StatusCreated, "Event berhasil dibuat", nil)
}

// PUT /api/private/events/{id}
func (h *PrivateHandler) UpdateEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID event tidak valid")
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		Location    *string `json:"location"`
		EventType   *string `json:"event_type"`
		ZoomLink    *string `json:"zoom_link"`
		StartTime   *string `json:"start_time"`
		EndTime     *string `json:"end_time"`
		Thumbnail   *string `json:"thumbnail"`
		Published   *bool   `json:"published"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	existing, err := h.queries.GetEventByIDPrivate(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Event tidak ditemukan")
		return
	}
	if !canManageEvent(user, existing) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin untuk mengubah event ini")
		return
	}

	title := existing.Title
	if req.Title != nil && *req.Title != "" {
		title = *req.Title
	}

	eventType := existing.EventType
	if req.EventType != nil && *req.EventType != "" {
		switch *req.EventType {
		case "offline":
			eventType = db.EventsEventTypeOffline
		case "online":
			eventType = db.EventsEventTypeOnline
		default:
			util.WriteError(w, http.StatusBadRequest, "Tipe event tidak valid")
			return
		}
	}

	location := existing.Location
	if req.Location != nil {
		location = nullStringFromPtr(req.Location)
	}
	description := existing.Description
	if req.Description != nil {
		description = nullStringFromPtr(req.Description)
	}
	zoomLink := existing.ZoomLink
	if req.ZoomLink != nil {
		zoomLink = nullStringFromPtr(req.ZoomLink)
	}
	thumbnail := existing.Thumbnail
	if req.Thumbnail != nil {
		thumbnail = nullStringFromPtr(req.Thumbnail)
	}

	startTime := existing.StartTime
	if req.StartTime != nil {
		t, err := time.Parse(time.RFC3339, *req.StartTime)
		if err != nil {
			util.WriteError(w, http.StatusBadRequest, "Format start_time tidak valid (gunakan RFC3339)")
			return
		}
		startTime = t
	}

	endTime := existing.EndTime
	if req.EndTime != nil {
		if *req.EndTime == "" {
			endTime = sql.NullTime{}
		} else {
			t, err := time.Parse(time.RFC3339, *req.EndTime)
			if err != nil {
				util.WriteError(w, http.StatusBadRequest, "Format end_time tidak valid (gunakan RFC3339)")
				return
			}
			endTime = sql.NullTime{Time: t, Valid: true}
		}
	}

	published := existing.Published
	if req.Published != nil {
		published = *req.Published
	}

	if err := h.queries.UpdateEvent(r.Context(), db.UpdateEventParams{
		Title:       title,
		Description: description,
		Location:    location,
		EventType:   eventType,
		ZoomLink:    zoomLink,
		StartTime:   startTime,
		EndTime:     endTime,
		Thumbnail:   thumbnail,
		Published:   published,
		ID:          id,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui event")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Event berhasil diperbarui", nil)
}

// DELETE /api/private/events/{id}
func (h *PrivateHandler) DeleteEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID event tidak valid")
		return
	}

	existing, err := h.queries.GetEventByIDPrivate(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Event tidak ditemukan")
		return
	}
	if !canManageEvent(user, existing) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin untuk menghapus event ini")
		return
	}

	if err := h.queries.DeleteEvent(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menghapus event")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Event berhasil dihapus", nil)
}

// GET /api/private/surveys
func (h *PrivateHandler) ListSurveys(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	canManage := canManageSurveys(user)

	// Normalize sql.NullString fields to plain strings for JSON response
	type SurveyItem struct {
		ID          string  `json:"id"`
		Title       string  `json:"title"`
		Description *string `json:"description"`
		FormURL     string  `json:"form_url"`
		Active      bool    `json:"active"`
		CanManage   bool    `json:"can_manage"`
		CreatedAt   string  `json:"created_at"`
	}

	if canManage {
		surveys, err := h.queries.ListSurveysPrivate(r.Context())
		if err != nil {
			util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil survei")
			return
		}
		if surveys == nil {
			surveys = []db.Survey{}
		}

		result := make([]SurveyItem, len(surveys))
		for i, s := range surveys {
			item := SurveyItem{
				ID:        s.ID,
				Title:     s.Title,
				FormURL:   s.FormUrl,
				Active:    s.Active,
				CanManage: true,
				CreatedAt: s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			}
			if s.Description.Valid {
				item.Description = &s.Description.String
			}
			result[i] = item
		}

		util.WriteSuccess(w, http.StatusOK, "", result)
		return
	}

	surveys, err := h.queries.ListSurveys(r.Context())
	if err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mengambil survei")
		return
	}
	if surveys == nil {
		surveys = []db.ListSurveysRow{}
	}

	result := make([]SurveyItem, len(surveys))
	for i, s := range surveys {
		item := SurveyItem{
			ID:        s.ID,
			Title:     s.Title,
			FormURL:   s.FormUrl,
			Active:    true,
			CanManage: false,
			CreatedAt: s.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
		}
		if s.Description.Valid {
			item.Description = &s.Description.String
		}
		result[i] = item
	}

	util.WriteSuccess(w, http.StatusOK, "", result)
}

// POST /api/private/surveys
func (h *PrivateHandler) CreateSurvey(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageSurveys(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola survei")
		return
	}

	var req struct {
		Title       string  `json:"title"`
		Description *string `json:"description"`
		FormURL     string  `json:"form_url"`
		Active      *bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}
	if strings.TrimSpace(req.Title) == "" || strings.TrimSpace(req.FormURL) == "" {
		util.WriteError(w, http.StatusBadRequest, "Judul dan form_url wajib diisi")
		return
	}

	active := true
	if req.Active != nil {
		active = *req.Active
	}

	if _, err := h.queries.CreateSurvey(r.Context(), db.CreateSurveyParams{
		Title:       strings.TrimSpace(req.Title),
		Description: nullStringFromPtr(req.Description),
		FormUrl:     strings.TrimSpace(req.FormURL),
		AuthorID:    sql.NullString{String: user.UserID, Valid: true},
		Active:      active,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal membuat survei")
		return
	}

	util.WriteSuccess(w, http.StatusCreated, "Survei berhasil dibuat", nil)
}

// PUT /api/private/surveys/{id}
func (h *PrivateHandler) UpdateSurvey(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageSurveys(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola survei")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID survei tidak valid")
		return
	}

	var req struct {
		Title       *string `json:"title"`
		Description *string `json:"description"`
		FormURL     *string `json:"form_url"`
		Active      *bool   `json:"active"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		util.WriteError(w, http.StatusBadRequest, "Format request tidak valid")
		return
	}

	existing, err := h.queries.GetSurveyByID(r.Context(), id)
	if err != nil {
		util.WriteError(w, http.StatusNotFound, "Survei tidak ditemukan")
		return
	}

	title := existing.Title
	if req.Title != nil {
		if strings.TrimSpace(*req.Title) == "" {
			util.WriteError(w, http.StatusBadRequest, "Judul tidak boleh kosong")
			return
		}
		title = strings.TrimSpace(*req.Title)
	}

	description := existing.Description
	if req.Description != nil {
		description = nullStringFromPtr(req.Description)
	}

	formURL := existing.FormUrl
	if req.FormURL != nil {
		if strings.TrimSpace(*req.FormURL) == "" {
			util.WriteError(w, http.StatusBadRequest, "form_url tidak boleh kosong")
			return
		}
		formURL = strings.TrimSpace(*req.FormURL)
	}

	active := existing.Active
	if req.Active != nil {
		active = *req.Active
	}

	if err := h.queries.UpdateSurvey(r.Context(), db.UpdateSurveyParams{
		Title:       title,
		Description: description,
		FormUrl:     formURL,
		Active:      active,
		ID:          id,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal memperbarui survei")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Survei berhasil diperbarui", nil)
}

// DELETE /api/private/surveys/{id}
func (h *PrivateHandler) DeleteSurvey(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	if !canManageSurveys(user) {
		util.WriteError(w, http.StatusForbidden, "Anda tidak memiliki izin mengelola survei")
		return
	}

	id := r.PathValue("id")
	if id == "" {
		util.WriteError(w, http.StatusBadRequest, "ID survei tidak valid")
		return
	}

	if _, err := h.queries.GetSurveyByID(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusNotFound, "Survei tidak ditemukan")
		return
	}

	if err := h.queries.DeleteSurvey(r.Context(), id); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal menghapus survei")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Survei berhasil dihapus", nil)
}

// POST /api/private/events/{id}/register
func (h *PrivateHandler) RegisterEvent(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	eventID := r.PathValue("id")

	var req struct {
		Status string `json:"status"` // "interested" or "registered"
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Status == "" {
		req.Status = "registered"
	}
	status := db.EventRegistrationsStatusRegistered
	if req.Status == "interested" {
		status = db.EventRegistrationsStatusInterested
	}

	// Verify event exists
	if _, err := h.queries.GetEventByID(r.Context(), eventID); err != nil {
		util.WriteError(w, http.StatusNotFound, "Event tidak ditemukan")
		return
	}

	if err := h.queries.CreateEventRegistration(r.Context(), db.CreateEventRegistrationParams{
		EventID: eventID,
		UserID:  user.UserID,
		Status:  status,
	}); err != nil {
		util.WriteError(w, http.StatusInternalServerError, "Gagal mendaftar event")
		return
	}

	util.WriteSuccess(w, http.StatusOK, "Berhasil mendaftar event", nil)
}

// GET /api/private/events/{id}/registration
func (h *PrivateHandler) GetEventRegistration(w http.ResponseWriter, r *http.Request) {
	user := middleware.GetUserFromContext(r)
	if user == nil {
		util.WriteError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}
	eventID := r.PathValue("id")

	reg, err := h.queries.GetUserEventRegistration(r.Context(), db.GetUserEventRegistrationParams{
		EventID: eventID,
		UserID:  user.UserID,
	})
	if err != nil {
		util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{"registered": false})
		return
	}
	util.WriteSuccess(w, http.StatusOK, "", map[string]interface{}{
		"registered": true,
		"status":     string(reg.Status),
	})
}
