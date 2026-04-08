import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.account import Account
from app.models.project import Project
from app.models.email import EmailMessage
from app.models.job import Job, JobRun

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/{project_id}")
async def get_analytics(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # verify ownership
    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # email stats
    total_emails = await db.execute(
        select(func.count()).select_from(EmailMessage).where(EmailMessage.project_id == project_id)
    )
    sent_emails = await db.execute(
        select(func.count()).select_from(EmailMessage).where(
            EmailMessage.project_id == project_id, EmailMessage.status == "sent"
        )
    )
    failed_emails = await db.execute(
        select(func.count()).select_from(EmailMessage).where(
            EmailMessage.project_id == project_id, EmailMessage.status == "failed"
        )
    )

    # job stats
    total_jobs = await db.execute(
        select(func.count()).select_from(Job).where(Job.project_id == project_id)
    )
    active_jobs = await db.execute(
        select(func.count()).select_from(Job).where(
            Job.project_id == project_id, Job.status == "active"
        )
    )

    # job run stats (last 7 days)
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    successful_runs = await db.execute(
        select(func.count()).select_from(JobRun)
        .join(Job)
        .where(Job.project_id == project_id, JobRun.status == "success", JobRun.started_at >= week_ago)
    )
    failed_runs = await db.execute(
        select(func.count()).select_from(JobRun)
        .join(Job)
        .where(Job.project_id == project_id, JobRun.status == "failed", JobRun.started_at >= week_ago)
    )

    # emails per day (last 7 days)
    emails_per_day = []
    for i in range(6, -1, -1):
        day = datetime.now(timezone.utc) - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = await db.execute(
            select(func.count()).select_from(EmailMessage).where(
                EmailMessage.project_id == project_id,
                EmailMessage.created_at >= day_start,
                EmailMessage.created_at < day_end,
            )
        )
        emails_per_day.append({
            "date": day_start.strftime("%b %d"),
            "count": count.scalar() or 0,
        })

    return {
        "emails": {
            "total": total_emails.scalar() or 0,
            "sent": sent_emails.scalar() or 0,
            "failed": failed_emails.scalar() or 0,
        },
        "jobs": {
            "total": total_jobs.scalar() or 0,
            "active": active_jobs.scalar() or 0,
        },
        "runs_last_7d": {
            "success": successful_runs.scalar() or 0,
            "failed": failed_runs.scalar() or 0,
        },
        "emails_per_day": emails_per_day,
    }
