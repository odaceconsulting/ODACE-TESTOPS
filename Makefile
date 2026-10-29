.PHONY: up down lint test migrate seed web-dev

up:
	docker compose -f deploy/compose/docker-compose.dev.yml up -d

down:
	docker compose -f deploy/compose/docker-compose.dev.yml down

lint:
	ruff check apps libs connectors
	mypy apps libs connectors

test:
	pytest -q tests/unit tests/integration

migrate:
	alembic upgrade head

seed:
	python -m libs.persistence.seed

docker-migrate:
	docker compose -f deploy/compose/docker-compose.dev.yml run --rm api alembic upgrade head

docker-seed:
	docker compose -f deploy/compose/docker-compose.dev.yml run --rm api python -m libs.persistence.seed

web-dev:
	pnpm --filter ./apps/web dev

