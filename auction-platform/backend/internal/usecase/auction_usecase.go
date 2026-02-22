package usecase

import (
	"context"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
)

type AuctionUsecase struct {
	auctionRepo    AuctionRepository
	influencerRepo InfluencerRepository
}

func NewAuctionUsecase(auctionRepo AuctionRepository, influencerRepo InfluencerRepository) *AuctionUsecase {
	return &AuctionUsecase{auctionRepo: auctionRepo, influencerRepo: influencerRepo}
}

func (u *AuctionUsecase) Create(ctx context.Context, input CreateAuctionInput) (*domain.Auction, error) {
	influencer, err := u.influencerRepo.GetByUserID(ctx, input.InfluencerUserID)
	if err != nil {
		return nil, err
	}

	auction := &domain.Auction{
		InfluencerID: input.InfluencerUserID,
		Title:        input.Title,
		Description:  input.Description,
		StartPrice:   input.StartPrice,
		CurrentPrice: input.StartPrice,
		StartTime:    input.StartTime,
		EndTime:      input.EndTime,
		Status:       domain.AuctionDraft,
	}
	auction.InfluencerID = influencer.UserID
	if err := u.auctionRepo.Create(ctx, auction); err != nil {
		return nil, err
	}
	return auction, nil
}

func (u *AuctionUsecase) List(ctx context.Context, limit, offset int) ([]domain.Auction, error) {
	return u.auctionRepo.List(ctx, limit, offset)
}

func (u *AuctionUsecase) GetByID(ctx context.Context, auctionID uuid.UUID) (*domain.Auction, error) {
	return u.auctionRepo.GetByID(ctx, auctionID)
}

func (u *AuctionUsecase) Start(ctx context.Context, auctionID, userID uuid.UUID, role domain.UserRole) (*domain.Auction, error) {
	auction, err := u.auctionRepo.GetByID(ctx, auctionID)
	if err != nil {
		return nil, err
	}
	if role != domain.RoleAdmin && userID != auction.InfluencerID {
		return nil, ErrForbidden
	}
	now := time.Now().UTC()
	auction.Status = domain.AuctionActive
	auction.ServerTimeUnix = now.Unix()
	if auction.StartTime == nil {
		auction.StartTime = &now
	}
	if err := u.auctionRepo.Update(ctx, auction); err != nil {
		return nil, err
	}
	return auction, nil
}

func (u *AuctionUsecase) Finish(ctx context.Context, auctionID, userID uuid.UUID, role domain.UserRole) (*domain.Auction, error) {
	auction, err := u.auctionRepo.GetByID(ctx, auctionID)
	if err != nil {
		return nil, err
	}
	if role != domain.RoleAdmin && userID != auction.InfluencerID {
		return nil, ErrForbidden
	}
	now := time.Now().UTC()
	auction.Status = domain.AuctionFinished
	auction.ServerTimeUnix = now.Unix()
	auction.EndTime = &now
	if err := u.auctionRepo.Update(ctx, auction); err != nil {
		return nil, err
	}
	return auction, nil
}
