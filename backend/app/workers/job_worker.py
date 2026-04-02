import asyncio
import uuid
import json
import time
from datetime import datetime, timezone

import httpx
from sqlalchemy import select

from app.core.database import async_session
from app.models.job import Job, JobRun, DeadLetterEntry
from app.services.distributed_lock import acquire_lock, release_lock
from app.services.cron_utils import get_next_run

MAX_RETRIES = 3
POLL_INTERVAL = 10  # seconds
WEBHOOK_TIMEOUT = 30  # seconds


async def find_due_jobs() -> list:
    """find all active jobs where next_run_at is in the past"""
    async with async_session() as session:
        now = datetime.now(timezone.utc)
        result = await session.execute(
            select(Job).where(
                Job.status == "active",
                Job.next_run_at <= now,
            )
        )
        return result.scalars().all()


async def execute_http_job(job: Job) -> tuple[bool, str | None]:
    """POST to the callback url and return (success, error_msg)"""
    try:
        async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
            payload = json.loads(job.payload) if job.payload else {}
            response = await client.post(
                job.callback_url,
                json=payload,
                headers={"X-Job-Id": str(job.id)},
            )
            if response.status_code >= 200 and response.status_code < 300:
                return True, None
            else:
                return False, f"HTTP {response.status_code}: {response.text[:200]}"
    except httpx.TimeoutException:
        return False, f"Webhook timed out after {WEBHOOK_TIMEOUT}s"
    except Exception as e:
        return False, str(e)


async def execute_email_job(job: Job) -> tuple[bool, str | None]:
    """send an email using the email service"""
    try:
        from app.services.smtp_sender import send_smtp_email

        payload = json.loads(job.payload) if job.payload else {}
        to_address = payload.get("to_address")
        subject = payload.get("subject", "Scheduled Email")
        body_html = payload.get("body_html", "")

        if not to_address:
            return False, "No to_address in job payload"

        await send_smtp_email(
            to_address=to_address,
            subject=subject,
            body_html=body_html,
            project_id=str(job.project_id),
        )
        return True, None
    except Exception as e:
        return False, str(e)


async def run_job(job_id: uuid.UUID):
    """execute a single job with locking, retries, and dlq"""
    lock_key = f"job:{job_id}"

    if not await acquire_lock(lock_key, ttl=60):
        return  # another worker got it

    try:
        async with async_session() as session:
            result = await session.execute(select(Job).where(Job.id == job_id))
            job = result.scalar_one_or_none()
            if not job or job.status != "active":
                return

            # create a job run record
            start_time = time.time()
            job_run = JobRun(
                job_id=job.id,
                status="running",
                attempt=1,
            )
            session.add(job_run)
            await session.commit()

            # execute based on type
            success = False
            error_msg = None
            attempt = 0

            while attempt < MAX_RETRIES:
                attempt += 1
                job_run.attempt = attempt

                if job.type == "http":
                    success, error_msg = await execute_http_job(job)
                elif job.type == "email":
                    success, error_msg = await execute_email_job(job)
                else:
                    error_msg = f"Unknown job type: {job.type}"
                    break

                if success:
                    break

                # wait before retry (exponential backoff)
                if attempt < MAX_RETRIES:
                    print(f"job {job_id} attempt {attempt} failed, retrying in {2 ** attempt}s...")
                    await asyncio.sleep(2 ** attempt)

            duration_ms = int((time.time() - start_time) * 1000)
            job_run.duration_ms = duration_ms
            job_run.error_message = error_msg

            if success:
                job_run.status = "success"
                print(f"job {job_id} completed in {duration_ms}ms")
            else:
                job_run.status = "failed"
                print(f"job {job_id} failed after {attempt} attempts: {error_msg}")

                # add to dead letter queue
                dlq_entry = DeadLetterEntry(
                    job_run_id=job_run.id,
                    reason=error_msg or "Unknown error",
                )
                session.add(dlq_entry)

            # update next_run_at for cron jobs, mark one-time as completed
            if job.cron_expr:
                job.next_run_at = get_next_run(job.cron_expr)
            else:
                job.status = "completed"
                job.next_run_at = None

            await session.commit()
    finally:
        await release_lock(lock_key)


async def run_scheduler():
    """main loop - polls for due jobs every 10 seconds"""
    print(f"job scheduler started, polling every {POLL_INTERVAL}s...")

    while True:
        try:
            jobs = await find_due_jobs()
            if jobs:
                print(f"found {len(jobs)} due jobs")
                # run jobs concurrently
                tasks = [run_job(job.id) for job in jobs]
                await asyncio.gather(*tasks)
        except Exception as e:
            print(f"scheduler error: {e}")

        await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(run_scheduler())
