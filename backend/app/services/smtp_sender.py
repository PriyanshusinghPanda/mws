import uuid
from abc import ABC, abstractmethod
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import aiosmtplib
from sqlalchemy import select

from app.core.config import settings
from app.core.database import async_session
from app.core.security import decrypt_value
from app.models.smtp_credential import SmtpCredential


class BaseSmtpSender(ABC):
    """base class for all smtp senders"""

    def _build_message(self, from_addr: str, to_addr: str, subject: str, body_html: str) -> MIMEMultipart:
        msg = MIMEMultipart("alternative")
        msg["From"] = from_addr
        msg["To"] = to_addr
        msg["Subject"] = subject
        msg.attach(MIMEText(body_html, "html"))
        return msg

    @abstractmethod
    async def send(self, to_address: str, subject: str, body_html: str) -> None:
        pass


class DefaultSmtpSender(BaseSmtpSender):
    """uses the default smtp server (mailpit in dev)"""

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.from_address = "noreply@miniaws.dev"

    async def send(self, to_address: str, subject: str, body_html: str) -> None:
        msg = self._build_message(self.from_address, to_address, subject, body_html)
        await aiosmtplib.send(msg, hostname=self.host, port=self.port, use_tls=False)


class CustomSmtpSender(BaseSmtpSender):
    """uses user's own smtp credentials (gmail app password etc)"""

    def __init__(self, credential: SmtpCredential):
        self.host = credential.smtp_host
        self.port = credential.smtp_port
        self.username = credential.username
        self.password = decrypt_value(credential.password_encrypted)
        self.from_address = credential.email
        self.use_tls = credential.use_tls

    async def send(self, to_address: str, subject: str, body_html: str) -> None:
        msg = self._build_message(self.from_address, to_address, subject, body_html)
        await aiosmtplib.send(
            msg,
            hostname=self.host,
            port=self.port,
            username=self.username,
            password=self.password,
            start_tls=self.use_tls,
        )


class SmtpSenderFactory:
    """creates the right sender based on whether user has connected their email"""

    @staticmethod
    async def create(project_id: str) -> BaseSmtpSender:
        async with async_session() as session:
            result = await session.execute(
                select(SmtpCredential).where(
                    SmtpCredential.project_id == uuid.UUID(project_id),
                    SmtpCredential.is_verified == True,
                )
            )
            cred = result.scalar_one_or_none()

        if cred:
            return CustomSmtpSender(cred)
        return DefaultSmtpSender()
