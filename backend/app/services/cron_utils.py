from datetime import datetime, timezone
from croniter import croniter


class CronSchedule:
    """wraps a cron expression with validation and next-run calculation"""

    def __init__(self, expression: str):
        if not self.is_valid(expression):
            raise ValueError(f"Invalid cron expression: {expression}")
        self.expression = expression

    @staticmethod
    def is_valid(expression: str) -> bool:
        try:
            croniter(expression)
            return True
        except (ValueError, KeyError):
            return False

    def get_next_run(self, base_time: datetime | None = None) -> datetime:
        if base_time is None:
            base_time = datetime.now(timezone.utc)
        cron = croniter(self.expression, base_time)
        return cron.get_next(datetime).replace(tzinfo=timezone.utc)

    def __str__(self) -> str:
        return self.expression

    def __repr__(self) -> str:
        return f"CronSchedule('{self.expression}')"
