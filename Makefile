SHELL := /bin/bash

.PHONY: setup infra-up infra-down dev lint test build typecheck format

setup:
	pnpm install

infra-up:
	docker compose -f docker-compose.local.yml up -d

infra-down:
	docker compose -f docker-compose.local.yml down

dev:
	pnpm dev

lint:
	pnpm lint

test:
	pnpm test

build:
	pnpm build

typecheck:
	pnpm typecheck

format:
	pnpm format
