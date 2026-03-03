package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strings"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	// Load .env
	if err := godotenv.Load("../cmd/.env"); err != nil {
		log.Println("No .env file found, reading from environment")
	}

	// Connect to database
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_NAME"),
	)

	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("Database ping failed: %v", err)
	}

	fmt.Println("✓ Connected to database")
	fmt.Println()

	reader := bufio.NewReader(os.Stdin)

	// Get email
	fmt.Print("Masukkan email user: ")
	email, _ := reader.ReadString('\n')
	email = strings.TrimSpace(email)

	if email == "" {
		log.Fatal("Email tidak boleh kosong!")
	}

	// Check if user exists
	var userID, fullName, status string
	err = db.QueryRow("SELECT id, full_name, status FROM users WHERE email = ?", email).
		Scan(&userID, &fullName, &status)
	
	if err == sql.ErrNoRows {
		log.Fatalf("❌ User dengan email '%s' tidak ditemukan!", email)
	} else if err != nil {
		log.Fatalf("Error: %v", err)
	}

	fmt.Println()
	fmt.Println("User ditemukan:")
	fmt.Printf("  ID: %s\n", userID)
	fmt.Printf("  Nama: %s\n", fullName)
	fmt.Printf("  Email: %s\n", email)
	fmt.Printf("  Status: %s\n", status)
	fmt.Println()

	// Get new password
	fmt.Print("Masukkan password baru: ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	if len(password) < 8 {
		log.Fatal("❌ Password minimal 8 karakter!")
	}

	// Confirm
	fmt.Print("Konfirmasi password baru: ")
	confirm, _ := reader.ReadString('\n')
	confirm = strings.TrimSpace(confirm)

	if password != confirm {
		log.Fatal("❌ Password tidak cocok!")
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Error hashing password: %v", err)
	}

	// Update database
	_, err = db.Exec("UPDATE users SET password = ? WHERE id = ?", string(hash), userID)
	if err != nil {
		log.Fatalf("Error updating password: %v", err)
	}

	// Delete all refresh tokens (force re-login)
	_, err = db.Exec("DELETE FROM refresh_tokens WHERE user_id = ?", userID)
	if err != nil {
		log.Printf("Warning: Failed to delete refresh tokens: %v", err)
	}

	fmt.Println()
	fmt.Println("✅ Password berhasil diubah!")
	fmt.Println("✅ Semua refresh token dihapus (user harus login ulang)")
	fmt.Println()
	fmt.Printf("User '%s' sekarang bisa login dengan password baru.\n", email)
}
