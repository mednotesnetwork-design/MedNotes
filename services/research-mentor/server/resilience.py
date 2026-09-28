"""Bounded server transport retries. No client-side keys or retry loops."""
import json, random, re, time
from urllib.error import HTTPError
from v1server.contracts import MentorError

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
                print(json.dumps({'event':'provider_http_error','http_status':self.status,'provider_status':self.diagnostic.get('status'),'attempt':self.attempts}),flush=True)
                if error.code not in (502, 503, 504) or attempt == 2:
                    if error.code in (429,502,503,504):
                        raise MentorError('PROVIDER_BUSY','Provider temporarily unavailable after bounded retries',429 if error.code==429 else 503)
                    raise
                self.sleep(2 ** (attempt + 1) + self.jitter())
