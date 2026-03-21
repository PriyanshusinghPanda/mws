import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy import select
from app.core.config import settings
from app.core.database import async_session
from app.core.security import decrypt_value
from app.models.smtp_credential import SmtpCredential


async def send_smtp_email(to_address: str, subject: str, body_html: str, project_id: str) -> None:
    """sends email using project's smtp creds if connected, otherwise uses default mailpit"""

    # check if project has connected smtp
    cred = await _get_project_smtp(project_id)

    msg = MIMEMultipart("alternative")
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.attach(MIMEText(body_html, "html"))

    if cred and cred.is_verified:
        # send using user's own email (gmail etc)
        msg["From"] = cred.email
        password = decrypt_value(cred.password_encrypted)
        await aiosmtplib.send(
            msg,
            hostname=cred.smtp_host,
            port=cred.smtp_port,
            username=cred.username,
            password=password,
            start_tls=cred.use_tls,
        )
    else:
        # fallback to default smtp (mailpit in dev)
        msg["From"] = "noreply@miniaws.dev"
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,
        )


async def _get_project_smtp(project_id: str) -> SmtpCredential | None:
    async with async_session() as session:
        import uuid
        result = await session.execute(
            select(SmtpCredential).where(SmtpCredential.project_id == uuid.UUID(project_id))
        )
        return result.scalar_one_or_none()
