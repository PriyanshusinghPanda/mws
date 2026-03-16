import asyncio
from app.services.email_queue import enqueue_email

MAX_RETRIES = 3


def get_backoff_delay(attempt: int) -> float:
    """exponential backoff: 2s, 4s, 8s"""
    return 2 ** attempt


async def schedule_retry(email_id: str, attempt: int):
    """wait with backoff then re-queue the email"""
    if attempt >= MAX_RETRIES:
        return False

    delay = get_backoff_delay(attempt)
    print(f"retrying email {email_id} in {delay}s (attempt {attempt + 1})")
    await asyncio.sleep(delay)
    await enqueue_email(email_id)
    return True
