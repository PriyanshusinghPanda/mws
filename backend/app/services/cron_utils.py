from datetime import datetime, timezone
from croniter import croniter


def is_valid_cron(expr: str) -> bool:
    """check if a cron expression is valid"""
    try:
        croniter(expr)
        return True
    except (ValueError, KeyError):
        return False


def get_next_run(cron_expr: str, base_time: datetime | None = None) -> datetime:
    """calculate next run time from a cron expression"""
    if base_time is None:
        base_time = datetime.now(timezone.utc)
    cron = croniter(cron_expr, base_time)
    return cron.get_next(datetime).replace(tzinfo=timezone.utc)
