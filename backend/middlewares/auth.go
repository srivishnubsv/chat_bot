package middleware

import (
	"context"
	"net/http"
	"strings"

	"go-crud/db"

	"github.com/golang-jwt/jwt/v4"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// NOTE: Move this to a secure configuration/environment variable in a real app!
var jwtSecret = []byte("your_very_secret_key_should_be_long_and_random")

// JWTProtected is a middleware that validates the JWT token.
func JWTProtected() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			authHeader := c.Request().Header.Get("Authorization")
			if authHeader == "" {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "missing authorization header"})
			}

			// The header should be in the format "Bearer <token>"
			parts := strings.Split(authHeader, " ")
			if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "invalid authorization header format"})
			}

			tokenString := parts[1]

			claims := &jwt.RegisteredClaims{}
			token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
				return jwtSecret, nil
			})

			if err != nil || !token.Valid {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "invalid or expired token"})
			}

			// Token is valid, get user ID from claims.Subject
			userID, err := primitive.ObjectIDFromHex(claims.Subject)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "invalid user ID in token"})
			}

			// Optional: Check if user still exists in the database
			collection := db.Client.Database("testdb").Collection("users")
			count, err := collection.CountDocuments(context.Background(), bson.M{"_id": userID})
			if err != nil || count == 0 {
				return c.JSON(http.StatusUnauthorized, echo.Map{"error": "user not found"})
			}

			// Store the user ID in the context for the next handler to use
			c.Set("userId", userID)

			return next(c)
		}
	}
}