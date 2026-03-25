package bootstrap

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type bootstrapAdminCredential struct {
	Email       string    `json:"email"`
	Password    string    `json:"password"`
	GeneratedAt time.Time `json:"generated_at"`
	Action      string    `json:"action"`
}

func EnsureAdmin(db *gorm.DB, adminEmail string, adminPassword string, forceReset bool, outputPath string) {
	email := strings.ToLower(strings.TrimSpace(adminEmail))
	if email == "" {
		email = "admin@local"
	}

	var count int64
	if err := db.Model(&domain.User{}).Where("role = ?", domain.RoleAdmin).Count(&count).Error; err != nil {
		log.Printf("bootstrap admin: failed to check existing admins: %v", err)
		return
	}
	if count > 0 {
		if !forceReset {
			return
		}
		resetExistingAdminPassword(db, email, adminPassword, outputPath)
		return
	}

	password := strings.TrimSpace(adminPassword)
	generated := false
	if password == "" {
		pw, err := randomPassword()
		if err != nil {
			log.Printf("bootstrap admin: failed to generate password: %v", err)
			return
		}
		password = pw
		generated = true
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bootstrap admin: failed to hash password: %v", err)
		return
	}

	user := &domain.User{
		Email:        email,
		PasswordHash: string(hash),
		Role:         domain.RoleAdmin,
		IsApproved:   true,
	}

	if err := db.Create(user).Error; err != nil {
		// If another instance raced and created an admin, we can ignore.
		if errors.Is(err, gorm.ErrDuplicatedKey) {
			return
		}
		log.Printf("bootstrap admin: failed to create admin user: %v", err)
		return
	}

	if generated {
		persistBootstrapAdminCredential(outputPath, email, password, "created")
		log.Printf("BOOTSTRAP ADMIN CREATED - email=%s", email)
		log.Printf("Generated password saved to %s", resolveCredentialOutputPath(outputPath))
		log.Printf("(set BOOTSTRAP_ADMIN_PASSWORD to control the password and avoid storing it)")
	} else {
		clearBootstrapAdminCredential(outputPath)
		log.Printf("bootstrap admin: created admin user email=%s (password provided via env)", email)
	}
}

func resetExistingAdminPassword(db *gorm.DB, desiredEmail string, adminPassword string, outputPath string) {
	// Find admin by desired email first; fallback to any admin.
	var admin domain.User
	err := db.Where("role = ? AND email = ?", domain.RoleAdmin, desiredEmail).First(&admin).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			err = db.Where("role = ?", domain.RoleAdmin).First(&admin).Error
		}
	}
	if err != nil {
		log.Printf("bootstrap admin: force reset requested but failed to find admin: %v", err)
		return
	}

	password := strings.TrimSpace(adminPassword)
	generated := false
	if password == "" {
		pw, err := randomPassword()
		if err != nil {
			log.Printf("bootstrap admin: failed to generate password for force reset: %v", err)
			return
		}
		password = pw
		generated = true
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Printf("bootstrap admin: failed to hash password for force reset: %v", err)
		return
	}

	admin.PasswordHash = string(hash)
	admin.IsApproved = true
	if err := db.Save(&admin).Error; err != nil {
		log.Printf("bootstrap admin: failed to update admin password: %v", err)
		return
	}

	if generated {
		persistBootstrapAdminCredential(outputPath, admin.Email, password, "reset")
		log.Printf("BOOTSTRAP ADMIN PASSWORD RESET - email=%s", admin.Email)
		log.Printf("Generated password saved to %s", resolveCredentialOutputPath(outputPath))
		log.Printf("(disable BOOTSTRAP_ADMIN_FORCE_RESET after this run to avoid rotating every restart)")
		return
	}

	clearBootstrapAdminCredential(outputPath)
	log.Printf("bootstrap admin: password reset for email=%s (password provided via env)", admin.Email)
}

func persistBootstrapAdminCredential(outputPath string, email string, password string, action string) {
	path := resolveCredentialOutputPath(outputPath)
	if err := os.MkdirAll(filepath.Dir(path), 0o700); err != nil {
		log.Printf("bootstrap admin: failed to create credential directory: %v", err)
		return
	}

	payload := bootstrapAdminCredential{
		Email:       email,
		Password:    password,
		GeneratedAt: time.Now().UTC(),
		Action:      action,
	}

	data, err := json.MarshalIndent(payload, "", "  ")
	if err != nil {
		log.Printf("bootstrap admin: failed to encode generated credential: %v", err)
		return
	}

	data = append(data, '\n')
	if err := os.WriteFile(path, data, 0o600); err != nil {
		log.Printf("bootstrap admin: failed to write generated credential file: %v", err)
	}
}

func clearBootstrapAdminCredential(outputPath string) {
	path := resolveCredentialOutputPath(outputPath)
	if err := os.Remove(path); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Printf("bootstrap admin: failed to clear generated credential file: %v", err)
	}
}

func resolveCredentialOutputPath(outputPath string) string {
	trimmed := strings.TrimSpace(outputPath)
	if trimmed == "" {
		return "/tmp/bootstrap-admin.json"
	}
	return trimmed
}

func randomPassword() (string, error) {
	// 18 bytes => 24 chars base64 (no padding)
	b := make([]byte, 18)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	pw := base64.RawURLEncoding.EncodeToString(b)
	if strings.TrimSpace(pw) == "" {
		return "", errors.New("empty password")
	}
	return pw, nil
}
