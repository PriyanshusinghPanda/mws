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
from app.models.email import EmailTemplate

router = APIRouter(prefix="/api/templates", tags=["templates"])


class CreateTemplateRequest(BaseModel):
    project_id: uuid.UUID
    name: str
    subject: str
    body_html: str


class UpdateTemplateRequest(BaseModel):
    name: str | None = None
    subject: str | None = None
    body_html: str | None = None


class TemplateResponse(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    subject: str
    body_html: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=TemplateResponse, status_code=201)
async def create_template(
    body: CreateTemplateRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # check ownership
    proj = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.account_id == account.id)
    )
    if not proj.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    template = EmailTemplate(
        project_id=body.project_id,
        name=body.name,
        subject=body.subject,
        body_html=body.body_html,
    )
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


@router.get("/{project_id}", response_model=list[TemplateResponse])
async def list_templates(
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
        select(EmailTemplate).where(EmailTemplate.project_id == project_id)
    )
    return result.scalars().all()


@router.get("/detail/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: uuid.UUID,
    body: UpdateTemplateRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if body.name is not None:
        template.name = body.name
    if body.subject is not None:
        template.subject = body.subject
    if body.body_html is not None:
        template.body_html = body.body_html

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}")
async def delete_template(
    template_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(EmailTemplate).where(EmailTemplate.id == template_id))
    template = result.scalar_one_or_none()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.commit()
    return {"detail": "Template deleted"}
