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

    # create email message in queued state
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

    # TODO: push to redis queue here

    return email_msg
