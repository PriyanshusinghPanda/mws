import json

from app.core.redis import redis_client, EMAIL_QUEUE


async def enqueue_email(email_id: str):
    """push email id to redis queue for worker to pick up"""
    await redis_client.lpush(EMAIL_QUEUE, email_id)


async def dequeue_email() -> str | None:
    """pop an email id from the queue, blocks for 5s"""
    result = await redis_client.brpop(EMAIL_QUEUE, timeout=5)
    if result:
        return result[1]
    return None
