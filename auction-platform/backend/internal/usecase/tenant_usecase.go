package usecase

import (
	"context"

	"github.com/example/auction-platform/backend/internal/domain"
)

type TenantUsecase struct {
	influencerRepo InfluencerRepository
}

func NewTenantUsecase(influencerRepo InfluencerRepository) *TenantUsecase {
	return &TenantUsecase{influencerRepo: influencerRepo}
}

func (u *TenantUsecase) GetBySubdomain(ctx context.Context, subdomain string) (*domain.Influencer, error) {
	return u.influencerRepo.GetApprovedBySubdomain(ctx, subdomain)
}

func (u *TenantUsecase) List(ctx context.Context, limit, offset int) ([]domain.Influencer, error) {
	return u.influencerRepo.ListApproved(ctx, limit, offset)
}
