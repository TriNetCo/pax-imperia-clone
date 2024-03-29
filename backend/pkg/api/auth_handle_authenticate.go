package api

import (
	"fmt"

	. "github.com/trinetco/pax-imperia-clone/pkg/models"
)

func handleAuthenticate(conn *WebSocketConnection, client *ClientData, message Message) error {
	keys := []string{"displayName", "email", "token"}
	values, ok := extractFromPayload(message.Payload, keys...)
	if !ok {
		return fmt.Errorf("failed to extract values from payload")
	}

	authStatus := simpleValidateToken(values["token"])

	client.DisplayName = values["displayName"]
	client.Email = values["email"]
	client.Token = values["token"]
	client.AuthStatus = authStatus

	var response = Message{
		Type: "AUTHENTICATE_RESPONSE",
		Payload: map[string]interface{}{
			"authStatus": authStatus,
		},
	}

	(*conn).WriteJSON(response)

	if authStatus == "UNAUTHENTICATED" {
		fmt.Printf("Client failed to authenticate: %s\n", values["displayName"])
		return fmt.Errorf("failed to authenticate")
	}

	fmt.Printf("Client authenticated: %s\n", values["displayName"])
	return nil
}

// Check auth.go for a better implementation, this is stubbed for development
func simpleValidateToken(token string) string {
	if token == "invalid_token" {
		return "UNAUTHENTICATED"
	}
	return "AUTHENTICATED"
}
