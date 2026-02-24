package repository

import (
	"context"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type AuctionRepository struct {
	db *gorm.DB
}

func NewAuctionRepository(db *gorm.DB) *AuctionRepository {
	return &AuctionRepository{db: db}
}

func (r *AuctionRepository) Create(ctx context.Context, auction *domain.Auction) error {
	return r.db.WithContext(ctx).Create(auction).Error
}

func (r *AuctionRepository) List(ctx context.Context, limit, offset int, influencerID *uuid.UUID) ([]domain.Auction, error) {
	var auctions []domain.Auction
	query := r.db.WithContext(ctx).Order("created_at DESC")
	if influencerID != nil {
		query = query.Where("influencer_id = ?", *influencerID)
	}
	err := query.
		Limit(limit).
		Offset(offset).
		Find(&auctions).Error
	if err != nil {
		return nil, err
	}
	return auctions, nil
}

func (r *AuctionRepository) GetByID(ctx context.Context, auctionID uuid.UUID) (*domain.Auction, error) {
	var auction domain.Auction
	err := r.db.WithContext(ctx).Where("id = ?", auctionID).First(&auction).Error
	if err != nil {
		return nil, err
	}
	return &auction, nil
}

func (r *AuctionRepository) Update(ctx context.Context, auction *domain.Auction) error {
	return r.db.WithContext(ctx).Save(auction).Error
}

func (r *AuctionRepository) GetByIDForUpdate(ctx context.Context, tx *gorm.DB, auctionID uuid.UUID) (*domain.Auction, error) {
	var auction domain.Auction
	err := tx.WithContext(ctx).
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Where("id = ?", auctionID).
		First(&auction).Error
	if err != nil {
		return nil, err
	}
	return &auction, nil
}

func (r *AuctionRepository) UpdateInTx(ctx context.Context, tx *gorm.DB, auction *domain.Auction) error {
	return tx.WithContext(ctx).Save(auction).Error
}
