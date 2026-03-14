import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.core.config import settings


async def send_smtp_email(to_address: str, subject: str, body_html: str) -> None:
    """sends an email through smtp, throws on failure"""
    msg = MIMEMultipart("alternative")
    msg["From"] = "noreply@miniaws.dev"
    msg["To"] = to_address
    msg["Subject"] = subject
    msg.attach(MIMEText(body_html, "html"))

    await aiosmtplib.send(
        msg,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        use_tls=False,
    )
