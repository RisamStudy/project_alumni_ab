package main

import (
	"bufio"
	"database/sql"
	"fmt"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
)

func main() {
	loadEnv()

	dbConn, err := openDB()
	if err != nil {
		log.Fatalf("Gagal koneksi database: %v", err)
	}
	defer dbConn.Close()

	reader := bufio.NewReader(os.Stdin)

	fmt.Println("=== Create Admin Account ===")
	email := ask(reader, "Masukkan email admin")
	if !isValidEmail(email) {
		log.Fatal("Email tidak valid")
	}

	password := ask(reader, "Masukkan password admin (minimal 8 karakter)")
	if len(password) < 8 {
		log.Fatal("Password minimal 8 karakter")
	}

	confirm := ask(reader, "Konfirmasi password admin")
	if password != confirm {
		log.Fatal("Konfirmasi password tidak cocok")
	}

	fullName := askWithDefault(reader, "Masukkan nama admin", "Admin Portal")
	birthYearText := askWithDefault(reader, "Masukkan tahun lahir", "1990")
	birthYear, err := strconv.Atoi(birthYearText)
	if err != nil {
		log.Fatal("Tahun lahir harus angka")
	}

	currentYear := time.Now().Year()
	if birthYear < 1940 || birthYear > currentYear {
		log.Fatalf("Tahun lahir harus antara 1940 dan %d", currentYear)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Fatalf("Gagal hash password: %v", err)
	}

	userID, created, err := upsertAdmin(dbConn, fullName, int16(birthYear), strings.ToLower(email), string(hash))
	if err != nil {
		log.Fatalf("Gagal membuat akun admin: %v", err)
	}

	if _, err := dbConn.Exec("DELETE FROM refresh_tokens WHERE user_id = ?", userID); err != nil {
		log.Printf("Warning: gagal hapus refresh token lama: %v", err)
	}

	if created {
		fmt.Println("Akun admin berhasil dibuat")
	} else {
		fmt.Println("Akun sudah ada, data diperbarui dan dijadikan admin")
	}
	fmt.Printf("Email: %s\n", email)
	fmt.Printf("User ID: %s\n", userID)
}

func loadEnv() {
	paths := []string{".env", "cmd/.env", "../cmd/.env"}
	for _, p := range paths {
		_ = godotenv.Load(p)
	}
}

func openDB() (*sql.DB, error) {
	dbHost := envOrDefault("DB_HOST", "localhost")
	dbPort := envOrDefault("DB_PORT", "3306")
	dbUser := envOrDefault("DB_USER", "root")
	dbName := envOrDefault("DB_NAME", "alumni_albahjah")
	dbPassword := os.Getenv("DB_PASSWORD")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser,
		dbPassword,
		dbHost,
		dbPort,
		dbName,
	)
	dbConn, err := sql.Open("mysql", dsn)
	if err != nil {
		return nil, err
	}
	if err := dbConn.Ping(); err != nil {
		return nil, err
	}
	return dbConn, nil
}

func envOrDefault(key, fallback string) string {
	val := strings.TrimSpace(os.Getenv(key))
	if val == "" {
		return fallback
	}
	return val
}

func upsertAdmin(dbConn *sql.DB, fullName string, birthYear int16, email, passwordHash string) (string, bool, error) {
	var userID string
	err := dbConn.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&userID)
	if err != nil && err != sql.ErrNoRows {
		return "", false, err
	}

	if err == sql.ErrNoRows {
		if _, err := dbConn.Exec(
			`INSERT INTO users (id, full_name, birth_year, email, password, status, role)
			 VALUES (UUID(), ?, ?, ?, ?, 'active', 'admin')`,
			fullName, birthYear, email, passwordHash,
		); err != nil {
			return "", false, err
		}

		if err := dbConn.QueryRow("SELECT id FROM users WHERE email = ?", email).Scan(&userID); err != nil {
			return "", false, err
		}
		return userID, true, nil
	}

	if _, err := dbConn.Exec(
		`UPDATE users
		 SET full_name = ?, birth_year = ?, password = ?, status = 'active', role = 'admin'
		 WHERE id = ?`,
		fullName, birthYear, passwordHash, userID,
	); err != nil {
		return "", false, err
	}
	return userID, false, nil
}

func ask(reader *bufio.Reader, label string) string {
	fmt.Printf("%s: ", label)
	val, _ := reader.ReadString('\n')
	return strings.TrimSpace(val)
}

func askWithDefault(reader *bufio.Reader, label, defaultValue string) string {
	fmt.Printf("%s [%s]: ", label, defaultValue)
	val, _ := reader.ReadString('\n')
	val = strings.TrimSpace(val)
	if val == "" {
		return defaultValue
	}
	return val
}

func isValidEmail(email string) bool {
	email = strings.TrimSpace(email)
	if email == "" || strings.Contains(email, " ") {
		return false
	}
	at := strings.Index(email, "@")
	dot := strings.LastIndex(email, ".")
	return at > 0 && dot > at+1 && dot < len(email)-1
}
