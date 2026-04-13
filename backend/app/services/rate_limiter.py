import time
from app.core.redis import redis_client


class RateLimiter:
    """sliding window rate limiter backed by redis sorted sets"""

    def __init__(self, limit: int = 100, window: int = 3600):
        self.limit = limit
        self.window = window

    async def is_allowed(self, resource_id: str) -> bool:
        """returns True if the request is within rate limits"""
        key = f"ratelimit:{resource_id}"
        now = time.time()
        pipe = redis_client.pipeline()

        pipe.zremrangebyscore(key, 0, now - self.window)
        pipe.zadd(key, {str(now): now})
        pipe.zcard(key)
        pipe.expire(key, self.window)

        results = await pipe.execute()
        request_count = results[2]

        return request_count <= self.limit

    async def get_usage(self, resource_id: str) -> int:
        """returns how many requests have been made in the current window"""
        key = f"ratelimit:{resource_id}"
        now = time.time()
        await redis_client.zremrangebyscore(key, 0, now - self.window)
        return await redis_client.zcard(key)


# default instance for email rate limiting (100 per hour)
email_rate_limiter = RateLimiter(limit=100, window=3600)
