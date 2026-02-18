# ER Diagram — Mini AWS Platform

```mermaid
erDiagram

    ACCOUNT {
        uuid    id      PK
        string  email   UK
        string  status
    }

    PROJECT {
        uuid    id          PK
        uuid    account_id  FK
        string  name
    }

    API_KEY {
        uuid    id          PK
        uuid    project_id  FK
        string  key_hash
        string  permissions
        bool    is_active
    }

    EMAIL_MESSAGE {
        uuid        id          PK
        uuid        project_id  FK
        string      to_address
        string      subject
        string      status
        int         attempt_count
        timestamp   sent_at
    }

    EMAIL_TEMPLATE {
        uuid    id          PK
        uuid    project_id  FK
        string  name
        text    body_html
    }

    JOB {
        uuid        id          PK
        uuid        project_id  FK
        string      type
        string      cron_expr
        timestamp   next_run_at
        string      status
        string      callback_url
    }

    JOB_RUN {
        uuid        id      PK
        uuid        job_id  FK
        string      status
        int         attempt
        int         duration_ms
        timestamp   started_at
    }

    DEAD_LETTER_ENTRY {
        uuid    id      PK
        uuid    job_id  FK
        text    reason
        string  resolution
    }

    ACCOUNT ||--o{ PROJECT : owns
    PROJECT ||--o{ API_KEY : has
    PROJECT ||--o{ EMAIL_MESSAGE : sends
    PROJECT ||--o{ EMAIL_TEMPLATE : owns
    PROJECT ||--o{ JOB : owns
    JOB ||--o{ JOB_RUN : has
    JOB_RUN ||--o| DEAD_LETTER_ENTRY : may produce
```

---

## Table Notes

| Table | Purpose |
|-------|---------|
| `ACCOUNT` | A registered developer |
| `PROJECT` | A workspace under an account — all resources are scoped here |
| `API_KEY` | Credential used to call the platform; stored as a hash |
| `EMAIL_MESSAGE` | One email send — tracks lifecycle from queued to sent/failed |
| `EMAIL_TEMPLATE` | Reusable email with `{{variable}}` placeholders |
| `JOB` | A scheduled task definition (one-time or recurring cron) |
| `JOB_RUN` | One execution record per job trigger |
| `DEAD_LETTER_ENTRY` | Jobs that failed all retries, preserved for inspection |