package handlers

import (
	"context"
	"go-crud/db"
	"go-crud/models"
	"log"
	"net/http"
	"os"
	"time"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/google/generative-ai-go/genai"
	"github.com/labstack/echo/v4"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"google.golang.org/api/option"
)

func getConversationCollection() *mongo.Collection {
	return db.Client.Database("testdb").Collection("conversations")
}

// CreateConversation creates a new conversation for the logged-in user.
func CreateConversation(c echo.Context) error {
	// Get the user ID from the context (set by the JWT middleware)
	userID := c.Get("userId").(primitive.ObjectID)

	var conv models.Conversation
	if err := c.Bind(&conv); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request body"})
	}

	// Assign the conversation to the logged-in user
	conv.UserID = userID
	conv.ID = primitive.NewObjectID()
	conv.UpdatedAt = time.Now()  // Generate a new ID for the conversation

	_, err := getConversationCollection().InsertOne(context.Background(), conv)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to create conversation"})
	}

	return c.JSON(http.StatusCreated, conv)
}

// GetConversations fetches all conversations for the logged-in user.
func GetConversationHeaders(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)

	// Projection: Select only the fields we need, EXCLUDING the large 'messages' array.
	projection := bson.M{"messages": 0}
	// Sort by the 'updatedAt' field in descending order (most recent first).
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

// DeleteConversation deletes a specific conversation owned by the logged-in user.
func DeleteConversation(c echo.Context) error {
	userID := c.Get("userId").(primitive.ObjectID)
	convID, err := primitive.ObjectIDFromHex(c.Param("id"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid conversation id"})
	}

	// Crucially, the query checks for BOTH the conversation ID and the user ID.
	// This prevents one user from deleting another user's conversation.
	result, err := getConversationCollection().DeleteOne(context.Background(), bson.M{"_id": convID, "userId": userID})
	if err != nil {
		return c.JSON(http.StatusInternalServerError, echo.Map{"error": "failed to delete conversation"})
	}

	if result.DeletedCount == 0 {
		return c.JSON(http.StatusNotFound, echo.Map{"error": "conversation not found or you do not have permission"})
	}

	return c.JSON(http.StatusOK, echo.Map{"message": "conversation deleted successfully"})
}
func HandleChatbot(c echo.Context) error {
	// Bind the incoming message from the request body
	var req struct {
		Message string `json:"message"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, echo.Map{"error": "invalid request"})
	}

	// --- Start Gemini API Logic ---

	// Get the API Key from your environment variables
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		log.Fatal("GEMINI_API_KEY environment variable not set.")
        return c.JSON(http.StatusInternalServerError, echo.Map{"error": "AI service is not configured"})
	}

	ctx := context.Background()
	// Create a new client with your API key
	client, err := genai.NewClient(ctx, option.WithAPIKey(apiKey))
	if err != nil {
		log.Printf("Error creating Gemini client: %v", err)
        return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to connect to AI service"})
	}
	defer client.Close()

	// Choose the Gemini model. 'gemini-1.5-flash' is fast and efficient.
	model := client.GenerativeModel("gemini-1.5-flash")

	// Send the user's message to the model
	resp, err := model.GenerateContent(ctx, genai.Text(req.Message))
	if err != nil {
		log.Printf("Error generating content: %v", err)
        return c.JSON(http.StatusInternalServerError, echo.Map{"error": "Failed to get response from AI"})
	}

	// --- End Gemini API Logic ---

    // Extract the text from the AI's response
    var aiReply string
    if len(resp.Candidates) > 0 && len(resp.Candidates[0].Content.Parts) > 0 {
        if txt, ok := resp.Candidates[0].Content.Parts[0].(genai.Text); ok {
            aiReply = string(txt)
        }
    }

    if aiReply == "" {
        aiReply = "Sorry, I couldn't generate a response."
    }

	// Return the REAL AI reply in the format the frontend expects
	return c.JSON(http.StatusOK, echo.Map{
		"reply": aiReply,
	})
}
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

	// Prepare the update payload using $set
	update := bson.M{
		"$set": bson.M{
			"heading":  updatedConv.Heading,
			"messages": updatedConv.Messages,
			 "updatedAt": time.Now(),
		},
	}

	// The filter ensures a user can ONLY update their own conversations. This is critical.
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