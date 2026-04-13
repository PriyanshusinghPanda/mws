from app.core.redis import redis_client


class DistributedLock:
    """redis-based distributed lock using SET NX"""

    def __init__(self, key: str, ttl: int = 30):
        self.key = f"lock:{key}"
        self.ttl = ttl
        self._acquired = False

    async def acquire(self) -> bool:
        result = await redis_client.set(self.key, "1", nx=True, ex=self.ttl)
        self._acquired = result is not None
        return self._acquired

    async def release(self):
        if self._acquired:
            await redis_client.delete(self.key)
            self._acquired = False

    async def __aenter__(self):
        acquired = await self.acquire()
        if not acquired:
            raise LockNotAcquiredError(self.key)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.release()
        return False


class LockNotAcquiredError(Exception):
    """raised when a lock cannot be acquired (another worker has it)"""
    pass
