from app.core.redis import redis_client


async def acquire_lock(key: str, ttl: int = 30) -> bool:
    """try to get a redis lock using SET NX, returns True if acquired"""
    result = await redis_client.set(f"lock:{key}", "1", nx=True, ex=ttl)
    return result is not None


async def release_lock(key: str):
    await redis_client.delete(f"lock:{key}")
