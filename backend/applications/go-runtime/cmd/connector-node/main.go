package main

import (
	"log"
	"net/http"

	"github.com/mentrily/go-runtime/internal/shared"
)

func main() {
	http.HandleFunc("/health", shared.HealthHandler)
	log.Println("connector-node listening on :8081")
	log.Fatal(http.ListenAndServe(":8081", nil))
}
