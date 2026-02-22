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
	auctionRepo AuctionRepository
	bidRepo     BidRepository
	redis       *goredis.Client
}

type BidUpdateMessage struct {
	AuctionID string `json:"auction_id"`
	BidID     string `json:"bid_id"`
	UserID    string `json:"user_id"`
	Amount    int64  `json:"amount"`
	CreatedAt string `json:"created_at"`
}

func NewBidUsecase(db *gorm.DB, auctionRepo AuctionRepository, bidRepo BidRepository, redis *goredis.Client) *BidUsecase {
	return &BidUsecase{db: db, auctionRepo: auctionRepo, bidRepo: bidRepo, redis: redis}
}

func (u *BidUsecase) PlaceBid(ctx context.Context, input PlaceBidInput) (*domain.Bid, error) {
	if err := u.checkTimestamp(input.ClientTimestamp, input.ServerReceivedAt.Unix()); err != nil {
		return nil, err
	}
	if err := u.rateLimit(ctx, input.UserID); err != nil {
		return nil, err
	}

	var createdBid *domain.Bid
	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		auction, err := u.auctionRepo.GetByIDForUpdate(ctx, tx, input.AuctionID)
		if err != nil {
			return err
		}

		if auction.Status != domain.AuctionActive {
			return ErrAuctionNotActive
		}

		if input.Amount <= auction.CurrentPrice {
			return ErrBidTooLow
		}

		bid := &domain.Bid{
			AuctionID:  input.AuctionID,
			UserID:     input.UserID,
			Amount:     input.Amount,
			ReceivedAt: input.ServerReceivedAt.UTC(),
		}
		if err := u.bidRepo.Create(ctx, tx, bid); err != nil {
			return err
		}

		auction.CurrentPrice = input.Amount
		auction.ServerTimeUnix = input.ServerReceivedAt.Unix()
		if err := u.auctionRepo.UpdateInTx(ctx, tx, auction); err != nil {
			return err
		}

		transaction := &domain.Transaction{
			AuctionID:    auction.ID,
			BidID:        bid.ID,
			BidderUserID: input.UserID,
			Amount:       input.Amount,
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

	if err := u.redis.Set(ctx, u.highestBidKey(input.AuctionID), input.Amount, 5*time.Minute).Err(); err != nil {
		return nil, err
	}

	msg := BidUpdateMessage{
		AuctionID: input.AuctionID.String(),
		BidID:     createdBid.ID.String(),
		UserID:    input.UserID.String(),
		Amount:    createdBid.Amount,
		CreatedAt: createdBid.CreatedAt.UTC().Format(time.RFC3339),
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
