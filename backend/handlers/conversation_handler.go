package handlers

import (
	"context"
	"go-crud/db"
	"go-crud/models"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/google/generative-ai-go/genai"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"google.golang.org/api/option"
)

// --- Type Definitions for API Requests ---
// Placing these at the top level ensures they are correctly recognized.
type ChatPart struct {
	Role string `json:"role"` // "user" or "model"
	Text string `json:"text"`
}

type ChatRequest struct {
	History []ChatPart `json:"history"`
}

// --- Helper Function ---
func getConversationCollection() *mongo.Collection {
	return db.Client.Database("testdb").Collection("conversations")
}


// --- Handlers ---

// CreateConversation creates a chat, gets the first AI reply, and saves it all.
func CreateConversation(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	var conv models.Conversation
	if err := c.Bind(&conv); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	if len(conv.Messages) == 0 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "cannot create a conversation with no messages"})
	}

	conv.UserID = userID
	conv.ID = primitive.NewObjectID()
	conv.UpdatedAt = time.Now()

	_, err := getConversationCollection().InsertOne(context.Background(), conv)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to create conversation"})
	}

	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("GEMINI_API_KEY environment variable not set.")
		return c.JSON(http.StatusCreated, conv)
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Printf("Error creating Gemini client: %v", err)
		return c.JSON(http.StatusCreated, conv)
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	cs := model.StartChat()
	
	firstPrompt := conv.Messages[0].Text
	resp, err := cs.SendMessage(ctx, genai.Text(firstPrompt))
	if err != nil {
		log.Printf("Error generating content: %v", err)
		return c.JSON(http.StatusCreated, conv)
	}

	var aiReplyText string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			aiReplyText = string(txt)
		}
	}
    if aiReplyText == "" {
        aiReplyText = "Sorry, I couldn't generate a response."
    }

	aiMessage := models.Message{ Text: aiReplyText, IsUser: false }
	conv.Messages = append(conv.Messages, aiMessage)
	conv.UpdatedAt = time.Now()

	filter := bson.M{"_id": conv.ID, "userId": userID}
	update := bson.M{"$set": bson.M{"messages": conv.Messages, "updatedAt": conv.UpdatedAt}}
	_, err = getConversationCollection().UpdateOne(context.Background(), filter, update)
	if err != nil {
		log.Printf("Failed to save AI's first reply: %v", err)
	}

	return c.JSON(http.StatusCreated, conv)
}

// GetConversationHeaders fetches ONLY the list of conversation headers.
func GetConversationHeaders(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	projection := bson.M{"messages": 0}
	opts := options.Find().SetProjection(projection).SetSort(bson.M{"updatedAt": -1})
	cur, err := getConversationCollection().Find(context.Background(), bson.M{"userId": userID}, opts)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to fetch conversations"})
	}
	var conversations []models.Conversation
	if err := cur.All(context.Background(), &conversations); err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to decode conversations"})
	}
	return c.JSON(http.StatusOK, conversations)
}

// GetConversationMessages fetches the full data for a SINGLE conversation.
func GetConversationMessages(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	convID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid conversation id"})
	}
	var conversation models.Conversation
	filter := bson.M{"_id": convID, "userId": userID}
	err = getConversationCollection().FindOne(context.Background(), filter).Decode(&conversation)
	if err != nil {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "conversation not found"})
	}
	return c.JSON(http.StatusOK, conversation)
}

// UpdateConversation updates an existing conversation.
func UpdateConversation(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	convID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid conversation id"})
	}
	var updatedConv models.Conversation
	if err := c.Bind(&updatedConv); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}
	update := bson.M{
		"$set": bson.M{
			"heading":   updatedConv.Heading,
			"messages":  updatedConv.Messages,
			"updatedAt": time.Now(),
		},
	}
	filter := bson.M{"_id": convID, "userId": userID}
	result, err := getConversationCollection().UpdateOne(context.Background(), filter, update)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to update conversation"})
	}
	if result.MatchedCount == 0 {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "conversation not found or you do not have permission"})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "conversation updated successfully"})
}

// DeleteConversation deletes a conversation.
func DeleteConversation(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	convID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid conversation id"})
	}
	result, err := getConversationCollection().DeleteOne(context.Background(), bson.M{"_id": convID, "userId": userID})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to delete conversation"})
	}
	if result.DeletedCount == 0 {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "conversation not found or you do not have permission"})
	}
	return c.JSON(http.StatusOK, echo.Map{"message": "conversation deleted successfully"})
}

// HandleChatbot processes follow-up messages in a conversation.


// HandleChatbot processes follow-up messages in a conversation.
func HandleChatbot(c echo.Context) error {
	var req ChatRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}
	if len(req.History) == 0 {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "empty history"})
	}
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Println("GEMINI_API_KEY environment variable not set.")
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "AI service is not configured"})
	}

	ctx := context.Background()
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Printf("Error creating Gemini client: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to connect to AI service"})
	}
	defer client.Close()

	model := client.GenerativeModel("gemini-1.5-flash")
	cs := model.StartChat()



	// 1. Convert the entire history from the frontend into the Gemini SDK's format.
	geminiHistory := make([]*genai.Content, 0, len(req.History))
	for _, part := range req.History {
		geminiHistory = append(geminiHistory, &genai.Content{
			Parts: []genai.Part{genai.Text(part.Text)},
			Role:  part.Role, // 'user' or 'model'
		})
	}
	
	// 2. Set the chat session's history. This overrides any previous history in this session.
	cs.History = geminiHistory

	// 3. Send an empty message. This prompts the model to respond based on the
	//    final part of the history we just provided (the user's latest message).
	resp, err := cs.SendMessage(ctx, genai.Text(""))
	if err != nil {
		log.Printf("Error generating content: %v", err)
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to get response from AI"})
	}

	// Extract reply 
	var aiReply string
	if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
		if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
			aiReply = string(txt)
		}
	}
	if aiReply == "" {
		aiReply = "Sorry, I couldn't generate a response."
	}
	return c.JSON(http.StatusOK, echo.Map{
		"reply": aiReply,
	})
}