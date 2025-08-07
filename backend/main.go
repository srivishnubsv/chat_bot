package main

import (
	"go-crud/db"
	"go-crud/handlers"
	middleware "go-crud/middlewares"
	"net/http"

	"github.com/labstack/echo/v4"
	echomw "github.com/labstack/echo/v4/middleware"
)

func main() {
	e := echo.New()

	// Middleware
	e.Use(echomw.Logger())
	e.Use(echomw.Recover())
	e.Use(echomw.CORSWithConfig(echomw.CORSConfig{
		AllowOrigins: []string{"http://localhost:5173"},
		AllowMethods: []string{http.MethodGet, http.MethodPost, http.MethodPut, http.MethodDelete},
		
        AllowHeaders: []string{echo.HeaderOrigin, echo.HeaderContentType, echo.HeaderAccept, echo.HeaderAuthorization},
	}))

	// Initialize DB connection
	db.ConnectMongo()

	// Public Routes (No authentication required)
	e.POST("/signup", handlers.Signup)
	e.POST("/login", handlers.Login)

	// API group with JWT Protection
	api := e.Group("/api")
	api.Use(middleware.JWTProtected())

	// Protected Routes (Requires valid JWT)
	api.POST("/conversations", handlers.CreateConversation)
	api.GET("/conversations", handlers.GetConversationHeaders)
	api.GET("/conversations/:id", handlers.GetConversationMessages)
	api.DELETE("/conversations/:id", handlers.DeleteConversation)
	api.PUT("/conversations/:id", handlers.UpdateConversation)
	chatbotGroup := e.Group("") // Root group
    chatbotGroup.Use(middleware.JWTProtected())
    chatbotGroup.POST("/chatbot", handlers.HandleChatbot)

	e.Logger.Fatal(e.Start(":8080"))
}