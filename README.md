# Mini AWS (MWS)

A mini cloud platform where developers can consume managed infrastructure through a simple REST API.

## Services

- **Email Service** — Send transactional emails via API with templates, retry, and delivery tracking
- **Job Scheduler** — Schedule one-time, delayed, or recurring cron jobs with webhook delivery

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | Python FastAPI |
| Database | PostgreSQL (SQLAlchemy + Alembic) |
| Cache/Queue | Redis |
| SMTP (dev) | Mailpit |
| Containers | Docker Compose |

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 18+

### Setup

```bash
# clone the repo
git clone https://github.com/PriyanshusinghPanda/mws.git
cd mws

# start infrastructure
docker compose up postgres redis mailpit -d

# backend setup
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# run migrations
cd backend && alembic upgrade head && cd ..

# start backend
DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5433/mws" \
REDIS_URL="redis://localhost:6379/0" \
SECRET_KEY="your-secret-key" \
SMTP_HOST="localhost" \
SMTP_PORT="1025" \
uvicorn app.main:app --app-dir backend --reload

# frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Access

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| Mailpit (dev emails) | http://localhost:8025 |

## API Endpoints

### Auth
- `POST /api/auth/register` — Create account
- `POST /api/auth/login` — Get JWT token

### Projects
- `POST /api/projects` — Create project
- `GET /api/projects` — List projects
- `POST /api/projects/:id/keys` — Generate API key

### Email Service
- `POST /api/emails/send` — Send email (or use template)
- `GET /api/emails/:id` — Check email status
- `GET /api/emails/logs/:project_id` — Email logs

### Templates
- `POST /api/templates` — Create template
- `GET /api/templates/:project_id` — List templates
- `PUT /api/templates/:id` — Update template
- `DELETE /api/templates/:id` — Delete template

### SMTP Connection
- `POST /api/smtp/connect` — Connect your email (Gmail app password, etc)
- `GET /api/smtp/:project_id` — Check connection status
- `DELETE /api/smtp/:project_id` — Disconnect

### Job Scheduler
- `POST /api/jobs` — Create job (http/email, cron/one-time/delayed)
- `GET /api/jobs/:project_id` — List jobs
- `DELETE /api/jobs/:id` — Cancel job
- `GET /api/jobs/runs/:job_id` — Run history
- `GET /api/jobs/dlq/:project_id` — Dead letter queue

### Analytics
- `GET /api/analytics/:project_id` — Dashboard stats

## Architecture

```
React Frontend
     |
FastAPI Backend (port 8000)
     |
  +--+--+
  |     |
Email   Job
Service Scheduler
  |     |
Redis   Redis (locks)
  |
SMTP Provider
  |
PostgreSQL
```

## Workers

- **Email Worker** — Polls Redis queue, sends via SMTP, retries with exponential backoff
- **Job Worker** — Polls DB every 10s, acquires Redis lock, executes webhooks or emails

Run with Docker:
```bash
docker compose up
```

Scale workers:
```bash
docker compose up --scale worker-email=3
```
