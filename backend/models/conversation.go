package models

import (
	"time"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Message struct {
	Text    string `bson:"text" json:"text"`
	IsUser  bool   `bson:"isUser" json:"isUser"`
	Loading bool   `bson:"loading,omitempty" json:"loading,omitempty"`
}

// Conversation defines the structure for a conversation document.
// It is now linked to a user by their ObjectID.
type Conversation struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id,omitempty"`
	// This is the crucial link to the User document.
	UserID   primitive.ObjectID `bson:"userId" json:"userId"`
	Heading  string             `bson:"heading" json:"heading"`
	Messages []Message          `bson:"messages" json:"messages"`
	UpdatedAt time.Time         `bson:"updatedAt" json:"updatedAt"`
}