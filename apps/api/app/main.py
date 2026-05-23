import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.logging import configure_logging
from .routes import execute, health

configure_logging()

app = FastAPI(title="CodeVision AI API")

# Explicit origin allow-list. Set CVAI_ALLOWED_ORIGINS in prod (comma-separated).
_default_origins = "http://localhost:3000,http://127.0.0.1:3000"
_allowed = [
    o.strip()
    for o in os.environ.get("CVAI_ALLOWED_ORIGINS", _default_origins).split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
    expose_headers=["X-Session-Id"],
)

app.include_router(health.router)
app.include_router(execute.router)


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "CodeVision AI API is running"}
