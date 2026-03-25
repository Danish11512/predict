"""Shared helpers. step_delay() uses config.latency_ms."""
import random

import config


def step_delay() -> None:
    """Sleep a random duration in [0, latency_ms/1000] s; no-op if latency_ms <= 0."""
    if config.latency_ms <= 0:
        return
    delay_s = random.uniform(0, config.latency_ms / 1000.0)
    if delay_s > 0:
        import time
        time.sleep(delay_s)
