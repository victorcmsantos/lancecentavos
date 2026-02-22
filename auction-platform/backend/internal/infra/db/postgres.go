package db

import (
	"github.com/example/auction-platform/backend/internal/domain"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func Connect(databaseURL string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
}

func Migrate(database *gorm.DB) error {
	return database.AutoMigrate(
		&domain.User{},
		&domain.Influencer{},
		&domain.Auction{},
		&domain.Bid{},
		&domain.Transaction{},
	)
}
