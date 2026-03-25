package repository

import (
	"context"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type InfluencerRepository struct {
	db *gorm.DB
}

func NewInfluencerRepository(db *gorm.DB) *InfluencerRepository {
	return &InfluencerRepository{db: db}
}

func (r *InfluencerRepository) Create(ctx context.Context, influencer *domain.Influencer) error {
	return r.db.WithContext(ctx).Create(influencer).Error
}

func (r *InfluencerRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Influencer, error) {
	var influencer domain.Influencer
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&influencer).Error
	if err != nil {
		return nil, err
	}
	return &influencer, nil
}

func (r *InfluencerRepository) GetBySubdomain(ctx context.Context, subdomain string) (*domain.Influencer, error) {
	var influencer domain.Influencer
	err := r.db.WithContext(ctx).Where("subdomain = ?", subdomain).First(&influencer).Error
	if err != nil {
		return nil, err
	}
	return &influencer, nil
}

func (r *InfluencerRepository) GetApprovedBySubdomain(ctx context.Context, subdomain string) (*domain.Influencer, error) {
	var influencer domain.Influencer
	err := r.db.WithContext(ctx).
		Joins("JOIN users ON users.id = influencers.user_id").
		Where("influencers.subdomain = ?", subdomain).
		Where("users.role = ?", domain.RoleInfluencer).
		Where("users.is_approved = ?", true).
		First(&influencer).Error
	if err != nil {
		return nil, err
	}
	return &influencer, nil
}

func (r *InfluencerRepository) List(ctx context.Context, limit, offset int) ([]domain.Influencer, error) {
	var influencers []domain.Influencer
	err := r.db.WithContext(ctx).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&influencers).Error
	if err != nil {
		return nil, err
	}
	return influencers, nil
}

func (r *InfluencerRepository) ListApproved(ctx context.Context, limit, offset int) ([]domain.Influencer, error) {
	var influencers []domain.Influencer
	err := r.db.WithContext(ctx).
		Joins("JOIN users ON users.id = influencers.user_id").
		Where("users.role = ?", domain.RoleInfluencer).
		Where("users.is_approved = ?", true).
		Order("influencers.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&influencers).Error
	if err != nil {
		return nil, err
	}
	return influencers, nil
}
