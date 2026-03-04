package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"

	"alumni-albahjah/internal/util"
)

type WebhookHandler struct{}

func NewWebhookHandler() *WebhookHandler {
	return &WebhookHandler{}
}

// ResendWebhookEvent represents the webhook payload from Resend
type ResendWebhookEvent struct {
	Type      string                 `json:"type"`
	CreatedAt string                 `json:"created_at"`
	Data      map[string]interface{} `json:"data"`
}

// POST /api/webhooks/resend
func (h *WebhookHandler) HandleResendWebhook(w http.ResponseWriter, r *http.Request) {
	// Read body
	body, err := io.ReadAll(r.Body)
	if err != nil {
		log.Printf("Error reading webhook body: %v", err)
		util.WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}
	defer r.Body.Close()

	// Verify webhook signature (optional but recommended)
	signature := r.Header.Get("svix-signature")
	webhookSecret := os.Getenv("RESEND_WEBHOOK_SECRET")
	
	if webhookSecret != "" && signature != "" {
		if !verifyWebhookSignature(body, signature, webhookSecret) {
			log.Println("Invalid webhook signature")
			util.WriteError(w, http.StatusUnauthorized, "Invalid signature")
			return
		}
	}

	// Parse webhook event
	var event ResendWebhookEvent
	if err := json.Unmarshal(body, &event); err != nil {
		log.Printf("Error parsing webhook: %v", err)
		util.WriteError(w, http.StatusBadRequest, "Invalid JSON")
		return
	}

	// Log the event
	log.Printf("📧 Resend Webhook Event: %s", event.Type)

	// Handle different event types
	switch event.Type {
	case "email.sent":
		h.handleEmailSent(event)
	case "email.delivered":
		h.handleEmailDelivered(event)
	case "email.delivery_delayed":
		h.handleEmailDelayed(event)
	case "email.complained":
		h.handleEmailComplained(event)
	case "email.bounced":
		h.handleEmailBounced(event)
	case "email.opened":
		h.handleEmailOpened(event)
	case "email.clicked":
		h.handleEmailClicked(event)
	default:
		log.Printf("Unknown event type: %s", event.Type)
	}

	// Return success response
	util.WriteSuccess(w, http.StatusOK, "Webhook received", map[string]interface{}{
		"event_type": event.Type,
		"received":   true,
	})
}

func (h *WebhookHandler) handleEmailSent(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	subject := getStringFromData(event.Data, "subject")
	
	log.Printf(" Email sent - ID: %s, To: %s, Subject: %s", emailID, to, subject)
	
	// TODO: Update database status jika perlu
	// Misalnya: update email_logs table dengan status "sent"
}

func (h *WebhookHandler) handleEmailDelivered(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	
	log.Printf("📬 Email delivered - ID: %s, To: %s", emailID, to)
	
	// TODO: Update database status
	// Misalnya: update email_logs table dengan status "delivered"
}

func (h *WebhookHandler) handleEmailDelayed(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	
	log.Printf("⏳ Email delayed - ID: %s, To: %s", emailID, to)
	
	// TODO: Log atau alert jika email tertunda
}

func (h *WebhookHandler) handleEmailComplained(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	
	log.Printf("⚠️  Email complained (marked as spam) - ID: %s, To: %s", emailID, to)
	
	// TODO: Tandai email ini di database
	// Pertimbangkan untuk unsubscribe user atau kurangi frekuensi email
}

func (h *WebhookHandler) handleEmailBounced(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	bounceType := getStringFromData(event.Data, "bounce_type")
	
	log.Printf("❌ Email bounced - ID: %s, To: %s, Type: %s", emailID, to, bounceType)
	
	// TODO: Update database
	// Jika hard bounce, tandai email sebagai invalid
	// Jika soft bounce, retry nanti
}

func (h *WebhookHandler) handleEmailOpened(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	
	log.Printf("👁️  Email opened - ID: %s, To: %s", emailID, to)
	
	// TODO: Track email open rate
	// Simpan analytics untuk monitoring engagement
}

func (h *WebhookHandler) handleEmailClicked(event ResendWebhookEvent) {
	emailID := getStringFromData(event.Data, "email_id")
	to := getStringFromData(event.Data, "to")
	link := getStringFromData(event.Data, "link")
	
	log.Printf("🖱️  Email link clicked - ID: %s, To: %s, Link: %s", emailID, to, link)
	
	// TODO: Track click rate
	// Berguna untuk monitoring engagement dan A/B testing
}

// Helper function to verify webhook signature
func verifyWebhookSignature(payload []byte, signature, secret string) bool {
	// Resend uses HMAC SHA256 for webhook signatures
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))
	
	return hmac.Equal([]byte(signature), []byte(expectedSignature))
}

// Helper function to safely get string from map
func getStringFromData(data map[string]interface{}, key string) string {
	if val, ok := data[key]; ok {
		if str, ok := val.(string); ok {
			return str
		}
	}
	return ""
}
