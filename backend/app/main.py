from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError

from app.core.exceptions import validation_exception_handler, generic_exception_handler

from app.api.routes.auth import router as auth_router
from app.api.routes.projects import router as projects_router
from app.api.routes.emails import router as emails_router
from app.api.routes.templates import router as templates_router
from app.api.routes.smtp import router as smtp_router
from app.api.routes.jobs import router as jobs_router
from app.api.routes.analytics import router as analytics_router

app = FastAPI(
    title="Mini AWS",
    description="A mini cloud platform — Email Service & Job Scheduler",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth_router)
app.include_router(projects_router)
app.include_router(emails_router)
app.include_router(templates_router)
app.include_router(smtp_router)
app.include_router(jobs_router)
app.include_router(analytics_router)


@app.get("/health")
def health_check():
    return {"status": "ok"}
