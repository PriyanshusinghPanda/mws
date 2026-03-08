import time
from app.core.redis import redis_client


async def check_rate_limit(project_id: str, limit: int = 100, window: int = 3600) -> bool:
    """sliding window rate limiter
    returns True if request is allowed, False if rate limited
    """
    key = f"ratelimit:{project_id}"
    now = time.time()
    pipe = redis_client.pipeline()

    # remove old entries outside the window
    pipe.zremrangebyscore(key, 0, now - window)
    # add current request
    pipe.zadd(key, {str(now): now})
    # count requests in window
    pipe.zcard(key)
    # set expiry on the key
    pipe.expire(key, window)

    results = await pipe.execute()
    request_count = results[2]

    return request_count <= limit
