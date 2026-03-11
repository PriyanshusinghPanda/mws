import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.account import Account
from app.models.project import Project
from app.models.email import EmailMessage
from app.services.email_queue import enqueue_email
from app.services.rate_limiter import check_rate_limit

router = APIRouter(prefix="/api/emails", tags=["emails"])


class SendEmailRequest(BaseModel):
    project_id: uuid.UUID
    to_address: EmailStr
    subject: str
    body_html: str
    template_id: uuid.UUID | None = None  # TODO: implement template sending later
    variables: dict | None = None


class EmailResponse(BaseModel):
    id: uuid.UUID
    to_address: str
    subject: str
    status: str
    attempt_count: int
    error_message: str | None = None
    sent_at: datetime | None = None
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/send", response_model=EmailResponse, status_code=202)
async def send_email(
    body: SendEmailRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # check project belongs to user
    result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.account_id == account.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # rate limit check - 100 emails per hour per project
    allowed = await check_rate_limit(str(body.project_id))
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Max 100 emails per hour.")

    email_msg = EmailMessage(
        project_id=body.project_id,
        to_address=body.to_address,
        subject=body.subject,
        body_html=body.body_html,
        status="queued",
    )
    db.add(email_msg)
    await db.commit()
    await db.refresh(email_msg)

    # push to redis queue for worker to pick up
    await enqueue_email(str(email_msg.id))

    return email_msg


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email_status(
    email_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EmailMessage).where(EmailMessage.id == email_id))
    email_msg = result.scalar_one_or_none()
    if not email_msg:
        raise HTTPException(status_code=404, detail="Email not found")

    # make sure user owns this email's project
    proj = await db.execute(
        select(Project).where(Project.id == email_msg.project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Email not found")

    return email_msg


@router.get("/logs/{project_id}", response_model=list[EmailResponse])
async def get_email_logs(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = 1,
    per_page: int = 20,
):
    # verify project ownership
    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    offset = (page - 1) * per_page
    result = await db.execute(
        select(EmailMessage)
        .where(EmailMessage.project_id == project_id)
        .order_by(desc(EmailMessage.created_at))
        .offset(offset)
        .limit(per_page)
    )
    return result.scalars().all()
