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
	return u.influencerRepo.GetBySubdomain(ctx, subdomain)
}
