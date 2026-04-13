import asyncio
import uuid
import time
from datetime import datetime, timezone

from sqlalchemy import select

from app.core.database import async_session
from app.models.job import Job, JobRun, DeadLetterEntry
from app.services.distributed_lock import DistributedLock, LockNotAcquiredError
from app.services.cron_utils import CronSchedule
from app.services.retry import job_retry_handler
from app.workers.base_worker import BaseWorker
from app.workers.job_executors import JobExecutorFactory

POLL_INTERVAL = 10


class JobScheduler(BaseWorker):
    """polls for due jobs and executes them with locking and retries"""

    def __init__(self, poll_interval: int = POLL_INTERVAL):
        super().__init__("JobScheduler")
        self.poll_interval = poll_interval

    async def process(self):
        jobs = await self._find_due_jobs()
        if jobs:
            print(f"found {len(jobs)} due jobs")
            tasks = [self._run_job(job.id) for job in jobs]
            await asyncio.gather(*tasks)
        await asyncio.sleep(self.poll_interval)

    async def _find_due_jobs(self) -> list:
        async with async_session() as session:
            now = datetime.now(timezone.utc)
            result = await session.execute(
                select(Job).where(Job.status == "active", Job.next_run_at <= now)
            )
            return result.scalars().all()

    async def _run_job(self, job_id: uuid.UUID):
        lock = DistributedLock(f"job:{job_id}", ttl=60)

        try:
            async with lock:
                await self._execute_with_retries(job_id)
        except LockNotAcquiredError:
            pass  # another worker got it

    async def _execute_with_retries(self, job_id: uuid.UUID):
        async with async_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if not job or job.status != "active":
                return

            executor = JobExecutorFactory.get_executor(job.type)

            start_time = time.time()
            job_run = JobRun(job_id=job.id, status="running", attempt=1)
            session.add(job_run)
            await session.commit()

            success = False
            error_msg = None
            attempt = 0

            while attempt < job_retry_handler.max_retries:
                attempt += 1
                job_run.attempt = attempt

                success, error_msg = await executor.execute(job)

                if success:
                    break

                if job_retry_handler.should_retry(attempt):
                    print(f"job {job_id} attempt {attempt} failed, retrying...")
                    await job_retry_handler.wait_before_retry(attempt)

            duration_ms = int((time.time() - start_time) * 1000)
            job_run.duration_ms = duration_ms
            job_run.error_message = error_msg

            if success:
                job_run.status = "success"
                print(f"job {job_id} completed in {duration_ms}ms")
            else:
                job_run.status = "failed"
                print(f"job {job_id} failed after {attempt} attempts: {error_msg}")
                session.add(DeadLetterEntry(
                    job_run_id=job_run.id,
                    reason=error_msg or "Unknown error",
                ))

            # update next run or mark complete
            if job.cron_expr:
                schedule = CronSchedule(job.cron_expr)
                job.next_run_at = schedule.get_next_run()
            else:
                job.status = "completed"
                job.next_run_at = None

            await session.commit()


if __name__ == "__main__":
    scheduler = JobScheduler()
    asyncio.run(scheduler.start())
