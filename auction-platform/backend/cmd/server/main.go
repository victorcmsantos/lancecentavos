package main

import (
	"log"

	"github.com/example/auction-platform/backend/internal/delivery/http"
	"github.com/example/auction-platform/backend/internal/delivery/websocket"
	"github.com/example/auction-platform/backend/internal/infra/config"
	"github.com/example/auction-platform/backend/internal/infra/db"
	redisinfra "github.com/example/auction-platform/backend/internal/infra/redis"
	"github.com/example/auction-platform/backend/internal/repository"
	"github.com/example/auction-platform/backend/internal/usecase"
)

func main() {
	cfg := config.Load()

	database, err := db.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := db.Migrate(database); err != nil {
		log.Fatalf("database migration failed: %v", err)
	}

	rdb := redisinfra.Connect(cfg.RedisAddr, cfg.RedisPassword, cfg.RedisDB)

	userRepo := repository.NewUserRepository(database)
	auctionRepo := repository.NewAuctionRepository(database)
	bidRepo := repository.NewBidRepository(database)
	influencerRepo := repository.NewInfluencerRepository(database)

	wsManager := websocket.NewManager(rdb)

	authUC := usecase.NewAuthUsecase(userRepo, influencerRepo, cfg.JWTSecret, cfg.JWTIssuer, cfg.JWTExpiryMinutes)
	auctionUC := usecase.NewAuctionUsecase(auctionRepo, influencerRepo)
	bidUC := usecase.NewBidUsecase(database, auctionRepo, bidRepo, rdb)
	tenantUC := usecase.NewTenantUsecase(influencerRepo)

	r := http.NewRouter(
		cfg,
		authUC,
		auctionUC,
		bidUC,
		tenantUC,
		wsManager,
		rdb,
	)

	log.Printf("backend listening on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
