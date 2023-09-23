package api

import (
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

var clients = make(map[*websocket.Conn]ClientData)
var chatRooms = make(map[string]ChatRoom)
var dataMux sync.Mutex

/* This is the main websocket handler for the server.  Whenever a message
 * comes into the server, this function will be called.
 */
func listenToClientMessages(conn *websocket.Conn) {
	fmt.Print("Client connected\n")

	defer func() {
		dataMux.Lock()
		cleanUpDeadConnection(conn)
		dataMux.Unlock()
		conn.Close()
	}()

	dataMux.Lock()

	// this map is kind of confusing, but we create a key for the client using the connection pointer, and
	// set the value to true a struct containing the client's email and display name
	// we can access the connection pointer later to send messages to the client by iterating over the map
	// weird syntax, but it works
	// we could use an array of connections, but this is more efficient???
	var client = ClientData{}
	clients[conn] = client
	dataMux.Unlock()

	for {
		_, msg, err := conn.ReadMessage()
		if err != nil {
			fmt.Println("Client disconnected")
			fmt.Println(err)
			break
		}
		// fmt.Println("Received Message:", string(msg))

		// We need to parse the json message into a struct
		var message Message
		err = json.Unmarshal(msg, &message)
		if err != nil {
			fmt.Println("error:", err)
		}
		// fmt.Println("Client email: ", client.Email)
		// fmt.Println("Message: ", message.Command)
		// fmt.Println("Payload: ", message.Payload)

		dataMux.Lock()

		switch message.Command {
		case "AUTHENTICATE":
			handleAuthenticate(conn, client, message)
		case "JOIN_CHAT_LOBBY":
			handleJoinChatLobby(conn, message)
		case "NEW_MESSAGE":
			handleSay(conn, message)
		case "SET_GAME_CONFIGURATION":
			// message = { "systems": "systemData..." }
			handleSetGameConfiguration(conn, message)
		case "GET_GAME_CONFIGURATION":
			handleGetGameConfiguration(conn, message)
		default:
			fmt.Println("ERROR: Unknown command, " + message.Command)
		}

		dataMux.Unlock()
	}
}

func handleGetGameConfiguration(conn *websocket.Conn, message Message) {
	// The client will request the game configuration from the server
	// The server will send the game configuration to the client
	// The client will then display the game configuration to the user

	chatRoom, exists := chatRooms[message.Payload["chatLobbyId"].(string)]
	if !exists {
		fmt.Println("Chat Room not found")
		return
	}

	var response = Message{
		Command: "GET_GAME_CONFIGURATION_RESPONSE",
		Payload: map[string]interface{}{
			"status":      "success",
			"systemsJson": chatRoom.Game.SystemsJson,
			"time":        "5.00",
		},
	}
	conn.WriteJSON(response)
	fmt.Println("Game configuration sent")
}

func handleSetGameConfiguration(conn *websocket.Conn, message Message) {
	// The client will generate the game configuration and send it to the server
	// We will need to store that configuration in the chat room
	// The server will then send the game configuration to all other clients in the chat room
	chatLobbyId := message.Payload["chatLobbyId"].(string)

	chatRoom, exists := chatRooms[chatLobbyId]
	if !exists {
		fmt.Println("Chat Room not found")
		return
	}

	systemsJson, ok := tryExtractFromPayload(message.Payload, "systemsJson")
	if !ok {
		return
	}

	chatRoom.Game = Game{
		Id:          chatLobbyId,
		SystemsJson: systemsJson,
	}

	chatRooms[chatLobbyId] = chatRoom

	fmt.Println("Game configuration set")
}

func handleAuthenticate(conn *websocket.Conn, client ClientData, message Message) {
	// broadcast message to all clients in this chat lobby
	displayName, ok := tryExtractFromPayload(message.Payload, "displayName")
	if !ok {
		return
	}

	email, ok := tryExtractFromPayload(message.Payload, "email")
	if !ok {
		return
	}

	token, ok := tryExtractFromPayload(message.Payload, "token")
	if !ok {
		return
	}

	// TODO: validate token

	client.DisplayName = displayName
	client.Email = email
	client.Token = token

	clients[conn] = client

	var response = Message{
		Command: "AUTHENTICATE_RESPONSE",
		Payload: map[string]interface{}{
			"status": "AUTHENTICATED",
		},
	}
	conn.WriteJSON(response)
	fmt.Printf("Client authenticated: %s\n", displayName)
}

// Broadcast message to all clients in this chat lobby
func handleSay(conn *websocket.Conn, message Message) {
	chatLobbyId, ok := tryExtractFromPayload(message.Payload, "chatLobbyId")
	if !ok {
		return
	}

	chatRoom, exists := chatRooms[chatLobbyId]
	if !exists {
		fmt.Println("Chat Room not found")
		return
	}

	message.Payload["user"] = clients[conn].DisplayName

	sendMessageToAllChatroomParticipants(chatRoom, message)
}

func handleJoinChatLobby(conn *websocket.Conn, message Message) {
	if chatLobbyId, ok := message.Payload["chatLobbyId"].(string); ok {
		// fmt.Println("Chat Room ID:", chatLobbyId)

		chatRoom, exists := chatRooms[chatLobbyId]
		if !exists {
			fmt.Printf("Creating lobby: %s\n", chatLobbyId)

			chatRoom = ChatRoom{
				Name:    chatLobbyId,
				Clients: make(map[*websocket.Conn]ClientData),
			}
		}

		// Check if the client has already joined the lobby
		if _, exists := chatRoom.Clients[conn]; exists {
			fmt.Println("Client already joined lobby")
			return
		}

		var chatLobbyUsers = getChatLobbyUsers(chatRoom)

		chatRoom.Clients[conn] = clients[conn]
		chatRooms[chatLobbyId] = chatRoom

		var response = Message{
			Command: "JOIN_CHAT_LOBBY_RESPONSE",
			Payload: map[string]interface{}{
				"status":         "success",
				"chatLobbyId":    chatLobbyId,
				"chatLobbyUsers": chatLobbyUsers,
				"message":        "Joined chat lobby",
			},
		}

		// debugPrintStruct(response)
		conn.WriteJSON(response)

		// Announce user joined to all members of the chatroom
		var userJoinAnnouncement = Message{
			Command: "SYSTEM_MESSAGE_USER_JOINED_CHAT",
			Payload: map[string]interface{}{
				"status":      "success",
				"chatLobbyId": chatLobbyId,
				"displayName": clients[conn].DisplayName,
				"email":       clients[conn].Email,
			},
		}

		sendMessageToAllChatroomParticipants(chatRoom, userJoinAnnouncement)
		fmt.Printf("Client joined lobby: %s -> %s\n", clients[conn].DisplayName, chatLobbyId)
	} else {
		fmt.Println("Chat Room ID not found or not a string")
	}
}

func debugPrintStruct(response Message) {
	responseJson, _ := json.Marshal(response)
	fmt.Println("JOIN_CHAT_LOBBY_RESPONSE:\n", string(responseJson))
}

// Private-ish methods...

func getChatLobbyUsers(chatRoom ChatRoom) []string {
	displayNames := make([]string, 0)
	for client := range chatRoom.Clients {
		displayNames = append(displayNames, clients[client].DisplayName)
	}
	return displayNames
}

func sendMessageToAllChatroomParticipants(chatRoom ChatRoom, message Message) {
	for client := range chatRoom.Clients {
		if err := client.WriteJSON(message); err != nil {
			log.Println(err)
			cleanUpDeadConnection(client)
		}
	}
}

func cleanUpDeadConnection(client *websocket.Conn) {
	delete(clients, client)
	for _, chatRoom := range chatRooms {
		delete(chatRoom.Clients, client)
	}
}

func tryExtractFromPayload(payload map[string]interface{}, key string) (string, bool) {
	value, ok := payload[key].(string)
	if !ok {
		fmt.Printf("%s not found or not a string\n", key)
	}
	return value, ok
}
