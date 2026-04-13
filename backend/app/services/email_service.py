import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from jinja2 import Template as Jinja2Template

from app.models.email import EmailMessage, EmailTemplate
from app.services.email_queue import email_queue
from app.services.rate_limiter import email_rate_limiter


class EmailService:
    """handles all email business logic"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def send_email(
        self,
        project_id: uuid.UUID,
        to_address: str,
        subject: str | None = None,
        body_html: str | None = None,
        template_id: uuid.UUID | None = None,
        variables: dict | None = None,
    ) -> EmailMessage:
        """create an email message, render template if needed, and queue it"""

        # rate limit check
        if not await email_rate_limiter.is_allowed(str(project_id)):
            raise RateLimitExceededError("Max 100 emails per hour")

        # render template if provided
        if template_id:
            subject, body_html = await self._render_template(template_id, variables or {})

        if not subject or not body_html:
            raise ValueError("Subject and body are required (or use a template)")

        email_msg = EmailMessage(
            project_id=project_id,
            to_address=to_address,
            subject=subject,
            body_html=body_html,
            status="queued",
        )
        self.db.add(email_msg)
        await self.db.commit()
        await self.db.refresh(email_msg)

        await email_queue.enqueue(str(email_msg.id))
        return email_msg

    async def get_email(self, email_id: uuid.UUID) -> EmailMessage | None:
        result = await self.db.execute(
            select(EmailMessage).where(EmailMessage.id == email_id)
        )
        return result.scalar_one_or_none()

    async def get_logs(self, project_id: uuid.UUID, page: int = 1, per_page: int = 20) -> list[EmailMessage]:
        offset = (page - 1) * per_page
        result = await self.db.execute(
            select(EmailMessage)
            .where(EmailMessage.project_id == project_id)
            .order_by(desc(EmailMessage.created_at))
            .offset(offset)
            .limit(per_page)
        )
        return result.scalars().all()

    async def _render_template(self, template_id: uuid.UUID, variables: dict) -> tuple[str, str]:
        result = await self.db.execute(
            select(EmailTemplate).where(EmailTemplate.id == template_id)
        )
        template = result.scalar_one_or_none()
        if not template:
            raise TemplateNotFoundError(f"Template {template_id} not found")

        subject = Jinja2Template(template.subject).render(**variables)
        body_html = Jinja2Template(template.body_html).render(**variables)
        return subject, body_html


class RateLimitExceededError(Exception):
    pass


class TemplateNotFoundError(Exception):
    pass
