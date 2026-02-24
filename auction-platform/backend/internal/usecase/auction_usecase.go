package usecase

import (
	"context"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
)

type AuctionUsecase struct {
	auctionRepo         AuctionRepository
	userRepo            UserRepository
	influencerRepo      InfluencerRepository
	defaultCountdownSec int64
}

func NewAuctionUsecase(auctionRepo AuctionRepository, userRepo UserRepository, influencerRepo InfluencerRepository, defaultCountdownSec int64) *AuctionUsecase {
	return &AuctionUsecase{
		auctionRepo:         auctionRepo,
		userRepo:            userRepo,
		influencerRepo:      influencerRepo,
		defaultCountdownSec: normalizeCountdown(defaultCountdownSec),
	}
}

func (u *AuctionUsecase) Create(ctx context.Context, input CreateAuctionInput) (*domain.Auction, error) {
	influencerUser, err := u.userRepo.GetByID(ctx, input.InfluencerUserID)
	if err != nil {
		return nil, err
	}
	if influencerUser.Role != domain.RoleInfluencer {
		return nil, ErrForbidden
	}
	if !influencerUser.IsApproved {
		return nil, ErrInfluencerNotApproved
	}

	influencer, err := u.influencerRepo.GetByUserID(ctx, input.InfluencerUserID)
	if err != nil {
		return nil, err
	}

	auction := &domain.Auction{
		InfluencerID: input.InfluencerUserID,
		Title:        input.Title,
		Description:  input.Description,
		ImageURLs:    input.ImageURLs,
		ProductValue: input.ProductValue,
		StartPrice:   input.StartPrice,
		CurrentPrice: input.StartPrice,
		CountdownSec: u.resolveCountdown(input.CountdownSec),
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

func (u *AuctionUsecase) List(ctx context.Context, limit, offset int, influencerID *uuid.UUID) ([]domain.Auction, error) {
	auctions, err := u.auctionRepo.List(ctx, limit, offset, influencerID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	for i := range auctions {
		if u.syncAuctionStatusByTime(&auctions[i], now) {
			_ = u.auctionRepo.Update(ctx, &auctions[i])
		}
	}
	return auctions, nil
}

func (u *AuctionUsecase) GetByID(ctx context.Context, auctionID uuid.UUID) (*domain.Auction, error) {
	auction, err := u.auctionRepo.GetByID(ctx, auctionID)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	if u.syncAuctionStatusByTime(auction, now) {
		_ = u.auctionRepo.Update(ctx, auction)
	}
	return auction, nil
}

func (u *AuctionUsecase) Start(ctx context.Context, auctionID, userID uuid.UUID, role domain.UserRole) (*domain.Auction, error) {
	auction, err := u.auctionRepo.GetByID(ctx, auctionID)
	if err != nil {
		return nil, err
	}
	if role != domain.RoleAdmin && userID != auction.InfluencerID {
		return nil, ErrForbidden
	}
	if role == domain.RoleInfluencer {
		influencerUser, err := u.userRepo.GetByID(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !influencerUser.IsApproved {
			return nil, ErrInfluencerNotApproved
		}
	}
	now := time.Now().UTC()
	auction.Status = domain.AuctionActive
	auction.ServerTimeUnix = now.Unix()
	if auction.StartTime == nil {
		auction.StartTime = &now
	}
	countdown := normalizeCountdown(auction.CountdownSec)
	auction.CountdownSec = countdown
	end := now.Add(time.Duration(countdown) * time.Second)
	auction.EndTime = &end
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
	if role == domain.RoleInfluencer {
		influencerUser, err := u.userRepo.GetByID(ctx, userID)
		if err != nil {
			return nil, err
		}
		if !influencerUser.IsApproved {
			return nil, ErrInfluencerNotApproved
		}
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

func (u *AuctionUsecase) resolveCountdown(raw *int64) int64 {
	if raw == nil {
		return u.defaultCountdownSec
	}
	return normalizeCountdown(*raw)
}

func normalizeCountdown(raw int64) int64 {
	if raw <= 0 {
		return 3600
	}
	return raw
}

func (u *AuctionUsecase) syncAuctionStatusByTime(auction *domain.Auction, now time.Time) bool {
	changed := false
	countdown := normalizeCountdown(auction.CountdownSec)
	if auction.CountdownSec != countdown {
		auction.CountdownSec = countdown
		changed = true
	}

	if auction.Status == domain.AuctionDraft && auction.StartTime != nil {
		start := auction.StartTime.UTC()
		if !now.Before(start) {
			auction.Status = domain.AuctionActive
			changed = true
			if auction.EndTime == nil {
				end := start.Add(time.Duration(countdown) * time.Second)
				auction.EndTime = &end
				changed = true
			}
		}
	}

	if auction.Status == domain.AuctionActive {
		if auction.EndTime == nil {
			base := now
			if auction.StartTime != nil {
				base = auction.StartTime.UTC()
			}
			end := base.Add(time.Duration(countdown) * time.Second)
			auction.EndTime = &end
			changed = true
		}
		if auction.EndTime != nil && !now.Before(*auction.EndTime) {
			auction.Status = domain.AuctionFinished
			changed = true
		}
	}

	if changed {
		auction.ServerTimeUnix = now.Unix()
	}

	return changed
}
