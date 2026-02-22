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

type AuthUsecase struct {
	userRepo       UserRepository
	influencerRepo InfluencerRepository
	jwtSecret      string
	jwtIssuer      string
	jwtExpiryMin   int
}

func NewAuthUsecase(userRepo UserRepository, influencerRepo InfluencerRepository, jwtSecret, jwtIssuer string, jwtExpiryMin int) *AuthUsecase {
	return &AuthUsecase{
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
