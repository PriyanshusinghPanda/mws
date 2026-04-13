import json
from abc import ABC, abstractmethod

import httpx

from app.models.job import Job
from app.services.smtp_sender import SmtpSenderFactory

WEBHOOK_TIMEOUT = 30


class BaseJobExecutor(ABC):
    """base class for job execution strategies"""

    @abstractmethod
    async def execute(self, job: Job) -> tuple[bool, str | None]:
        """returns (success, error_message)"""
        pass


class HttpJobExecutor(BaseJobExecutor):
    """executes http webhook jobs"""

    async def execute(self, job: Job) -> tuple[bool, str | None]:
        try:
            async with httpx.AsyncClient(timeout=WEBHOOK_TIMEOUT) as client:
                payload = json.loads(job.payload) if job.payload else {}
                response = await client.post(
                    job.callback_url,
                    json=payload,
                    headers={"X-Job-Id": str(job.id)},
                )
                if 200 <= response.status_code < 300:
                    return True, None
                return False, f"HTTP {response.status_code}: {response.text[:200]}"
        except httpx.TimeoutException:
            return False, f"Webhook timed out after {WEBHOOK_TIMEOUT}s"
        except Exception as e:
            return False, str(e)


class EmailJobExecutor(BaseJobExecutor):
    """executes email sending jobs"""

    async def execute(self, job: Job) -> tuple[bool, str | None]:
        try:
            payload = json.loads(job.payload) if job.payload else {}
            to_address = payload.get("to_address")
            subject = payload.get("subject", "Scheduled Email")
            body_html = payload.get("body_html", "")

            if not to_address:
                return False, "No to_address in job payload"

            sender = await SmtpSenderFactory.create(str(job.project_id))
            await sender.send(to_address=to_address, subject=subject, body_html=body_html)
            return True, None
        except Exception as e:
            return False, str(e)


class JobExecutorFactory:
    """returns the right executor based on job type"""

    _executors: dict[str, BaseJobExecutor] = {
        "http": HttpJobExecutor(),
        "email": EmailJobExecutor(),
    }

    @classmethod
    def get_executor(cls, job_type: str) -> BaseJobExecutor:
        executor = cls._executors.get(job_type)
        if not executor:
            raise ValueError(f"Unknown job type: {job_type}")
        return executor
