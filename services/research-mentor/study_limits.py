"""Private-test admission guard. Gateway rate limit is the distributed limit.

This process-local guard reduces double submissions/concurrency, but does not
claim to be durable billing quota. A future plan store can implement this boundary.
"""
from collections import deque
from contextlib import contextmanager
from threading import Lock
import time
from v1server.contracts import MentorError

_lock=Lock()
_events=deque()
_active=0

@contextmanager
def admit_study():
    global _active
    now=time.monotonic()
    with _lock:
        while _events and _events[0]<=now-3600:_events.popleft()
        if _active>=2 or sum(t>now-60 for t in _events)>=6 or len(_events)>=30:
            raise MentorError('USAGE_LIMIT','Private study limit reached',429)
        _events.append(now);_active+=1
    try:yield
    finally:
        with _lock:_active-=1
