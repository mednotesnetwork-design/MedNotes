"""Private study provider boundary. Gemini via Cloudflare only; no automatic fallback."""
import json
import os
import re
import socket
import time
import uuid
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import build_opener
from v1server.provider import Provider, NoRedirect
from v1server.contracts import MentorError, require
from study_limits import admit_study

DEFAULT_MODEL = 'gemini-3.1-flash-lite'

class CloudflareTransport:
    """Gateway owns retries; the application never multiplies attempts."""
    def __init__(self, inner, deadline, token, request_id, module):
        self.inner, self.deadline, self.token = inner, deadline, token
        self.request_id, self.module, self.attempts = request_id, module, 0

    def open(self, request, **kwargs):
        remaining = self.deadline - time.monotonic()
        require(remaining > 5, 'Study deadline reached', 'STUDY_TIMEOUT', 504)
        self.attempts += 1
        require(self.attempts <= 8, 'Call budget exceeded', 'USAGE_LIMIT', 429)
        if not request.get_header('X-goog-api-key'):request.remove_header('X-goog-api-key')
        request.add_header('cf-aig-authorization', 'Bearer ' + self.token)
        request.add_header('cf-aig-max-attempts', '2')
        request.add_header('cf-aig-retry-delay', '700')
        request.add_header('cf-aig-backoff', 'exponential')
        request.add_header('cf-aig-request-timeout', str(int(min(25000, (remaining - 2) * 500))))
        request.add_header('cf-aig-skip-cache', 'true')
        # No student text, identifiers, keys or slide data in metadata/runtime logs.
        request.add_header('cf-aig-metadata', json.dumps({'request_id': self.request_id, 'module': self.module}))
        kwargs['timeout'] = min(58, remaining)
        start = time.monotonic()
        try:
            response = self.inner.open(request, **kwargs)
            print(json.dumps({'event': 'study_provider_call', 'request_id': self.request_id,
                              'module': self.module, 'status': 200, 'call': self.attempts,
                              'latency_ms': round((time.monotonic()-start)*1000)}), flush=True)
            return response
        except HTTPError as error:
            status = error.code
            diagnostics = {}
            try:
                body = json.loads(error.read(16384))
                entries = body.get('errors', []) if isinstance(body, dict) else []
                if isinstance(body, dict) and isinstance(body.get('error'), dict):entries = [body['error']]
                codes = [entry.get('code') for entry in entries if isinstance(entry, dict)]
                diagnostics['upstream_codes'] = [c for c in codes if isinstance(c, int)]
                statuses = [entry.get('status') for entry in entries if isinstance(entry, dict)]
                diagnostics['upstream_statuses'] = [v for v in statuses if v in ('PERMISSION_DENIED','UNAUTHENTICATED','NOT_FOUND','INVALID_ARGUMENT','RESOURCE_EXHAUSTED')]
                messages = ' '.join(str(entry.get('message', '')) for entry in entries if isinstance(entry, dict)).lower()
                # Only categorical diagnostics; never echo upstream content or credentials.
                diagnostics['signals'] = [label for label, phrase in (
                    ('authentication_error','authentication error'), ('invalid_token','invalid token'),
                    ('invalid_api_key','api key not valid'), ('permission_denied','permission denied'),
                    ('gateway_not_found','gateway not found'), ('account_not_found','account not found'),
                    ('missing_provider_key','no provider key'), ('api_disabled','has not been used'),
                    ('key_blocked','api key was reported as leaked'), ('expired_token','expired'),
                    ('invalid_cf_authorization','invalid cf-aig-authorization'),
                    ('unauthorized','unauthorized'), ('forbidden','forbidden')) if phrase in messages]
            except (ValueError, TypeError, AttributeError):pass
            finally:error.close()
            print(json.dumps({'event': 'study_provider_error', 'request_id': self.request_id,
                              'module': self.module, 'status': status, 'call': self.attempts, **diagnostics}), flush=True)
            if status == 429: raise MentorError('USAGE_LIMIT', 'Rate limit reached', 429)
            if status in (408, 504): raise MentorError('STUDY_TIMEOUT', 'Provider timeout', 504)
            if status in (401, 403): raise MentorError('STUDY_CONFIGURATION_REQUIRED', 'Server authentication failed', 503)
            if status in (500, 502, 503): raise MentorError('PROVIDER_BUSY', 'Provider temporarily unavailable', 503)
            raise MentorError('PROVIDER_FAILURE', 'Provider rejected the request', 502)
        except (URLError, TimeoutError, socket.timeout):
            print(json.dumps({'event': 'study_provider_timeout', 'request_id': self.request_id, 'module': self.module}), flush=True)
            raise MentorError('STUDY_TIMEOUT', 'Provider connection timeout', 504)


def cloudflare_provider(deadline, request_id, module):
    account = os.environ.get('CLOUDFLARE_ACCOUNT_ID', '').strip()
    gateway = os.environ.get('CLOUDFLARE_AI_GATEWAY_ID', '').strip()
    token = os.environ.get('CLOUDFLARE_AI_GATEWAY_TOKEN', '').strip()
    require(bool(re.fullmatch(r'[a-fA-F0-9]{32}', account)) and
            bool(re.fullmatch(r'[a-zA-Z0-9_-]{1,64}', gateway)) and
            bool(token) and not any(c.isspace() for c in token),
            'Cloudflare configuration missing or invalid', 'STUDY_CONFIGURATION_REQUIRED', 503)
    provider = Provider(Path('/nonexistent-research-mentor-config/inference.json'))
    # Reuse Gemini key stored in Cloudflare Provider Keys when no local key exists.
    # Cloudflare gateway must have byok_only enabled; no Unified Billing fallback.
    if not provider.available:provider.config={'api_key':''}
    model = os.environ.get('MEDNOTE_GEMINI_MODEL', DEFAULT_MODEL).strip()
    require(bool(re.fullmatch(r'gemini-[a-zA-Z0-9.-]+', model)), 'Invalid model', 'STUDY_CONFIGURATION_REQUIRED', 503)
    provider.config.update(endpoint=f'https://gateway.ai.cloudflare.com/v1/{account}/{gateway}/google-ai-studio/v1beta/models/{model}:generateContent',
                           model=model, protocol='gemini-generate-content',
                           sampling_parameters={'max_completion_tokens': 6144, 'reasoning_effort': 'low'})
    provider.opener = CloudflareTransport(build_opener(NoRedirect()), deadline, token, request_id, module)
    return provider


def run_study(headers, execute, *, module='research', provider_factory=None):
    """Provider factory is the extension point for future routing; none is enabled."""
    request_id = uuid.uuid4().hex
    started = time.monotonic()
    try:
        provider = (provider_factory or cloudflare_provider)(started+240, request_id, module)
        with admit_study():
            result = execute(provider)
        print(json.dumps({'event': 'study_completed', 'request_id': request_id, 'module': module,
                          'route': 'cloudflare-gemini', 'model': provider.config['model'],
                          'calls': len(provider.calls), 'latency_ms': round((time.monotonic()-started)*1000)}), flush=True)
        result['request_id'] = request_id
        return result
    except MentorError as error:
        print(json.dumps({'event': 'study_failed', 'request_id': request_id, 'module': module,
                          'code': error.code, 'status': error.status}), flush=True)
        raise
