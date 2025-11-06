SHELL := /bin/bash

PNPM ?= pnpm
DOCKER_COMPOSE ?= docker compose

.PHONY: setup start stop test clean _ensure-env _require-env

_ensure-env:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "Created .env from template (.env.example)."; \
	fi

_require-env:
	@if [ ! -f .env ]; then \
		echo "Missing .env. Copy .env.example or run 'make setup' first."; \
		exit 1; \
	fi

setup: _ensure-env
	@echo "Installing workspace dependencies with $(PNPM)..."
	@$(PNPM) install
	@echo "Pulling local infrastructure images..."
	@$(DOCKER_COMPOSE) --env-file .env pull

start: _require-env
	@echo "Booting local data services..."
	@$(DOCKER_COMPOSE) --env-file .env up -d --remove-orphans
	@echo "Verifying container health..."
	@$(DOCKER_COMPOSE) --env-file .env ps

stop:
	@echo "Stopping local data services..."
	@if [ -f .env ]; then \
		$(DOCKER_COMPOSE) --env-file .env down --remove-orphans; \
	else \
		$(DOCKER_COMPOSE) down --remove-orphans; \
	fi

test:
	@echo "Running lint and type checks..."
	@$(PNPM) lint
	@$(PNPM) exec tsc -b

clean:
	@echo "Destroying containers and volumes..."
	@if [ -f .env ]; then \
		$(DOCKER_COMPOSE) --env-file .env down --remove-orphans -v; \
	else \
		$(DOCKER_COMPOSE) down --remove-orphans -v; \
	fi
	@echo "Removing local pnpm artifacts..."
	@rm -rf node_modules
	@$(PNPM) store prune || true
