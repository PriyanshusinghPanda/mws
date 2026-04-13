import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.models.email import EmailMessage
from app.services.email_queue import email_queue
from app.services.smtp_sender import SmtpSenderFactory
from app.services.retry import email_retry_handler
from app.workers.base_worker import BaseWorker


class EmailWorker(BaseWorker):
    """polls redis queue and sends emails via smtp"""

    def __init__(self):
        super().__init__("EmailWorker")

    async def process(self):
        email_id = await email_queue.dequeue()
        if email_id:
            await self._process_email(email_id)

    async def _process_email(self, email_id: str):
        async with async_session() as session:
            result = await session.execute(
                select(EmailMessage).where(EmailMessage.id == uuid.UUID(email_id))
            )
            email_msg = result.scalar_one_or_none()
            if not email_msg or email_msg.status == "sent":
                return

            email_msg.status = "processing"
            email_msg.attempt_count += 1
            await session.commit()

            try:
                sender = await SmtpSenderFactory.create(str(email_msg.project_id))
                await sender.send(
                    to_address=email_msg.to_address,
                    subject=email_msg.subject,
                    body_html=email_msg.body_html,
                )
                email_msg.status = "sent"
                email_msg.sent_at = datetime.now(timezone.utc)
                email_msg.error_message = None
                print(f"sent email {email_id} to {email_msg.to_address}")

            except Exception as e:
                print(f"failed to send email {email_id}: {e}")
                email_msg.error_message = str(e)

                if email_retry_handler.should_retry(email_msg.attempt_count):
                    email_msg.status = "queued"
                    asyncio.create_task(self._schedule_retry(email_id, email_msg.attempt_count))
                else:
                    email_msg.status = "failed"
                    print(f"email {email_id} permanently failed after {email_retry_handler.max_retries} attempts")

            await session.commit()

    async def _schedule_retry(self, email_id: str, attempt: int):
        """wait with backoff then re-queue"""
        await email_retry_handler.wait_before_retry(attempt)
        await email_queue.enqueue(email_id)


if __name__ == "__main__":
    worker = EmailWorker()
    asyncio.run(worker.start())
