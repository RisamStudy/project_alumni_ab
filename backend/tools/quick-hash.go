package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: go run quick-hash.go <password>")
		fmt.Println()
		fmt.Println("Example:")
		fmt.Println("  go run quick-hash.go mypassword123")
		os.Exit(1)
	}

	password := os.Args[1]

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Password:", password)
	fmt.Println("Hash:", string(hash))
}
