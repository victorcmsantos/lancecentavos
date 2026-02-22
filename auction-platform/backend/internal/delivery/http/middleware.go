package http

import (
	"net/http"
	"strings"

	"github.com/example/auction-platform/backend/internal/domain"
	"github.com/example/auction-platform/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AuthMiddleware struct {
	authUC *usecase.AuthUsecase
}

func NewAuthMiddleware(authUC *usecase.AuthUsecase) *AuthMiddleware {
	return &AuthMiddleware{authUC: authUC}
}

func (m *AuthMiddleware) RequireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing authorization header"})
			return
		}
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header"})
			return
		}

		userID, role, err := m.authUC.ParseToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}

		c.Set("userID", userID)
		c.Set("role", role)
		c.Next()
	}
}

func RequireRoles(roles ...domain.UserRole) gin.HandlerFunc {
	allowed := map[domain.UserRole]struct{}{}
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		roleValue, ok := c.Get("role")
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing auth context"})
			return
		}
		role := roleValue.(domain.UserRole)
		if _, exists := allowed[role]; !exists {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden"})
			return
		}
		c.Next()
	}
}

func UserIDFromContext(c *gin.Context) uuid.UUID {
	value, _ := c.Get("userID")
	if id, ok := value.(uuid.UUID); ok {
		return id
	}
	return uuid.Nil
}

func RoleFromContext(c *gin.Context) domain.UserRole {
	value, _ := c.Get("role")
	if role, ok := value.(domain.UserRole); ok {
		return role
	}
	return ""
}
