import uuid
import json
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.account import Account
from app.models.project import Project
from app.models.job import Job, JobRun, DeadLetterEntry
from app.services.cron_utils import is_valid_cron, get_next_run

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class CreateJobRequest(BaseModel):
    project_id: uuid.UUID
    type: str  # "http" or "email"
    callback_url: str | None = None
    payload: dict | None = None
    cron_expr: str | None = None  # for recurring jobs
    run_at: datetime | None = None  # for one-time scheduled jobs
    delay_seconds: int | None = None  # for delayed jobs


class JobResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    cron_expr: str | None
    next_run_at: datetime | None
    status: str
    callback_url: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class JobRunResponse(BaseModel):
    id: uuid.UUID
    job_id: uuid.UUID
    status: str
    attempt: int
    duration_ms: int | None
    error_message: str | None
    started_at: datetime

    class Config:
        from_attributes = True


class DeadLetterResponse(BaseModel):
    id: uuid.UUID
    job_run_id: uuid.UUID
    reason: str
    resolution: str | None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    body: CreateJobRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # verify project ownership
    proj = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    if body.type not in ("http", "email"):
        raise HTTPException(status_code=400, detail="Job type must be 'http' or 'email'")

    if body.type == "http" and not body.callback_url:
        raise HTTPException(status_code=400, detail="callback_url is required for http jobs")

    # figure out when to run
    next_run_at = None
    cron_expr = None

    if body.cron_expr:
        if not is_valid_cron(body.cron_expr):
            raise HTTPException(status_code=400, detail="Invalid cron expression")
        cron_expr = body.cron_expr
        next_run_at = get_next_run(cron_expr)
    elif body.run_at:
        next_run_at = body.run_at
    elif body.delay_seconds:
        next_run_at = datetime.now(timezone.utc) + timedelta(seconds=body.delay_seconds)
    else:
        # run immediately
        next_run_at = datetime.now(timezone.utc)

    job = Job(
        project_id=body.project_id,
        type=body.type,
        cron_expr=cron_expr,
        next_run_at=next_run_at,
        callback_url=body.callback_url,
        payload=json.dumps(body.payload) if body.payload else None,
        status="active",
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/{project_id}", response_model=list[JobResponse])
async def list_jobs(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.execute(
        select(Job).where(Job.project_id == project_id).order_by(desc(Job.created_at))
    )
    return result.scalars().all()


@router.get("/detail/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def cancel_job(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "cancelled":
        raise HTTPException(status_code=400, detail="Job already cancelled")

    job.status = "cancelled"
    job.next_run_at = None
    await db.commit()
    return {"detail": "Job cancelled"}


@router.get("/runs/{job_id}", response_model=list[JobRunResponse])
async def get_job_runs(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(JobRun).where(JobRun.job_id == job_id).order_by(desc(JobRun.started_at))
    )
    return result.scalars().all()


@router.get("/dlq/{project_id}", response_model=list[DeadLetterResponse])
async def get_dead_letter_queue(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # get all DLQ entries for jobs in this project
    result = await db.execute(
        select(DeadLetterEntry)
        .join(JobRun)
        .join(Job)
        .where(Job.project_id == project_id)
        .order_by(desc(DeadLetterEntry.created_at))
    )
    return result.scalars().all()
