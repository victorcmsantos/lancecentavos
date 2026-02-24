package usecase

import (
	"context"
	"strings"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/example/auction-platform/backend/internal/infra/auth"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type bidPackage struct {
	Credits    int64
	PriceCents int64
}

var bidPackages = map[string]bidPackage{
	"starter":  {Credits: 20, PriceCents: 2000},
	"standard": {Credits: 60, PriceCents: 4500},
	"pro":      {Credits: 120, PriceCents: 6000},
}

type AuthUsecase struct {
	db             *gorm.DB
	userRepo       UserRepository
	influencerRepo InfluencerRepository
	jwtSecret      string
	jwtIssuer      string
	jwtExpiryMin   int
}

func NewAuthUsecase(db *gorm.DB, userRepo UserRepository, influencerRepo InfluencerRepository, jwtSecret, jwtIssuer string, jwtExpiryMin int) *AuthUsecase {
	return &AuthUsecase{
		db:             db,
		userRepo:       userRepo,
		influencerRepo: influencerRepo,
		jwtSecret:      jwtSecret,
		jwtIssuer:      jwtIssuer,
		jwtExpiryMin:   jwtExpiryMin,
	}
}

func (u *AuthUsecase) Register(ctx context.Context, input RegisterInput) (*domain.User, error) {
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	role := input.Role
	if role == "" {
		role = domain.RoleUser
	}

	user := &domain.User{
		Email:        strings.ToLower(strings.TrimSpace(input.Email)),
		PasswordHash: string(passwordHash),
		Role:         role,
		IsApproved:   role != domain.RoleInfluencer,
	}

	if err := u.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	if role == domain.RoleInfluencer {
		influencer := &domain.Influencer{
			UserID:       user.ID,
			DisplayName:  input.DisplayName,
			Subdomain:    strings.ToLower(strings.TrimSpace(input.Subdomain)),
			LogoURL:      input.LogoURL,
			PrimaryColor: input.PrimaryColor,
		}
		if influencer.PrimaryColor == "" {
			influencer.PrimaryColor = "#0F766E"
		}
		if err := u.influencerRepo.Create(ctx, influencer); err != nil {
			return nil, err
		}
	}

	return user, nil
}

func (u *AuthUsecase) Login(ctx context.Context, input LoginInput) (string, *domain.User, error) {
	user, err := u.userRepo.GetByEmail(ctx, strings.ToLower(strings.TrimSpace(input.Email)))
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return "", nil, ErrInvalidCredentials
		}
		return "", nil, err
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return "", nil, ErrInvalidCredentials
	}

	token, err := auth.GenerateToken(u.jwtSecret, u.jwtIssuer, user.ID.String(), string(user.Role), u.jwtExpiryMin)
	if err != nil {
		return "", nil, err
	}

	return token, user, nil
}

func (u *AuthUsecase) ParseToken(raw string) (uuid.UUID, domain.UserRole, error) {
	claims, err := auth.ParseToken(u.jwtSecret, raw)
	if err != nil {
		return uuid.Nil, "", err
	}
	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		return uuid.Nil, "", err
	}
	return userID, domain.UserRole(claims.Role), nil
}

func (u *AuthUsecase) ListUsers(ctx context.Context, limit, offset int) ([]domain.User, error) {
	return u.userRepo.List(ctx, limit, offset)
}

func (u *AuthUsecase) GetProfile(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	return u.userRepo.GetByID(ctx, userID)
}

func (u *AuthUsecase) ApproveInfluencer(ctx context.Context, userID uuid.UUID) (*domain.User, error) {
	return u.SetInfluencerApproval(ctx, userID, true)
}

func (u *AuthUsecase) SetInfluencerApproval(ctx context.Context, userID uuid.UUID, isApproved bool) (*domain.User, error) {
	user, err := u.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user.Role != domain.RoleInfluencer {
		return nil, ErrForbidden
	}
	if user.IsApproved == isApproved {
		return user, nil
	}
	user.IsApproved = isApproved
	if err := u.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}
	return user, nil
}

func (u *AuthUsecase) PurchaseBidPackage(ctx context.Context, userID uuid.UUID, packageID string) (*domain.User, error) {
	pack, ok := bidPackages[packageID]
	if !ok {
		return nil, ErrInvalidBidPackage
	}

	var updated *domain.User
	err := u.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		user, err := u.userRepo.GetByIDForUpdate(ctx, tx, userID)
		if err != nil {
			return err
		}
		user.BidCredits += pack.Credits
		user.BidCreditsValue += pack.PriceCents
		if err := u.userRepo.UpdateInTx(ctx, tx, user); err != nil {
			return err
		}
		updated = user
		return nil
	})
	if err != nil {
		return nil, err
	}
	return updated, nil
}
