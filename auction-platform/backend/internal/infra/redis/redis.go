package redis

import (
	"context"
	"log"

	goredis "github.com/redis/go-redis/v9"
)

func Connect(addr, password string, db int) *goredis.Client {
	client := goredis.NewClient(&goredis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
	})

	if err := client.Ping(context.Background()).Err(); err != nil {
		log.Printf("redis not ready during startup: %v", err)
	}

	return client
}
