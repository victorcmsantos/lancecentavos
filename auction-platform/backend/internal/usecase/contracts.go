package usecase

import (
	"context"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	GetByID(ctx context.Context, userID uuid.UUID) (*domain.User, error)
}

type InfluencerRepository interface {
	Create(ctx context.Context, influencer *domain.Influencer) error
	GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Influencer, error)
	GetBySubdomain(ctx context.Context, subdomain string) (*domain.Influencer, error)
}

type AuctionRepository interface {
	Create(ctx context.Context, auction *domain.Auction) error
	List(ctx context.Context, limit, offset int) ([]domain.Auction, error)
	GetByID(ctx context.Context, auctionID uuid.UUID) (*domain.Auction, error)
	Update(ctx context.Context, auction *domain.Auction) error
	GetByIDForUpdate(ctx context.Context, tx *gorm.DB, auctionID uuid.UUID) (*domain.Auction, error)
	UpdateInTx(ctx context.Context, tx *gorm.DB, auction *domain.Auction) error
}

type BidRepository interface {
	Create(ctx context.Context, tx *gorm.DB, bid *domain.Bid) error
	ListByAuctionID(ctx context.Context, auctionID uuid.UUID, limit int) ([]domain.Bid, error)
	CreateTransaction(ctx context.Context, tx *gorm.DB, t *domain.Transaction) error
}

type RegisterInput struct {
	Email        string
	Password     string
	Role         domain.UserRole
	DisplayName  string
	Subdomain    string
	LogoURL      string
	PrimaryColor string
}

type LoginInput struct {
	Email    string
	Password string
}

type CreateAuctionInput struct {
	InfluencerUserID uuid.UUID
	Title            string
	Description      string
	StartPrice       int64
	StartTime        *time.Time
	EndTime          *time.Time
}

type PlaceBidInput struct {
	AuctionID        uuid.UUID
	UserID           uuid.UUID
	Amount           int64
	ClientTimestamp  int64
	ServerReceivedAt time.Time
}
