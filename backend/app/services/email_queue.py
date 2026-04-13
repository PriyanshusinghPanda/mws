from app.core.redis import redis_client, EMAIL_QUEUE


class EmailQueue:
    """redis-backed queue for email processing"""

    def __init__(self, queue_name: str = EMAIL_QUEUE):
        self.queue_name = queue_name

    async def enqueue(self, email_id: str):
        """push email id to the queue"""
        await redis_client.lpush(self.queue_name, email_id)

    async def dequeue(self, timeout: int = 5) -> str | None:
        """pop an email id, blocks for timeout seconds"""
        result = await redis_client.brpop(self.queue_name, timeout=timeout)
        if result:
            return result[1]
        return None

    async def size(self) -> int:
        """get current queue size"""
        return await redis_client.llen(self.queue_name)


# default queue instance
email_queue = EmailQueue()
