"""Bounded server transport retries. No client-side keys or retry loops."""
import json, random, re, time
from urllib.error import HTTPError

class TrackedTransport:
    def __init__(self, inner, secret='', sleep=time.sleep, jitter=random.random):
        self.inner, self.secret = inner, secret
        self.sleep, self.jitter = sleep, jitter
        self.status = self.diagnostic = None
        self.attempts = 0

    def open(self, *args, **kwargs):
        for attempt in range(3):
            self.status = self.diagnostic = None
            self.attempts += 1
            try:
                return self.inner.open(*args, **kwargs)
            except HTTPError as error:
                self.status = error.code
                try:
                    detail = json.loads(error.read(12000)).get('error', {})
                    message = str(detail.get('message', ''))
                    if self.secret: message = message.replace(self.secret, '[redacted]')
                    message = re.sub(r'AIza[\w-]+', '[redacted]', message)
                    self.diagnostic = {'code': detail.get('code'), 'status': detail.get('status'), 'message': message[:1500]}
                except Exception:
                    self.diagnostic = {'status': 'UNPARSEABLE_PROVIDER_ERROR'}
                error.close()
                if error.code not in (502, 503, 504) or attempt == 2:
                    raise
                self.sleep(2 ** (attempt + 1) + self.jitter())
