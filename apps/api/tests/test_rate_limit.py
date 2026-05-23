"""Token-bucket rate limiter unit tests."""
from __future__ import annotations

import time

from app.core.rate_limit import TokenBucketLimiter


def test_initial_burst_uses_full_capacity():
    lim = TokenBucketLimiter(capacity=5, refill_per_min=60)
    granted = [lim.acquire("ip-a") for _ in range(5)]
    assert granted == [True] * 5
    # 6th should fail with no time elapsed
    assert lim.acquire("ip-a") is False


def test_refill_recovers_tokens_over_time():
    lim = TokenBucketLimiter(capacity=2, refill_per_min=600)  # 10/s
    assert lim.acquire("ip-b") is True
    assert lim.acquire("ip-b") is True
    assert lim.acquire("ip-b") is False
    time.sleep(0.25)  # ~2.5 tokens should refill
    assert lim.acquire("ip-b") is True


def test_buckets_are_independent_per_key():
    lim = TokenBucketLimiter(capacity=1, refill_per_min=1)
    assert lim.acquire("ip-c") is True
    assert lim.acquire("ip-c") is False
    # Different key still has its own bucket
    assert lim.acquire("ip-d") is True


def test_reset_clears_all_buckets():
    lim = TokenBucketLimiter(capacity=1, refill_per_min=1)
    assert lim.acquire("ip-e") is True
    assert lim.acquire("ip-e") is False
    lim.reset()
    assert lim.acquire("ip-e") is True
