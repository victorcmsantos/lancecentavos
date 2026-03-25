package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                     string
	DatabaseURL              string
	RedisAddr                string
	RedisPassword            string
	RedisDB                  int
	JWTSecret                string
	JWTIssuer                string
	JWTExpiryMinutes         int
	CORSOrigin               string
	BidCountdownSec          int
	BootstrapAdminEmail      string
	BootstrapAdminPassword   string
	BootstrapAdminForceReset bool
	BootstrapAdminOutputPath string
}

func Load() Config {
	return Config{
		Port:                     getEnv("PORT", "8080"),
		DatabaseURL:              getEnv("DATABASE_URL", "postgres://postgres:postgres@postgres:5432/auction?sslmode=disable"),
		RedisAddr:                getEnv("REDIS_ADDR", "redis:6379"),
		RedisPassword:            getEnv("REDIS_PASSWORD", ""),
		RedisDB:                  getEnvInt("REDIS_DB", 0),
		JWTSecret:                getEnv("JWT_SECRET", "change-me-in-production"),
		JWTIssuer:                getEnv("JWT_ISSUER", "auction-platform"),
		JWTExpiryMinutes:         getEnvInt("JWT_EXPIRY_MINUTES", 60),
		CORSOrigin:               getEnv("CORS_ORIGIN", "http://localhost:13000"),
		BidCountdownSec:          getEnvInt("BID_COUNTDOWN_SECONDS", 3600),
		BootstrapAdminEmail:      getEnv("BOOTSTRAP_ADMIN_EMAIL", "admin@local"),
		BootstrapAdminPassword:   getEnv("BOOTSTRAP_ADMIN_PASSWORD", ""),
		BootstrapAdminForceReset: getEnvBool("BOOTSTRAP_ADMIN_FORCE_RESET", false),
		BootstrapAdminOutputPath: getEnv("BOOTSTRAP_ADMIN_OUTPUT_PATH", "/tmp/bootstrap-admin.json"),
	}
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if value, ok := os.LookupEnv(key); ok {
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func getEnvBool(key string, fallback bool) bool {
	if value, ok := os.LookupEnv(key); ok {
		parsed, err := strconv.ParseBool(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}
