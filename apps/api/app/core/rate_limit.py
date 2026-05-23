"""Per-client token-bucket rate limiter.

In-process, single-replica only. The deployed app runs as a single Render
service so this is enough; if we ever go horizontal we swap to Redis.

Buckets are keyed by client IP (X-Forwarded-For if present, else
request.client.host). Each bucket refills at `rate_per_sec` up to
`capacity` tokens; a request costs 1 token. On exhaustion the dispatcher
raises HTTPException(429).
"""
from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException, Request


@dataclass
class _Bucket:
    tokens: float
    last_refill: float


class TokenBucketLimiter:
    def __init__(self, capacity: int = 20, refill_per_min: int = 30) -> None:
        self.capacity = float(capacity)
        self.rate_per_sec = refill_per_min / 60.0
        self._buckets: dict[str, _Bucket] = {}
        self._lock = threading.Lock()

    def acquire(self, key: str, cost: float = 1.0) -> bool:
        now = time.monotonic()
        with self._lock:
            bucket = self._buckets.get(key)
            if bucket is None:
                bucket = _Bucket(tokens=self.capacity, last_refill=now)
                self._buckets[key] = bucket
            else:
                elapsed = now - bucket.last_refill
                bucket.tokens = min(
                    self.capacity, bucket.tokens + elapsed * self.rate_per_sec
                )
                bucket.last_refill = now
            if bucket.tokens >= cost:
                bucket.tokens -= cost
                return True
            return False

    def reset(self) -> None:
        with self._lock:
            self._buckets.clear()


# 20 concurrent burst, refilling at 30/min ≈ 1 every 2s — enough for
# normal classroom use; a runaway client gets 429 after ~20 fast posts.
execute_limiter = TokenBucketLimiter(capacity=20, refill_per_min=30)


def client_ip(request: Request) -> str:
    """Best-effort client IP, trusting X-Forwarded-For from a single proxy."""
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    if request.client is not None:
        return request.client.host
    return "unknown"


def enforce(limiter: TokenBucketLimiter, request: Request) -> str:
    """Raise HTTPException 429 if the request's IP is over budget; else return the IP."""
    ip = client_ip(request)
    if not limiter.acquire(ip):
        raise HTTPException(status_code=429, detail="Too many execution requests")
    return ip
