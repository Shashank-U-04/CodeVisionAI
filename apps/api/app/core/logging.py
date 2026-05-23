"""Centralised logger setup.

Stdlib `logging` configured once at import. Each tracer dispatches under a
named logger (`cvai.execute`, `cvai.native`, `cvai.java`) so deployment
log pipelines (Render's tail, journald, etc.) can filter cleanly.

The format is plain text by default; set CVAI_LOG_JSON=1 to emit single-line
JSON records that ingest cleanly into Loki / CloudWatch.
"""
from __future__ import annotations

import json
import logging
import os
import sys
from typing import Any


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "ts": self.formatTime(record, datefmt="%Y-%m-%dT%H:%M:%S"),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        # Anything passed via `extra=` lands on the record as attributes;
        # surface known keys without leaking framework internals.
        for key in (
            "session_id",
            "client_ip",
            "language",
            "duration_ms",
            "step_count",
            "outcome",
            "error",
        ):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False)


def configure_logging() -> None:
    root = logging.getLogger()
    if getattr(root, "_cvai_configured", False):
        return

    handler = logging.StreamHandler(sys.stdout)
    if os.environ.get("CVAI_LOG_JSON") == "1":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s %(levelname)s %(name)s — %(message)s",
                datefmt="%H:%M:%S",
            )
        )

    root.handlers = [handler]
    root.setLevel(os.environ.get("CVAI_LOG_LEVEL", "INFO").upper())
    setattr(root, "_cvai_configured", True)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
