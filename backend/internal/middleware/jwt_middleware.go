package middleware

import (
	"context"
	"log"
	"net/http"
	"strings"

	"alumni-albahjah/internal/util"
)

type contextKey string

const UserContextKey contextKey = "user"

type UserContext struct {
	UserID string
	Email  string
	Role   string
}

func JWTAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				log.Printf("❌ JWT Auth failed: No authorization header for %s", r.URL.Path)
				util.WriteError(w, http.StatusUnauthorized, "Token tidak ditemukan")
				return
			}
			tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
			claims, err := util.ValidateToken(tokenStr, jwtSecret)
			if err != nil {
				log.Printf("❌ JWT Auth failed: Invalid token for %s - %v", r.URL.Path, err)
				util.WriteError(w, http.StatusUnauthorized, "Token tidak valid atau sudah kadaluarsa")
				return
			}
			log.Printf("✅ JWT Auth success: User %s (%s) accessing %s", claims.Email, claims.Role, r.URL.Path)
			ctx := context.WithValue(r.Context(), UserContextKey, &UserContext{
				UserID: claims.UserID,
				Email:  claims.Email,
				Role:   claims.Role,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func AdminOnly(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, ok := r.Context().Value(UserContextKey).(*UserContext)
		if !ok || user.Role != "admin" {
			util.WriteError(w, http.StatusForbidden, "Akses ditolak")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func GetUserFromContext(r *http.Request) *UserContext {
	user, _ := r.Context().Value(UserContextKey).(*UserContext)
	return user
}
