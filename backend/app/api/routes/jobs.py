import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.account import Account
from app.models.project import Project
from app.services.job_service import JobService, InvalidJobTypeError, JobNotFoundError

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


class CreateJobRequest(BaseModel):
    project_id: uuid.UUID
    type: str
    callback_url: str | None = None
    payload: dict | None = None
    cron_expr: str | None = None
    run_at: datetime | None = None
    delay_seconds: int | None = None


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


async def _verify_project(project_id: uuid.UUID, account: Account, db: AsyncSession) -> None:
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")


@router.post("", response_model=JobResponse, status_code=201)
async def create_job(
    body: CreateJobRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_project(body.project_id, account, db)

    service = JobService(db)
    try:
        job = await service.create_job(
            project_id=body.project_id,
            job_type=body.type,
            callback_url=body.callback_url,
            payload=body.payload,
            cron_expr=body.cron_expr,
            run_at=body.run_at,
            delay_seconds=body.delay_seconds,
        )
        return job
    except InvalidJobTypeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{project_id}", response_model=list[JobResponse])
async def list_jobs(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_project(project_id, account, db)
    service = JobService(db)
    return await service.list_jobs(project_id)


@router.get("/detail/{job_id}", response_model=JobResponse)
async def get_job(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = JobService(db)
    job = await service.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.delete("/{job_id}")
async def cancel_job(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = JobService(db)
    try:
        await service.cancel_job(job_id)
        return {"detail": "Job cancelled"}
    except JobNotFoundError:
        raise HTTPException(status_code=404, detail="Job not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/runs/{job_id}", response_model=list[JobRunResponse])
async def get_job_runs(
    job_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = JobService(db)
    return await service.get_runs(job_id)


@router.get("/dlq/{project_id}", response_model=list[DeadLetterResponse])
async def get_dead_letter_queue(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _verify_project(project_id, account, db)
    service = JobService(db)
    return await service.get_dead_letter_queue(project_id)
