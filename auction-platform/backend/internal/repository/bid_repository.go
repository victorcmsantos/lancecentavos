package repository

import (
	"context"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BidRepository struct {
	db *gorm.DB
}

func NewBidRepository(db *gorm.DB) *BidRepository {
	return &BidRepository{db: db}
}

func (r *BidRepository) Create(ctx context.Context, tx *gorm.DB, bid *domain.Bid) error {
	return tx.WithContext(ctx).Create(bid).Error
}

func (r *BidRepository) ListByAuctionID(ctx context.Context, auctionID uuid.UUID, limit int) ([]domain.Bid, error) {
	var bids []domain.Bid
	err := r.db.WithContext(ctx).
		Where("auction_id = ?", auctionID).
		Order("created_at DESC").
		Limit(limit).
		Find(&bids).Error
	if err != nil {
		return nil, err
	}
	return bids, nil
}

func (r *BidRepository) CreateTransaction(ctx context.Context, tx *gorm.DB, t *domain.Transaction) error {
	return tx.WithContext(ctx).Create(t).Error
}
