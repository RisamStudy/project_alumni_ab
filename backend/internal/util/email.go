package util

import (
	"fmt"
	"os"

	"github.com/resend/resend-go/v2"
)

type EmailConfig struct {
	APIKey  string
	From    string
	BaseURL string
}

func SendVerificationEmail(cfg EmailConfig, toEmail, toName, token string) error {
	link := fmt.Sprintf("%s/verify-email?token=%s", cfg.BaseURL, token)
	subject := "Verifikasi Email - Portal Alumni Al Bahjah"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10B981;">Assalamualaikum %s,</h2>
        <p>Terima kasih telah mendaftar di Portal Alumni Al Bahjah.</p>
        <p>Silakan klik tombol berikut untuk memverifikasi email Anda:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verifikasi Email</a>
        </div>
        <p style="color: #666; font-size: 14px;">Atau copy link berikut ke browser Anda:</p>
        <p style="color: #10B981; word-break: break-all;">%s</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">Link ini berlaku selama 24 jam.</p>
        <p style="color: #999; font-size: 12px;">Jika Anda tidak mendaftar, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">Wassalamualaikum,<br>Tim Portal Alumni Al Bahjah</p>
    </div>
</body>
</html>
`, toName, link, link)

	textBody := fmt.Sprintf(`
Assalamualaikum %s,

Terima kasih telah mendaftar di Portal Alumni Al Bahjah.
Silakan klik link berikut untuk memverifikasi email Anda:

%s

Link ini berlaku selama 24 jam.

Jika Anda tidak mendaftar, abaikan email ini.

Wassalamualaikum,
Tim Portal Alumni Al Bahjah
`, toName, link)

	return sendEmail(cfg, toEmail, subject, htmlBody, textBody)
}

func SendPasswordResetEmail(cfg EmailConfig, toEmail, toName, token string) error {
	link := fmt.Sprintf("%s/reset-password?token=%s", cfg.BaseURL, token)
	subject := "Reset Password - Portal Alumni Al Bahjah"
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #10B981;">Assalamualaikum %s,</h2>
        <p>Kami menerima permintaan reset password untuk akun Anda.</p>
        <p>Silakan klik tombol berikut untuk membuat password baru:</p>
        <div style="text-align: center; margin: 30px 0;">
            <a href="%s" style="background-color: #10B981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
        </div>
        <p style="color: #666; font-size: 14px;">Atau copy link berikut ke browser Anda:</p>
        <p style="color: #10B981; word-break: break-all;">%s</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">Link ini berlaku selama 1 jam.</p>
        <p style="color: #999; font-size: 12px;">Jika Anda tidak meminta reset password, abaikan email ini.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">Wassalamualaikum,<br>Tim Portal Alumni Al Bahjah</p>
    </div>
</body>
</html>
`, toName, link, link)

	textBody := fmt.Sprintf(`
Assalamualaikum %s,

Kami menerima permintaan reset password untuk akun Anda.
Silakan klik link berikut untuk membuat password baru:

%s

Link ini berlaku selama 1 jam.

Jika Anda tidak meminta reset password, abaikan email ini.

Wassalamualaikum,
Tim Portal Alumni Al Bahjah
`, toName, link)

	return sendEmail(cfg, toEmail, subject, htmlBody, textBody)
}

func sendEmail(cfg EmailConfig, to, subject, htmlBody, textBody string) error {
	client := resend.NewClient(cfg.APIKey)

	params := &resend.SendEmailRequest{
		From:    cfg.From,
		To:      []string{to},
		Subject: subject,
		Html:    htmlBody,
		Text:    textBody,
	}

	_, err := client.Emails.Send(params)
	return err
}

// GetEmailConfig returns email configuration from environment
func GetEmailConfig() EmailConfig {
	return EmailConfig{
		APIKey:  os.Getenv("RESEND_API_KEY"),
		From:    os.Getenv("EMAIL_FROM"),
		BaseURL: os.Getenv("FRONTEND_URL"),
	}
}
