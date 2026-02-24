package http

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/example/auction-platform/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Handler struct {
	authUC    *usecase.AuthUsecase
	auctionUC *usecase.AuctionUsecase
	bidUC     *usecase.BidUsecase
	tenantUC  *usecase.TenantUsecase
}

func NewHandler(authUC *usecase.AuthUsecase, auctionUC *usecase.AuctionUsecase, bidUC *usecase.BidUsecase, tenantUC *usecase.TenantUsecase) *Handler {
	return &Handler{authUC: authUC, auctionUC: auctionUC, bidUC: bidUC, tenantUC: tenantUC}
}

type registerRequest struct {
	Email        string          `json:"email" binding:"required,email"`
	Password     string          `json:"password" binding:"required,min=8"`
	Role         domain.UserRole `json:"role"`
	DisplayName  string          `json:"display_name"`
	Subdomain    string          `json:"subdomain"`
	LogoURL      string          `json:"logo_url"`
	PrimaryColor string          `json:"primary_color"`
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if req.Role == domain.RoleInfluencer && (req.Subdomain == "" || req.DisplayName == "") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "display_name and subdomain are required for influencer role"})
		return
	}

	user, err := h.authUC.Register(c.Request.Context(), usecase.RegisterInput{
		Email:        req.Email,
		Password:     req.Password,
		Role:         req.Role,
		DisplayName:  req.DisplayName,
		Subdomain:    req.Subdomain,
		LogoURL:      req.LogoURL,
		PrimaryColor: req.PrimaryColor,
	})
	if err != nil {
		status := http.StatusInternalServerError
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") || strings.Contains(strings.ToLower(err.Error()), "unique") {
			status = http.StatusConflict
		}
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"role":              user.Role,
		"is_approved":       user.IsApproved,
		"bid_credits":       user.BidCredits,
		"bid_credits_value": user.BidCreditsValue,
	})
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	token, user, err := h.authUC.Login(c.Request.Context(), usecase.LoginInput{Email: req.Email, Password: req.Password})
	if err != nil {
		if errors.Is(err, usecase.ErrInvalidCredentials) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token, "user": gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"role":              user.Role,
		"is_approved":       user.IsApproved,
		"bid_credits":       user.BidCredits,
		"bid_credits_value": user.BidCreditsValue,
	}})
}

type createAuctionRequest struct {
	Title        string   `json:"title" binding:"required"`
	Description  string   `json:"description"`
	ImageURLs    []string `json:"image_urls"`
	ProductValue int64    `json:"product_value" binding:"required,gt=0"`
	StartPrice   int64    `json:"start_price" binding:"required,gt=0"`
	CountdownSec *int64   `json:"countdown_seconds"`
	StartTime    *string  `json:"start_time"`
	EndTime      *string  `json:"end_time"`
}

func (h *Handler) CreateAuction(c *gin.Context) {
	var req createAuctionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	parseTS := func(raw *string) (*time.Time, error) {
		if raw == nil || *raw == "" {
			return nil, nil
		}
		t, err := time.Parse(time.RFC3339, *raw)
		if err != nil {
			return nil, err
		}
		u := t.UTC()
		return &u, nil
	}
	startTime, err := parseTS(req.StartTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid start_time"})
		return
	}
	endTime, err := parseTS(req.EndTime)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid end_time"})
		return
	}

	auction, err := h.auctionUC.Create(c.Request.Context(), usecase.CreateAuctionInput{
		InfluencerUserID: UserIDFromContext(c),
		Title:            req.Title,
		Description:      req.Description,
		ImageURLs:        req.ImageURLs,
		ProductValue:     req.ProductValue,
		StartPrice:       req.StartPrice,
		CountdownSec:     req.CountdownSec,
		StartTime:        startTime,
		EndTime:          endTime,
	})
	if err != nil {
		if errors.Is(err, usecase.ErrForbidden) || errors.Is(err, usecase.ErrInfluencerNotApproved) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, auction)
}

func (h *Handler) ListAuctions(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	var influencerID *uuid.UUID
	if rawInfluencerID := strings.TrimSpace(c.Query("influencer_id")); rawInfluencerID != "" {
		parsedID, err := uuid.Parse(rawInfluencerID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid influencer_id"})
			return
		}
		influencerID = &parsedID
	}
	auctions, err := h.auctionUC.List(c.Request.Context(), limit, offset, influencerID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auctions)
}

func (h *Handler) ListTenants(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	tenants, err := h.tenantUC.List(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tenants)
}

func (h *Handler) ListUsers(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	users, err := h.authUC.ListUsers(c.Request.Context(), limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	type userResponse struct {
		ID              uuid.UUID       `json:"id"`
		Email           string          `json:"email"`
		Role            domain.UserRole `json:"role"`
		IsApproved      bool            `json:"is_approved"`
		BidCredits      int64           `json:"bid_credits"`
		BidCreditsValue int64           `json:"bid_credits_value"`
		CreatedAt       time.Time       `json:"created_at"`
	}
	response := make([]userResponse, 0, len(users))
	for _, u := range users {
		response = append(response, userResponse{
			ID:              u.ID,
			Email:           u.Email,
			Role:            u.Role,
			IsApproved:      u.IsApproved,
			BidCredits:      u.BidCredits,
			BidCreditsValue: u.BidCreditsValue,
			CreatedAt:       u.CreatedAt,
		})
	}

	c.JSON(http.StatusOK, response)
}

func (h *Handler) GetMe(c *gin.Context) {
	user, err := h.authUC.GetProfile(c.Request.Context(), UserIDFromContext(c))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"role":              user.Role,
		"is_approved":       user.IsApproved,
		"bid_credits":       user.BidCredits,
		"bid_credits_value": user.BidCreditsValue,
		"created_at":        user.CreatedAt,
	})
}

type purchaseBidPackageRequest struct {
	PackageID string `json:"package_id" binding:"required"`
}

func (h *Handler) PurchaseBidPackage(c *gin.Context) {
	if RoleFromContext(c) != domain.RoleUser {
		c.JSON(http.StatusForbidden, gin.H{"error": "only users can purchase bid packages"})
		return
	}

	var req purchaseBidPackageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.authUC.PurchaseBidPackage(c.Request.Context(), UserIDFromContext(c), strings.ToLower(strings.TrimSpace(req.PackageID)))
	if err != nil {
		if errors.Is(err, usecase.ErrInvalidBidPackage) {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"role":              user.Role,
		"is_approved":       user.IsApproved,
		"bid_credits":       user.BidCredits,
		"bid_credits_value": user.BidCreditsValue,
	})
}

func (h *Handler) ApproveInfluencer(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	user, err := h.authUC.SetInfluencerApproval(c.Request.Context(), userID, true)
	if err != nil {
		if errors.Is(err, usecase.ErrForbidden) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user is not an influencer"})
			return
		}
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"role":        user.Role,
		"is_approved": user.IsApproved,
	})
}

type updateInfluencerApprovalRequest struct {
	IsApproved *bool `json:"is_approved" binding:"required"`
}

func (h *Handler) UpdateInfluencerApproval(c *gin.Context) {
	userID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid user id"})
		return
	}

	var req updateInfluencerApprovalRequest
	if err := c.ShouldBindJSON(&req); err != nil || req.IsApproved == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "is_approved is required"})
		return
	}

	user, err := h.authUC.SetInfluencerApproval(c.Request.Context(), userID, *req.IsApproved)
	if err != nil {
		if errors.Is(err, usecase.ErrForbidden) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "user is not an influencer"})
			return
		}
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"id":          user.ID,
		"email":       user.Email,
		"role":        user.Role,
		"is_approved": user.IsApproved,
	})
}

func (h *Handler) GetAuctionByID(c *gin.Context) {
	auctionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
		return
	}
	auction, err := h.auctionUC.GetByID(c.Request.Context(), auctionID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "auction not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auction)
}

func (h *Handler) StartAuction(c *gin.Context) {
	auctionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
		return
	}
	auction, err := h.auctionUC.Start(c.Request.Context(), auctionID, UserIDFromContext(c), RoleFromContext(c))
	if err != nil {
		if errors.Is(err, usecase.ErrForbidden) || errors.Is(err, usecase.ErrInfluencerNotApproved) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auction)
}

func (h *Handler) FinishAuction(c *gin.Context) {
	auctionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
		return
	}
	auction, err := h.auctionUC.Finish(c.Request.Context(), auctionID, UserIDFromContext(c), RoleFromContext(c))
	if err != nil {
		if errors.Is(err, usecase.ErrForbidden) || errors.Is(err, usecase.ErrInfluencerNotApproved) {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, auction)
}

type placeBidRequest struct {
	Amount          int64 `json:"amount"`
	ClientTimestamp int64 `json:"client_timestamp"`
}

func (h *Handler) PlaceBid(c *gin.Context) {
	auctionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
		return
	}
	var req placeBidRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bid, err := h.bidUC.PlaceBid(c.Request.Context(), usecase.PlaceBidInput{
		AuctionID:        auctionID,
		UserID:           UserIDFromContext(c),
		Amount:           req.Amount,
		ClientTimestamp:  req.ClientTimestamp,
		ServerReceivedAt: time.Now().UTC(),
	})
	if err != nil {
		switch {
		case errors.Is(err, usecase.ErrAuctionNotActive), errors.Is(err, usecase.ErrBidTooLow), errors.Is(err, usecase.ErrInvalidTimestamp), errors.Is(err, usecase.ErrInsufficientBidCredits):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, usecase.ErrForbidden), errors.Is(err, usecase.ErrOwnAuctionBidForbidden):
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		case errors.Is(err, usecase.ErrRateLimited):
			c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, bid)
}

func (h *Handler) ListBids(c *gin.Context) {
	auctionID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
		return
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	bids, err := h.bidUC.ListByAuctionID(c.Request.Context(), auctionID, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, bids)
}

func (h *Handler) GetTenantBySubdomain(c *gin.Context) {
	subdomain := strings.ToLower(strings.TrimSpace(c.Param("subdomain")))
	if subdomain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "missing subdomain"})
		return
	}
	tenant, err := h.tenantUC.GetBySubdomain(c.Request.Context(), subdomain)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "tenant not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, tenant)
}
