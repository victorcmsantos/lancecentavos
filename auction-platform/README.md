# Auction Platform Starter

## Structure

```txt
auction-platform/
  frontend/
  backend/
  docker-compose.yml
  README.md
```

## Quick Start

```bash
cd auction-platform
docker compose up --build
```

## Local URLs

- Frontend: http://localhost:3000
- Backend: http://localhost:8080
- Postgres: localhost:5432
- Redis: localhost:6379

## White-label Local Testing

Add hosts entries:

```txt
127.0.0.1 influencer1.localhost
127.0.0.1 influencer2.localhost
```

Then open:

- http://influencer1.localhost:3000
- http://influencer2.localhost:3000

## Backend API

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auctions`
- `GET /api/v1/auctions/:id`
- `POST /api/v1/auctions` (influencer/admin)
- `POST /api/v1/auctions/:id/start` (influencer/admin)
- `POST /api/v1/auctions/:id/finish` (influencer/admin)
- `POST /api/v1/auctions/:id/bids`
- `GET /api/v1/auctions/:id/bids`
- `GET /api/v1/tenants/:subdomain`
- `GET /ws/auctions/:id?token=JWT`

## Environment

Backend env file: `backend/.env.example`
Frontend env file: `frontend/.env.example`

## Security Implemented

- JWT auth middleware
- role-based authorization
- bid timestamp drift validation
- immutable bid records + transaction table entries
- serializable transaction isolation for bid updates
- Redis-backed per-user bid rate limit
