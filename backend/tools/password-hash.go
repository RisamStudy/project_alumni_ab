package main

import (
	"bufio"
	"fmt"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("=== Password Hash Tool ===")
	fmt.Println()
	fmt.Println("Pilih mode:")
	fmt.Println("1. Hash password (untuk insert ke database)")
	fmt.Println("2. Verify password (cek apakah password cocok dengan hash)")
	fmt.Println()
	fmt.Print("Pilihan (1/2): ")

	choice, _ := reader.ReadString('\n')
	choice = strings.TrimSpace(choice)

	switch choice {
	case "1":
		hashPassword(reader)
	case "2":
		verifyPassword(reader)
	default:
		fmt.Println("Pilihan tidak valid!")
	}
}

func hashPassword(reader *bufio.Reader) {
	fmt.Println()
	fmt.Println("=== Hash Password ===")
	fmt.Print("Masukkan password: ")
	
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	if password == "" {
		fmt.Println("❌ Password tidak boleh kosong!")
		return
	}

	// Hash password dengan bcrypt (cost 10 - default)
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("❌ Error: %v\n", err)
		return
	}

	fmt.Println()
	fmt.Println("✅ Password berhasil di-hash!")
	fmt.Println()
	fmt.Println("Password asli:", password)
	fmt.Println("Hash:", string(hash))
	fmt.Println()
	fmt.Println("📋 Copy hash di atas untuk disimpan di database.")
	fmt.Println()
	fmt.Println("Contoh SQL:")
	fmt.Printf("UPDATE users SET password = '%s' WHERE email = 'user@example.com';\n", string(hash))
}

func verifyPassword(reader *bufio.Reader) {
	fmt.Println()
	fmt.Println("=== Verify Password ===")
	
	fmt.Print("Masukkan password (plain text): ")
	password, _ := reader.ReadString('\n')
	password = strings.TrimSpace(password)

	fmt.Print("Masukkan hash dari database: ")
	hash, _ := reader.ReadString('\n')
	hash = strings.TrimSpace(hash)

	if password == "" || hash == "" {
		fmt.Println("❌ Password dan hash tidak boleh kosong!")
		return
	}

	// Verify password
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	
	fmt.Println()
	if err == nil {
		fmt.Println("✅ Password COCOK!")
		fmt.Println("Password yang Anda masukkan benar.")
	} else {
		fmt.Println("❌ Password TIDAK COCOK!")
		fmt.Println("Password yang Anda masukkan salah.")
		fmt.Printf("Error: %v\n", err)
	}
}
