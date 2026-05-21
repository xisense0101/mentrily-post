package main

import (
	"log"
	"net/http"

	"github.com/mentrily/go-runtime/internal/shared"
)

func main() {
	http.HandleFunc("/health", shared.HealthHandler)
	log.Println("realtime-node listening on :8082")
	log.Fatal(http.ListenAndServe(":8082", nil))
}
