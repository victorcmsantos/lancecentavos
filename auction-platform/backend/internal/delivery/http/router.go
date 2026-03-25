package http

import (
	"context"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/example/auction-platform/backend/internal/delivery/websocket"
	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/example/auction-platform/backend/internal/infra/config"
	"github.com/example/auction-platform/backend/internal/usecase"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	goredis "github.com/redis/go-redis/v9"
)

func NewRouter(
	cfg config.Config,
	authUC *usecase.AuthUsecase,
	auctionUC *usecase.AuctionUsecase,
	bidUC *usecase.BidUsecase,
	tenantUC *usecase.TenantUsecase,
	wsManager *websocket.Manager,
	redisClient *goredis.Client,
) *gin.Engine {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	allowedOrigin := strings.TrimSpace(cfg.CORSOrigin)
	r.Use(cors.New(cors.Config{
		AllowOriginFunc: func(origin string) bool {
			if origin == "" {
				return false
			}
			if allowedOrigin == "*" {
				return true
			}
			if allowedOrigin != "" && origin == allowedOrigin {
				return true
			}
			u, err := url.Parse(origin)
			if err != nil {
				return false
			}
			host := strings.ToLower(u.Hostname())
			if host == "localhost" {
				return true
			}
			if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
				return true
			}
			// Local multi-tenant testing (e.g. influencer1.localhost:13000).
			return strings.HasSuffix(host, ".localhost")
		},
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	handler := NewHandler(authUC, auctionUC, bidUC, tenantUC)
	auth := NewAuthMiddleware(authUC)

	r.GET("/healthz", func(c *gin.Context) {
		if err := redisClient.Ping(context.Background()).Err(); err != nil {
			c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "redis": "down"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	v1 := r.Group("/api/v1")
	{
		v1.POST("/auth/register", handler.Register)
		v1.POST("/auth/login", handler.Login)
		v1.GET("/auctions", handler.ListAuctions)
		v1.GET("/auctions/:id", handler.GetAuctionByID)
		v1.GET("/auctions/:id/bids", handler.ListBids)
		v1.GET("/tenants", handler.ListTenants)
		v1.GET("/tenants/:subdomain", handler.GetTenantBySubdomain)
	}

	authorized := v1.Group("/")
	authorized.Use(auth.RequireAuth())
	{
		authorized.GET("/users/me", handler.GetMe)
		authorized.GET("/admin/users", RequireRoles(domain.RoleAdmin), handler.ListUsers)
		authorized.POST("/admin/users/:id/approve", RequireRoles(domain.RoleAdmin), handler.ApproveInfluencer)
		authorized.PATCH("/admin/users/:id/approval", RequireRoles(domain.RoleAdmin), handler.UpdateInfluencerApproval)
		authorized.POST("/users/me/bid-packages", handler.PurchaseBidPackage)
		authorized.POST("/auctions", RequireRoles(domain.RoleInfluencer, domain.RoleAdmin), handler.CreateAuction)
		authorized.POST("/auctions/:id/start", RequireRoles(domain.RoleInfluencer, domain.RoleAdmin), handler.StartAuction)
		authorized.POST("/auctions/:id/finish", RequireRoles(domain.RoleInfluencer, domain.RoleAdmin), handler.FinishAuction)
		authorized.POST("/auctions/:id/bids", handler.PlaceBid)
	}

	r.GET("/ws/auctions/:id", func(c *gin.Context) {
		token := c.Query("token")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		userID, _, err := authUC.ParseToken(strings.TrimSpace(token))
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		auctionID, err := uuid.Parse(c.Param("id"))
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid auction id"})
			return
		}
		wsManager.ServeAuction(c, auctionID, userID, bidUC)
	})

	return r
}
