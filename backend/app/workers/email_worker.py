import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.models.email import EmailMessage
from app.services.email_queue import dequeue_email
from app.services.smtp_sender import send_smtp_email
from app.services.retry import schedule_retry, MAX_RETRIES


async def process_email(email_id: str):
    """grab the email from db, try to send it via smtp"""
    async with async_session() as session:
        result = await session.execute(
            select(EmailMessage).where(EmailMessage.id == uuid.UUID(email_id))
        )
        email_msg = result.scalar_one_or_none()
        if not email_msg:
            print(f"email {email_id} not found, skipping")
            return

        if email_msg.status == "sent":
            return

        email_msg.status = "processing"
        email_msg.attempt_count += 1
        await session.commit()

        try:
            await send_smtp_email(
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

            if email_msg.attempt_count < MAX_RETRIES:
                email_msg.status = "queued"
                # schedule retry with exponential backoff in background
                asyncio.create_task(schedule_retry(email_id, email_msg.attempt_count))
            else:
                email_msg.status = "failed"
                print(f"email {email_id} permanently failed after {MAX_RETRIES} attempts")

        await session.commit()


async def run_worker():
    print("email worker started, waiting for messages...")
    while True:
        email_id = await dequeue_email()
        if email_id:
            await process_email(email_id)


if __name__ == "__main__":
    asyncio.run(run_worker())
