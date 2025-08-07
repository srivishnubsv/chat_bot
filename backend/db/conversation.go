package db

import (
	"go.mongodb.org/mongo-driver/mongo"
)

func ConversationCollection() *mongo.Collection {
	return Client.Database("adyaai").Collection("conversations")
}
