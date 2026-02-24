package usecase

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
	"gorm.io/gorm"
)

type BidUsecase struct {
	db          *gorm.DB
	userRepo    UserRepository
	auctionRepo AuctionRepository
	bidRepo     BidRepository
	redis       *goredis.Client
}

type BidUpdateMessage struct {
	AuctionID      string `json:"auction_id"`
	BidID          string `json:"bid_id"`
	UserID         string `json:"user_id"`
	Amount         int64  `json:"amount"`
	CreatedAt      string `json:"created_at"`
	EndTime        string `json:"end_time"`
	ServerTimeUnix int64  `json:"server_time_unix"`
}

func NewBidUsecase(db *gorm.DB, userRepo UserRepository, auctionRepo AuctionRepository, bidRepo BidRepository, redis *goredis.Client) *BidUsecase {
	return &BidUsecase{db: db, userRepo: userRepo, auctionRepo: auctionRepo, bidRepo: bidRepo, redis: redis}
}

func (u *BidUsecase) PlaceBid(ctx context.Context, input PlaceBidInput) (*domain.Bid, error) {
	if err := u.checkTimestamp(input.ClientTimestamp, input.ServerReceivedAt.Unix()); err != nil {
		return nil, err
	}
	if err := u.rateLimit(ctx, input.UserID); err != nil {
		return nil, err
	}

	var createdBid *domain.Bid
	updatedEndTime := ""
	updatedServerTimeUnix := int64(0)
	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		auction, err := u.auctionRepo.GetByIDForUpdate(ctx, tx, input.AuctionID)
		if err != nil {
			return err
		}

		if auction.Status == domain.AuctionDraft {
			if auction.StartTime == nil || input.ServerReceivedAt.UTC().Before(auction.StartTime.UTC()) {
				return ErrAuctionNotActive
			}
			countdown := auction.CountdownSec
			if countdown <= 0 {
				countdown = 3600
			}
			auction.Status = domain.AuctionActive
			if auction.EndTime == nil {
				end := auction.StartTime.UTC().Add(time.Duration(countdown) * time.Second)
				auction.EndTime = &end
			}
			auction.ServerTimeUnix = input.ServerReceivedAt.Unix()
			if auction.EndTime != nil && !input.ServerReceivedAt.UTC().Before(*auction.EndTime) {
				auction.Status = domain.AuctionFinished
			}
			if err := u.auctionRepo.UpdateInTx(ctx, tx, auction); err != nil {
				return err
			}
		}

		if auction.Status != domain.AuctionActive {
			return ErrAuctionNotActive
		}
		if auction.EndTime != nil && !input.ServerReceivedAt.UTC().Before(*auction.EndTime) {
			auction.Status = domain.AuctionFinished
			auction.ServerTimeUnix = input.ServerReceivedAt.Unix()
			if err := u.auctionRepo.UpdateInTx(ctx, tx, auction); err != nil {
				return err
			}
			return ErrAuctionNotActive
		}

		nextAmount := auction.CurrentPrice + 1

		user, err := u.userRepo.GetByIDForUpdate(ctx, tx, input.UserID)
		if err != nil {
			return err
		}
		if input.UserID == auction.InfluencerID {
			return ErrOwnAuctionBidForbidden
		}
		if user.Role != domain.RoleUser {
			return ErrForbidden
		}
		if user.BidCredits <= 0 || user.BidCreditsValue <= 0 {
			return ErrInsufficientBidCredits
		}

		transferValue := user.BidCreditsValue / user.BidCredits
		if transferValue <= 0 {
			transferValue = 1
		}

		user.BidCredits -= 1
		if transferValue > user.BidCreditsValue {
			transferValue = user.BidCreditsValue
		}
		user.BidCreditsValue -= transferValue
		if err := u.userRepo.UpdateInTx(ctx, tx, user); err != nil {
			return err
		}
		auction.InfluencerTransfer += transferValue

		bid := &domain.Bid{
			AuctionID:  input.AuctionID,
			UserID:     input.UserID,
			Amount:     nextAmount,
			ReceivedAt: input.ServerReceivedAt.UTC(),
		}
		if err := u.bidRepo.Create(ctx, tx, bid); err != nil {
			return err
		}

		auction.CurrentPrice = nextAmount
		auction.ServerTimeUnix = input.ServerReceivedAt.Unix()
		countdown := auction.CountdownSec
		if countdown <= 0 {
			countdown = 3600
		}
		nextEnd := input.ServerReceivedAt.UTC().Add(time.Duration(countdown) * time.Second)
		auction.EndTime = &nextEnd
		if err := u.auctionRepo.UpdateInTx(ctx, tx, auction); err != nil {
			return err
		}
		updatedEndTime = nextEnd.Format(time.RFC3339)
		updatedServerTimeUnix = auction.ServerTimeUnix

		transaction := &domain.Transaction{
			AuctionID:    auction.ID,
			BidID:        bid.ID,
			BidderUserID: input.UserID,
			Amount:       nextAmount,
		}
		if err := u.bidRepo.CreateTransaction(ctx, tx, transaction); err != nil {
			return err
		}

		createdBid = bid
		return nil
	}, sqlTxOptions())
	if err != nil {
		return nil, err
	}

	if err := u.redis.Set(ctx, u.highestBidKey(input.AuctionID), createdBid.Amount, 5*time.Minute).Err(); err != nil {
		return nil, err
	}

	msg := BidUpdateMessage{
		AuctionID:      input.AuctionID.String(),
		BidID:          createdBid.ID.String(),
		UserID:         input.UserID.String(),
		Amount:         createdBid.Amount,
		CreatedAt:      createdBid.CreatedAt.UTC().Format(time.RFC3339),
		EndTime:        updatedEndTime,
		ServerTimeUnix: updatedServerTimeUnix,
	}
	payload, _ := json.Marshal(msg)
	if err := u.redis.Publish(ctx, u.bidChannel(input.AuctionID), payload).Err(); err != nil {
		return nil, err
	}

	return createdBid, nil
}

func (u *BidUsecase) ListByAuctionID(ctx context.Context, auctionID uuid.UUID, limit int) ([]domain.Bid, error) {
	return u.bidRepo.ListByAuctionID(ctx, auctionID, limit)
}

func (u *BidUsecase) bidChannel(auctionID uuid.UUID) string {
	return fmt.Sprintf("auction:%s:bids", auctionID)
}

func (u *BidUsecase) highestBidKey(auctionID uuid.UUID) string {
	return fmt.Sprintf("auction:%s:highest_bid", auctionID)
}

func (u *BidUsecase) rateLimit(ctx context.Context, userID uuid.UUID) error {
	key := fmt.Sprintf("rate:bid:%s", userID.String())
	count, err := u.redis.Incr(ctx, key).Result()
	if err != nil {
		return err
	}
	if count == 1 {
		_ = u.redis.Expire(ctx, key, time.Second).Err()
	}
	if count > 5 {
		return ErrRateLimited
	}
	return nil
}

func (u *BidUsecase) checkTimestamp(clientTS, serverTS int64) error {
	if clientTS == 0 {
		return nil
	}
	drift := clientTS - serverTS
	if drift > 20 || drift < -20 {
		return ErrInvalidTimestamp
	}
	return nil
}

func sqlTxOptions() *sql.TxOptions {
	return &sql.TxOptions{
		Isolation: sql.LevelSerializable,
		ReadOnly:  false,
	}
}
