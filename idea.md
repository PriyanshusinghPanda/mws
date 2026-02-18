# Mini AWS Platform
## v1.0 — Email Service + Job Scheduler

---

## Overview

We are building **Mini AWS** — a cloud platform where developers can consume managed infrastructure through a simple REST API. Instead of building email sending or job scheduling themselves, they call our platform and we handle everything.

Our first release ships two services:

| Service | Equivalent | What it does |
|---------|-----------|--------------|
| **Email Service** | Amazon SES | Send transactional emails via API |
| **Job Scheduler** | Amazon EventBridge | Schedule and run background jobs |

---

## Architecture

```
Developer App
      │
  API Gateway + Auth
      │
  ┌───┴──────────────┐
  │                  │
Email Service   Job Scheduler
  │                  │
SMTP Provider   Worker Pool
      │
  PostgreSQL + Redis
```

---

## Service 1: Email Service

Developers POST an email request, we queue it, a background worker sends it via SMTP, and we track the delivery status.

**Key challenges:** rate limiting per API key, retry with exponential backoff, template support, SMTP provider abstraction.

---

## Service 2: Job Scheduler

Developers submit one-time, delayed, or recurring cron jobs. We store the schedule, execute at the right time, and POST results to their webhook.

**Key challenges:** persistent schedules, distributed locking (Redis SET NX), cron parsing, dead letter queue, timeout enforcement.

---

## Tech Stack

| Layer | Choice |
|-------|--------|
| Language | Go |
| Database | PostgreSQL |
| Cache / Queue | Redis |
| SMTP (dev) | Mailpit |
| SMTP (prod) | Postfix / SES |
| Container | Docker Compose |

---

## Milestones

| Week | Goal |
|------|------|
| 1 | Scaffolding, DB schema, API key auth |
| 2–3 | Email Service (queue, worker, retry, templates) |
| 4–6 | Job Scheduler (cron, locking, DLQ, webhooks) |
| 7 | Integration: Scheduler triggers Email Service |
| 8 | Docs, error handling, polish |