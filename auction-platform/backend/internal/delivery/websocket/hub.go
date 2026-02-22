package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/example/auction-platform/backend/internal/usecase"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	goredis "github.com/redis/go-redis/v9"
)

type Manager struct {
	redis *goredis.Client
	mu    sync.Mutex
	hubs  map[uuid.UUID]*AuctionHub
}

type AuctionHub struct {
	auctionID  uuid.UUID
	redis      *goredis.Client
	clients    map[*Client]struct{}
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}

type Client struct {
	conn      *websocket.Conn
	auctionID uuid.UUID
	userID    uuid.UUID
	send      chan []byte
	hub       *AuctionHub
	bidUC     *usecase.BidUsecase
}

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func NewManager(redis *goredis.Client) *Manager {
	return &Manager{redis: redis, hubs: map[uuid.UUID]*AuctionHub{}}
}

func (m *Manager) getOrCreateHub(auctionID uuid.UUID) *AuctionHub {
	m.mu.Lock()
	defer m.mu.Unlock()

	if hub, ok := m.hubs[auctionID]; ok {
		return hub
	}

	hub := &AuctionHub{
		auctionID:  auctionID,
		redis:      m.redis,
		clients:    map[*Client]struct{}{},
		broadcast:  make(chan []byte, 128),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
	m.hubs[auctionID] = hub
	go hub.run()
	go hub.consumeRedis()
	return hub
}

func (m *Manager) ServeAuction(c *gin.Context, auctionID, userID uuid.UUID, bidUC *usecase.BidUsecase) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}

	hub := m.getOrCreateHub(auctionID)
	client := &Client{
		conn:      conn,
		auctionID: auctionID,
		userID:    userID,
		send:      make(chan []byte, 32),
		hub:       hub,
		bidUC:     bidUC,
	}

	hub.register <- client
	go client.writeLoop()
	client.readLoop()
}

func (h *AuctionHub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = struct{}{}
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					delete(h.clients, client)
					close(client.send)
				}
			}
		}
	}
}

func (h *AuctionHub) consumeRedis() {
	ctx := context.Background()
	pubsub := h.redis.Subscribe(ctx, "auction:"+h.auctionID.String()+":bids")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		h.broadcast <- []byte(msg.Payload)
	}
}

type incomingMessage struct {
	Type            string `json:"type"`
	Amount          int64  `json:"amount"`
	ClientTimestamp int64  `json:"client_timestamp"`
}

func (c *Client) readLoop() {
	defer func() {
		c.hub.unregister <- c
		_ = c.conn.Close()
	}()

	c.conn.SetReadLimit(4096)
	_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, payload, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
		var in incomingMessage
		if err := json.Unmarshal(payload, &in); err != nil {
			continue
		}
		if in.Type != "place_bid" {
			continue
		}

		_, err = c.bidUC.PlaceBid(context.Background(), usecase.PlaceBidInput{
			AuctionID:        c.auctionID,
			UserID:           c.userID,
			Amount:           in.Amount,
			ClientTimestamp:  in.ClientTimestamp,
			ServerReceivedAt: time.Now().UTC(),
		})
		if err != nil {
			response, _ := json.Marshal(map[string]any{"type": "error", "error": err.Error()})
			c.send <- response
		}
	}
}

func (c *Client) writeLoop() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()

	for {
		select {
		case msg, ok := <-c.send:
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				log.Printf("ws ping failed: %v", err)
				return
			}
		}
	}
}
