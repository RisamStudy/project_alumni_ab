package middleware

import (
	"net/http"
	"os"
	"strings"
)

func CORS(next http.Handler) http.Handler {
	allowedOrigin := os.Getenv("FRONTEND_URL")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:3002"
	}
	// Build allowed origins list (http and https variants)
	allowedOrigins := map[string]bool{
		allowedOrigin: true,
	}
	// Add http variant if https, and vice versa
	if strings.HasPrefix(allowedOrigin, "https://") {
		allowedOrigins["http://"+strings.TrimPrefix(allowedOrigin, "https://")] = true
	} else if strings.HasPrefix(allowedOrigin, "http://") {
		allowedOrigins["https://"+strings.TrimPrefix(allowedOrigin, "http://")] = true
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Allow localhost with any port for development
		if strings.HasPrefix(origin, "http://localhost:") || strings.HasPrefix(origin, "https://localhost:") {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		}
		
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
