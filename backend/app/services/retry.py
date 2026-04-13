import asyncio


class RetryHandler:
    """handles retry logic with exponential backoff"""

    def __init__(self, max_retries: int = 3, base_delay: float = 2.0):
        self.max_retries = max_retries
        self.base_delay = base_delay

    def get_delay(self, attempt: int) -> float:
        """exponential backoff: 2s, 4s, 8s..."""
        return self.base_delay ** attempt

    def should_retry(self, attempt: int) -> bool:
        return attempt < self.max_retries

    async def wait_before_retry(self, attempt: int):
        delay = self.get_delay(attempt)
        await asyncio.sleep(delay)


# default retry handlers
email_retry_handler = RetryHandler(max_retries=3, base_delay=2.0)
job_retry_handler = RetryHandler(max_retries=3, base_delay=2.0)
