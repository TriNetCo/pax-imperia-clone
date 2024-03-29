package api

import (
	"encoding/json"
	"fmt"
	"sync"
	"time"

	. "github.com/trinetco/pax-imperia-clone/pkg/models"
)

type ServerConfiguration struct {
	VerboseMode bool `json:"verboseMode"`
}

var serverConfiguration = ServerConfiguration{}
var clients = make(map[*WebSocketConnection]*ClientData)
var chatRooms = make(map[string]*ChatRoom)
var dataMux sync.Mutex

/* This is the main websocket handler for the server.  Whenever a message
 * comes into the server, this function will be called.
 */
func ListenToClientMessages(conn WebSocketConnection) {
	defer func() {
		dataMux.Lock()
		cleanUpDeadConnection(&conn)
		dataMux.Unlock()
		conn.Close()
	}()

	// this map is kind of confusing, but we create a key for the client using
	// the connection pointer, and  set the value to true a struct containing the
	// client's email and display name we can access the connection pointer later
	// to send messages to the client by iterating over the map
	// weird syntax, but it works
	// we could use an array of connections, but this is more efficient???
	dataMux.Lock()
	var client = &ClientData{}
	clients[&conn] = client
	dataMux.Unlock()

	var message Message

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Client disconnected")
			fmt.Println(err)
			break
		}

		startTime := time.Now()
		// fmt.Println("Received Message:", string(msg))

		// check the first character of the msg to see if it is a json message
		if string(msg[0]) == "s" {
			message.Type = "SET_GAME_CONFIGURATION"
			fmt.Println("Received json message")
		} else {
			// Parse the json message into a struct
			if err = json.Unmarshal(msg, &message); err != nil {
				fmt.Println("error:", err)
				return
			}
		}

		// fmt.Println("Client email: ", client.Email)
		// fmt.Println("Message: ", message.Type)
		// fmt.Println("Payload: ", message.Payload)

		dataMux.Lock()

		switch message.Type {
		case "AUTHENTICATE":
			handleAuthenticate(&conn, client, message)
		case "CREATE_CHAT_LOBBY":
			HandleCreateChatLobby(&conn, message)
		case "JOIN_CHAT_LOBBY":
			HandleJoinChatLobby(&conn, message)
		case "LEAVE_CHAT_LOBBY":
			HandleLeaveChatLobby(&conn)
		case "NEW_MESSAGE":
			handleSay(&conn, message)
		case "SET_GAME_CONFIGURATION":
			handleSetGameConfiguration(&conn, &msg)
		case "GET_GAME_CONFIGURATION":
			handleGetGameConfiguration(&conn, message)
		default:
			fmt.Println("ERROR: Unknown message type, " + message.Type)
		}

		dataMux.Unlock()

		// Print performance metrics
		elapsedTime := time.Since(startTime)
		width := 12
		fmt.Printf("%-*s -> %s done\n", width, elapsedTime, message.Type)
	}
}

// This method is called when a client disconnects from the server.
func cleanUpDeadConnection(conn *WebSocketConnection) {

	// Check any chat rooms the client is in and remove them from the chat room
	for _, chatRoom := range chatRooms {
		if _, clientFound := chatRoom.Clients[conn]; clientFound {
			HandleLeaveChatLobby(conn)
		}
	}

	fmt.Print("Cleaning up dead connection: ", &conn, "\n")
	delete(clients, conn)
}

func tryExtractFromPayload(payload map[string]interface{}, key string) (string, bool) {
	value, ok := payload[key].(string)
	if !ok {
		fmt.Printf("%s not found or not a string\n", key)
		fmt.Printf("Payload: %+v\n", payload)
	}
	return value, ok
}

func extractFromPayload(payload map[string]interface{}, keys ...string) (map[string]string, bool) {
	values := make(map[string]string)

	for _, key := range keys {
		value, ok := payload[key].(string)
		if !ok {
			return nil, false
		}
		values[key] = value
	}

	return values, true
}
