package main

import (
	"log"
	"net/http"

	"github.com/mentrily/go-runtime/internal/shared"
)

func main() {
	http.HandleFunc("/health", shared.HealthHandler)
	log.Println("execution-node listening on :8083")
	log.Fatal(http.ListenAndServe(":8083", nil))
}
