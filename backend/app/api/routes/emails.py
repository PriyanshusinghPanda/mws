import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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
