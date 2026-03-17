package handler

import (
	"io"
	"log"
	"net/http"

	"alumni-albahjah/internal/util"
)

type WebhookHandler struct{}

func NewWebhookHandler() *WebhookHandler {
	return &WebhookHandler{}
}

// POST /api/webhooks/resend
func (h *WebhookHandler) HandleResendWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		util.WriteError(w, http.StatusBadRequest, "Payload webhook tidak valid")
		return
	}

	log.Printf("Resend webhook received (%d bytes)", len(body))
	util.WriteSuccess(w, http.StatusOK, "Webhook diterima", nil)
}
