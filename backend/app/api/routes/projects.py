import uuid
import secrets
import hashlib

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.account import Account
from app.models.project import Project
from app.models.api_key import ApiKey

router = APIRouter(prefix="/api/projects", tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str


class ProjectResponse(BaseModel):
    id: uuid.UUID
    name: str

    class Config:
        from_attributes = True


class ApiKeyResponse(BaseModel):
    id: uuid.UUID
    raw_key: str  # only returned on creation
    permissions: list[str]


class CreateApiKeyRequest(BaseModel):
    permissions: list[str] = ["email:send", "email:read", "jobs:create", "jobs:read"]


@router.post("", response_model=ProjectResponse, status_code=201)
async def create_project(
    body: CreateProjectRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(account_id=account.id, name=body.name)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("", response_model=list[ProjectResponse])
async def list_projects(
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Project).where(Project.account_id == account.id)
    )
    return result.scalars().all()


@router.post("/{project_id}/keys", response_model=ApiKeyResponse, status_code=201)
async def create_api_key(
    project_id: uuid.UUID,
    body: CreateApiKeyRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # make sure project belongs to user
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # generate a random api key and store hash
    raw_key = f"mws_{secrets.token_hex(32)}"
    key_hash = hashlib.sha256(raw_key.encode()).hexdigest()

    api_key = ApiKey(
        project_id=project_id,
        key_hash=key_hash,
        permissions=body.permissions,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return ApiKeyResponse(id=api_key.id, raw_key=raw_key, permissions=api_key.permissions)


@router.get("/{project_id}/keys")
async def list_api_keys(
    project_id: uuid.UUID,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # verify ownership
    result = await db.execute(
        select(Project).where(Project.id == project_id, Project.account_id == account.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    keys = await db.execute(select(ApiKey).where(ApiKey.project_id == project_id))
    return [
        {"id": k.id, "permissions": k.permissions, "is_active": k.is_active, "created_at": k.created_at}
        for k in keys.scalars().all()
    ]
