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
from app.services.email_service import EmailService, RateLimitExceededError, TemplateNotFoundError

router = APIRouter(prefix="/api/emails", tags=["emails"])


class SendEmailRequest(BaseModel):
    project_id: uuid.UUID
    to_address: EmailStr
    subject: str | None = None
    body_html: str | None = None
    template_id: uuid.UUID | None = None
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
    # verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.account_id == account.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    service = EmailService(db)
    try:
        email_msg = await service.send_email(
            project_id=body.project_id,
            to_address=body.to_address,
            subject=body.subject,
            body_html=body.body_html,
            template_id=body.template_id,
            variables=body.variables,
        )
        return email_msg
    except RateLimitExceededError:
        raise HTTPException(status_code=429, detail="Rate limit exceeded. Max 100 emails per hour.")
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail="Template not found")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{email_id}", response_model=EmailResponse)
async def get_email_status(
    email_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    service = EmailService(db)
    email_msg = await service.get_email(email_id)
    if not email_msg:
        raise HTTPException(status_code=404, detail="Email not found")

    # verify ownership
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
    proj = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    service = EmailService(db)
    return await service.get_logs(project_id, page, per_page)
