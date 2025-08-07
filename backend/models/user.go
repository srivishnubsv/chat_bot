package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// User defines the structure for a user document.
type User struct {
	ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	Name     string             `bson:"name" json:"name"`
	Email    string             `bson:"email" json:"email"`
	// The password field is only used for writing (signup) and is omitted from JSON responses.
	Password string             `bson:"password" json:"-"`
	Age      int                `bson:"age" json:"age"`
}