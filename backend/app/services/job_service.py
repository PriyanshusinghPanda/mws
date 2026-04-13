import uuid
import json
from datetime import datetime, timezone, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.models.job import Job, JobRun, DeadLetterEntry
from app.services.cron_utils import CronSchedule


class JobService:
    """handles all job scheduling business logic"""

    VALID_TYPES = ("http", "email")

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_job(
        self,
        project_id: uuid.UUID,
        job_type: str,
        callback_url: str | None = None,
        payload: dict | None = None,
        cron_expr: str | None = None,
        run_at: datetime | None = None,
        delay_seconds: int | None = None,
    ) -> Job:
        if job_type not in self.VALID_TYPES:
            raise InvalidJobTypeError(f"Job type must be one of {self.VALID_TYPES}")

        if job_type == "http" and not callback_url:
            raise ValueError("callback_url is required for http jobs")

        next_run_at = self._calculate_next_run(cron_expr, run_at, delay_seconds)

        job = Job(
            project_id=project_id,
            type=job_type,
            cron_expr=cron_expr,
            next_run_at=next_run_at,
            callback_url=callback_url,
            payload=json.dumps(payload) if payload else None,
            status="active",
        )
        self.db.add(job)
        await self.db.commit()
        await self.db.refresh(job)
        return job

    async def cancel_job(self, job_id: uuid.UUID) -> Job:
        job = await self._get_job(job_id)
        if not job:
            raise JobNotFoundError(f"Job {job_id} not found")
        if job.status == "cancelled":
            raise ValueError("Job already cancelled")

        job.status = "cancelled"
        job.next_run_at = None
        await self.db.commit()
        return job

    async def list_jobs(self, project_id: uuid.UUID) -> list[Job]:
        result = await self.db.execute(
            select(Job).where(Job.project_id == project_id).order_by(desc(Job.created_at))
        )
        return result.scalars().all()

    async def get_job(self, job_id: uuid.UUID) -> Job | None:
        return await self._get_job(job_id)

    async def get_runs(self, job_id: uuid.UUID) -> list[JobRun]:
        result = await self.db.execute(
            select(JobRun).where(JobRun.job_id == job_id).order_by(desc(JobRun.started_at))
        )
        return result.scalars().all()

    async def get_dead_letter_queue(self, project_id: uuid.UUID) -> list[DeadLetterEntry]:
        result = await self.db.execute(
            select(DeadLetterEntry)
            .join(JobRun)
            .join(Job)
            .where(Job.project_id == project_id)
            .order_by(desc(DeadLetterEntry.created_at))
        )
        return result.scalars().all()

    def _calculate_next_run(
        self,
        cron_expr: str | None,
        run_at: datetime | None,
        delay_seconds: int | None,
    ) -> datetime:
        if cron_expr:
            schedule = CronSchedule(cron_expr)
            return schedule.get_next_run()
        elif run_at:
            return run_at
        elif delay_seconds:
            return datetime.now(timezone.utc) + timedelta(seconds=delay_seconds)
        else:
            return datetime.now(timezone.utc)

    async def _get_job(self, job_id: uuid.UUID) -> Job | None:
        result = await self.db.execute(select(Job).where(Job.id == job_id))
        return result.scalar_one_or_none()


class InvalidJobTypeError(Exception):
    pass


class JobNotFoundError(Exception):
    pass
