package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"

	db "alumni-albahjah/db/sqlc"
	"alumni-albahjah/internal/handler"
	"alumni-albahjah/internal/middleware"
	"alumni-albahjah/internal/util"
)

func main() {
	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	// DB connection
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&charset=utf8mb4&loc=Local",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)
	sqlDB, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer sqlDB.Close()

	sqlDB.SetMaxOpenConns(25)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(5 * time.Minute)

	if err = sqlDB.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}
	log.Println("✓ Database connected")

	// Init queries
	queries := db.New(sqlDB)

	// Email config
	emailCfg := util.GetEmailConfig()
	if emailCfg.APIKey == "" {
		log.Println("⚠️  Warning: RESEND_API_KEY not set, email features will not work")
	}

	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is required")
	}

	// Handlers
	authH := handler.NewAuthHandler(queries, jwtSecret, emailCfg)
	contentH := handler.NewContentHandler(queries)
	privateH := handler.NewPrivateHandler(queries, sqlDB)
	webhookH := handler.NewWebhookHandler()

	jwtMiddleware := middleware.JWTAuth(jwtSecret)

	// Router (Go 1.22+ native pattern matching)
	mux := http.NewServeMux()

	// Auth routes
	mux.HandleFunc("POST /api/auth/register", authH.Register)
	mux.HandleFunc("GET /api/auth/verify", authH.VerifyEmail)
	mux.HandleFunc("POST /api/auth/login", authH.Login)
	mux.HandleFunc("POST /api/auth/refresh", authH.RefreshToken)
	mux.HandleFunc("POST /api/auth/logout", authH.Logout)
	mux.HandleFunc("POST /api/auth/forgot-password", authH.ForgotPassword)
	mux.HandleFunc("POST /api/auth/reset-password", authH.ResetPassword)

	// Webhook routes (public - called by Resend)
	mux.HandleFunc("POST /api/webhooks/resend", webhookH.HandleResendWebhook)

	// Public routes
	mux.HandleFunc("GET /api/public/news", contentH.ListNews)
	mux.HandleFunc("GET /api/public/news/{slug}", contentH.GetNews)
	mux.HandleFunc("GET /api/public/events", contentH.ListEvents)
	mux.HandleFunc("GET /api/public/events/{id}", contentH.GetEvent)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(resolveUploadsRootDir()))))

	// Private routes (JWT protected)
	mux.Handle("GET /api/private/profile", jwtMiddleware(http.HandlerFunc(authH.GetProfile)))
	mux.Handle("PUT /api/private/profile", jwtMiddleware(http.HandlerFunc(authH.UpdateProfile)))
	mux.Handle("POST /api/private/upload/profile-photo", jwtMiddleware(http.HandlerFunc(authH.UploadProfilePhoto)))
	mux.Handle("GET /api/private/directory", jwtMiddleware(http.HandlerFunc(privateH.ListDirectory)))
	mux.Handle("POST /api/private/directory", jwtMiddleware(http.HandlerFunc(privateH.CreateDirectoryAlumni)))
	mux.Handle("PUT /api/private/directory/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateDirectoryAlumni)))
	mux.Handle("DELETE /api/private/directory/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteDirectoryAlumni)))
	mux.Handle("GET /api/private/news", jwtMiddleware(http.HandlerFunc(privateH.ListNewsPrivate)))
	mux.Handle("POST /api/private/news", jwtMiddleware(http.HandlerFunc(privateH.CreateNews)))
	mux.Handle("PUT /api/private/news/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateNews)))
	mux.Handle("DELETE /api/private/news/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteNews)))
	mux.Handle("GET /api/private/jobs", jwtMiddleware(http.HandlerFunc(privateH.ListJobs)))
	mux.Handle("GET /api/private/jobs/{id}", jwtMiddleware(http.HandlerFunc(privateH.GetJob)))
	mux.Handle("POST /api/private/jobs", jwtMiddleware(http.HandlerFunc(privateH.CreateJob)))
	mux.Handle("PUT /api/private/jobs/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateJob)))
	mux.Handle("DELETE /api/private/jobs/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteJob)))
	mux.Handle("GET /api/private/events", jwtMiddleware(http.HandlerFunc(privateH.ListEventsPrivate)))
	mux.Handle("GET /api/private/events/{id}", jwtMiddleware(http.HandlerFunc(privateH.GetEventPrivate)))
	mux.Handle("POST /api/private/events", jwtMiddleware(http.HandlerFunc(privateH.CreateEvent)))
	mux.Handle("PUT /api/private/events/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateEvent)))
	mux.Handle("DELETE /api/private/events/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteEvent)))
	mux.Handle("GET /api/private/surveys", jwtMiddleware(http.HandlerFunc(privateH.ListSurveys)))
	mux.Handle("POST /api/private/surveys", jwtMiddleware(http.HandlerFunc(privateH.CreateSurvey)))
	mux.Handle("PUT /api/private/surveys/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateSurvey)))
	mux.Handle("DELETE /api/private/surveys/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteSurvey)))
	mux.Handle("POST /api/private/events/{id}/register", jwtMiddleware(http.HandlerFunc(privateH.RegisterEvent)))
	mux.Handle("GET /api/private/events/{id}/registration", jwtMiddleware(http.HandlerFunc(privateH.GetEventRegistration)))
	mux.Handle("GET /api/private/admins", jwtMiddleware(http.HandlerFunc(privateH.ListAdminUsers)))
	mux.Handle("POST /api/private/admins", jwtMiddleware(http.HandlerFunc(privateH.CreateAdminUser)))
	mux.Handle("PUT /api/private/admins/{id}", jwtMiddleware(http.HandlerFunc(privateH.UpdateAdminUser)))
	mux.Handle("DELETE /api/private/admins/{id}", jwtMiddleware(http.HandlerFunc(privateH.DeleteAdminUser)))
	mux.Handle("GET /api/private/stats/admin-major", jwtMiddleware(http.HandlerFunc(privateH.GetAdminMajorStats)))
	mux.Handle("GET /api/private/stats/member-region", jwtMiddleware(http.HandlerFunc(privateH.GetMemberRegionStats)))

	// Wrap with CORS
	handler := middleware.CORS(mux)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("✓ Server running on http://localhost:%s", port)
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatalf("Server error: %v", err)
	}
}

func resolveUploadsRootDir() string {
	if _, err := os.Stat(filepath.Join("frontend", "public", "uploads")); err == nil {
		return filepath.Join("frontend", "public", "uploads")
	}
	if _, err := os.Stat(filepath.Join("..", "frontend", "public", "uploads")); err == nil {
		return filepath.Join("..", "frontend", "public", "uploads")
	}
	return "uploads"
}
