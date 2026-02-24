package domain

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type UserRole string

const (
	RoleUser       UserRole = "user"
	RoleInfluencer UserRole = "influencer"
	RoleAdmin      UserRole = "admin"
)

type AuctionStatus string

const (
	AuctionDraft    AuctionStatus = "draft"
	AuctionActive   AuctionStatus = "active"
	AuctionFinished AuctionStatus = "finished"
)

type User struct {
	ID              uuid.UUID `gorm:"type:uuid;primaryKey"`
	Email           string    `gorm:"uniqueIndex;size:255;not null"`
	PasswordHash    string    `gorm:"size:255;not null"`
	Role            UserRole  `gorm:"type:varchar(32);not null;default:user"`
	IsApproved      bool      `gorm:"not null;default:true"`
	BidCredits      int64     `gorm:"not null;default:0"`
	BidCreditsValue int64     `gorm:"not null;default:0"`
	CreatedAt       time.Time
	UpdatedAt       time.Time
	Influencer      Influencer
}

func (u *User) BeforeCreate(_ *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}

type Influencer struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	UserID       uuid.UUID `gorm:"type:uuid;uniqueIndex;not null"`
	DisplayName  string    `gorm:"size:255;not null"`
	Subdomain    string    `gorm:"uniqueIndex;size:100;not null"`
	LogoURL      string    `gorm:"size:500"`
	PrimaryColor string    `gorm:"size:20;default:#0F766E"`
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

func (i *Influencer) BeforeCreate(_ *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

type Auction struct {
	ID                 uuid.UUID `gorm:"type:uuid;primaryKey"`
	InfluencerID       uuid.UUID `gorm:"type:uuid;index;not null"`
	Title              string    `gorm:"size:255;not null"`
	Description        string    `gorm:"type:text"`
	ImageURLs          []string  `gorm:"type:jsonb;serializer:json"`
	ProductValue       int64     `gorm:"not null;default:0"`
	InfluencerTransfer int64     `gorm:"not null;default:0"`
	StartPrice         int64     `gorm:"not null"`
	CurrentPrice       int64     `gorm:"not null"`
	CountdownSec       int64     `gorm:"not null;default:3600"`
	StartTime          *time.Time
	EndTime            *time.Time
	Status             AuctionStatus `gorm:"type:varchar(32);not null;default:draft"`
	ServerTimeUnix     int64         `gorm:"not null;default:0"`
	CreatedAt          time.Time
	UpdatedAt          time.Time
}

func (a *Auction) BeforeCreate(_ *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

type Bid struct {
	ID         uuid.UUID `gorm:"type:uuid;primaryKey"`
	AuctionID  uuid.UUID `gorm:"type:uuid;index;not null"`
	UserID     uuid.UUID `gorm:"type:uuid;index;not null"`
	Amount     int64     `gorm:"not null"`
	CreatedAt  time.Time `gorm:"index"`
	ReceivedAt time.Time `gorm:"not null"`
}

func (b *Bid) BeforeCreate(_ *gorm.DB) error {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return nil
}

type Transaction struct {
	ID           uuid.UUID `gorm:"type:uuid;primaryKey"`
	AuctionID    uuid.UUID `gorm:"type:uuid;index;not null"`
	BidID        uuid.UUID `gorm:"type:uuid;index;not null"`
	BidderUserID uuid.UUID `gorm:"type:uuid;index;not null"`
	Amount       int64     `gorm:"not null"`
	CreatedAt    time.Time
}

func (t *Transaction) BeforeCreate(_ *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}
