package usecase

import "errors"

var (
	ErrInvalidCredentials     = errors.New("invalid credentials")
	ErrUnauthorized           = errors.New("unauthorized")
	ErrForbidden              = errors.New("forbidden")
	ErrAuctionNotActive       = errors.New("auction is not active")
	ErrBidTooLow              = errors.New("bid must be greater than current price")
	ErrInvalidTimestamp       = errors.New("client timestamp drift too large")
	ErrRateLimited            = errors.New("rate limit exceeded")
	ErrInsufficientBidCredits = errors.New("insufficient bid credits")
	ErrInvalidBidPackage      = errors.New("invalid bid package")
	ErrOwnAuctionBidForbidden = errors.New("influencer cannot bid on own auction")
	ErrInfluencerNotApproved  = errors.New("influencer pending admin approval")
)
