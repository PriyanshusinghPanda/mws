import uuid
import aiosmtplib
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import encrypt_value, decrypt_value
from app.models.account import Account
from app.models.project import Project
from app.models.smtp_credential import SmtpCredential

router = APIRouter(prefix="/api/smtp", tags=["smtp"])


class ConnectSmtpRequest(BaseModel):
    project_id: uuid.UUID
    email: EmailStr
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    username: str  # usually same as email for gmail
    password: str  # app password from google account
    use_tls: bool = True


class SmtpResponse(BaseModel):
    id: uuid.UUID
    email: str
    smtp_host: str
    smtp_port: int
    is_verified: bool

    class Config:
        from_attributes = True


@router.post("/connect", response_model=SmtpResponse, status_code=201)
async def connect_smtp(
    body: ConnectSmtpRequest,
    account: Account = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """connect your email account (gmail app password etc)"""
    # verify project ownership
    result = await db.execute(
        select(Project).where(Project.id == body.project_id, Project.account_id == account.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    # check if already connected
    existing = await db.execute(
        select(SmtpCredential).where(SmtpCredential.project_id == body.project_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="SMTP already connected. Disconnect first.")

    # try sending a test email to verify credentials work
    try:
        await _test_smtp_connection(
            host=body.smtp_host,
            port=body.smtp_port,
            username=body.username,
            password=body.password,
            use_tls=body.use_tls,
            from_email=body.email,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"SMTP connection failed: {str(e)}")

    cred = SmtpCredential(
        project_id=body.project_id,
        email=body.email,
        smtp_host=body.smtp_host,
        smtp_port=body.smtp_port,
        username=body.username,
        password_encrypted=encrypt_value(body.password),
        use_tls=body.use_tls,
        is_verified=True,
    )
    db.add(cred)
    await db.commit()
    await db.refresh(cred)
    return cred


@router.get("/{project_id}", response_model=SmtpResponse | None)
async def get_smtp_status(
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

    result = await db.execute(
        select(SmtpCredential).where(SmtpCredential.project_id == project_id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        return None
    return cred


@router.delete("/{project_id}")
async def disconnect_smtp(
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
        select(SmtpCredential).where(SmtpCredential.project_id == project_id)
    )
    cred = result.scalar_one_or_none()
    if not cred:
        raise HTTPException(status_code=404, detail="No SMTP connected")

    await db.delete(cred)
    await db.commit()
    return {"detail": "SMTP disconnected"}


async def _test_smtp_connection(host: str, port: int, username: str, password: str, use_tls: bool, from_email: str):
    """try connecting to smtp server to verify credentials"""
    msg = MIMEText("This is a test email from Mini AWS to verify your SMTP connection.")
    msg["From"] = from_email
    msg["To"] = from_email
    msg["Subject"] = "Mini AWS - SMTP Connection Test"

    await aiosmtplib.send(
        msg,
        hostname=host,
        port=port,
        username=username,
        password=password,
        start_tls=use_tls,
    )
