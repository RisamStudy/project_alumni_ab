package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/resend/resend-go/v2"
)

func main() {
	// Load .env
	if err := godotenv.Load("cmd/.env"); err != nil {
		log.Println("No .env file found, trying to load from environment")
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	from := os.Getenv("EMAIL_FROM")

	fmt.Println("=== Testing Resend Email Configuration ===")
	fmt.Printf("API Key: %s\n", maskAPIKey(apiKey))
	fmt.Printf("From: %s\n\n", from)

	if apiKey == "" {
		log.Fatal(" RESEND_API_KEY not set in .env file")
	}

	// Prompt for recipient email
	var toEmail string
	fmt.Print("Enter recipient email address: ")
	fmt.Scanln(&toEmail)

	if toEmail == "" {
		log.Fatal("Email address is required")
	}

	fmt.Printf("\nSending test email to: %s\n", toEmail)

	// Create Resend client
	client := resend.NewClient(apiKey)

	// Compose email
	params := &resend.SendEmailRequest{
		From:    from,
		To:      []string{toEmail},
		Subject: "Test Email - Portal Alumni Al Bahjah",
		Html:    `<h1>Assalamualaikum!</h1><p>Ini adalah test email dari Portal Alumni Al Bahjah.</p><p>Jika Anda menerima email ini, berarti konfigurasi Resend sudah benar!</p><p><strong>Wassalamualaikum,</strong><br>Tim Portal Alumni Al Bahjah</p>`,
		Text:    "Assalamualaikum!\n\nIni adalah test email dari Portal Alumni Al Bahjah.\n\nJika Anda menerima email ini, berarti konfigurasi Resend sudah benar!\n\nWassalamualaikum,\nTim Portal Alumni Al Bahjah",
	}

	// Send email
	sent, err := client.Emails.Send(params)
	if err != nil {
		log.Fatalf("Failed to send email: %v\n", err)
	}

	fmt.Println("Email sent successfully!")
	fmt.Printf("Email ID: %s\n", sent.Id)
	fmt.Println("\nPlease check your inbox (and spam folder) for the test email.")
	fmt.Println("\n Tips:")
	fmt.Println("- If using onboarding@resend.dev, make sure the recipient email is added in Resend dashboard")
	fmt.Println("- Check Resend dashboard logs: https://resend.com/emails")
}

func maskAPIKey(key string) string {
	if len(key) <= 10 {
		return "****"
	}
	return key[:7] + "..." + key[len(key)-4:]
}
