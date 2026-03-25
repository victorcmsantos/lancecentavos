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
cp .env.example .env
docker compose up --build
```

## Local URLs

- Frontend: http://localhost:13000
- Backend: http://localhost:18080
- Postgres: localhost:15432
- Redis: localhost:16379

## White-label Local Testing

Add hosts entries:

```txt
127.0.0.1 influencer1.localhost
127.0.0.1 influencer2.localhost
```

Then open:

- http://influencer1.localhost:13000
- http://influencer2.localhost:13000

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

Docker Compose env file: `.env.example`
Backend env file: `backend/.env.example`
Frontend env file: `frontend/.env.example`

### Bootstrap admin (dev)

On backend startup, if there is no existing `admin` user, the backend can create one automatically.

- Configure in `auction-platform/.env`:
  - `BOOTSTRAP_ADMIN_EMAIL` (default: `admin@local`)
  - `BOOTSTRAP_ADMIN_PASSWORD`
    - empty: generates a random password and writes it to `auction-platform/.generated/admin.json`
    - set: uses your provided password and does not keep a generated credential file
  - `BOOTSTRAP_ADMIN_FORCE_RESET=true` to rotate/reset the admin password (use once, then disable)
  - `BOOTSTRAP_ADMIN_OUTPUT_PATH` to change where the generated credential file is written inside Docker

Retrieve the last generated password (dev only):

```bash
cat .generated/admin.json
```

The generated file is ignored by git and is mounted from the host into the backend container.

## Security Implemented

- JWT auth middleware
- role-based authorization
- bid timestamp drift validation
- immutable bid records + transaction table entries
- serializable transaction isolation for bid updates
- Redis-backed per-user bid rate limit
