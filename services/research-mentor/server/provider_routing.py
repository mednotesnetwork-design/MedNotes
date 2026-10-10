"""Request-level failover; scientific evaluation is provider-pinned by default.

A fallback is owner-authorized only when all server environment settings exist.
Never fall back after scientific rejection, invalid JSON, or invalid credentials.
Each provider must complete the entire workflow with a fresh context.
"""
import copy, json, os
from urllib.parse import urlparse
from .contracts import MentorError, require
from .provider import Provider, NoRedirect
from .resilience import TrackedTransport
from urllib.request import build_opener


def configured_fallback():
    names = ('RM_FALLBACK_ENDPOINT', 'RM_FALLBACK_MODEL', 'RM_FALLBACK_API_KEY', 'RM_FALLBACK_SAMPLING_JSON')
    values = [os.environ.get(k, '').strip() for k in names]
    if not any(values): return None
    require(all(values), 'Fallback configuration incomplete', 'INVALID_CONFIG', 503)
    endpoint, model, key, sampling = values
    url = urlparse(endpoint)
    require(url.scheme == 'https' and bool(url.hostname) and not any((url.username, url.password, url.query, url.fragment)), 'Fallback requires an authorized HTTPS Chat Completions endpoint', 'INVALID_CONFIG', 503)
    require(not any(c in key for c in '\r\n'), 'Invalid fallback credential', 'INVALID_CONFIG', 503)
    try: params = json.loads(sampling)
    except ValueError: raise MentorError('INVALID_CONFIG', 'Invalid fallback sampling configuration', 503)
    require(isinstance(params, dict) and set(params) <= {'temperature','top_p','max_completion_tokens','reasoning_effort','seed'}, 'Invalid fallback sampling parameters', 'INVALID_CONFIG', 503)
    # Explicit, server-owned configuration; bypass Gemini discovery entirely.
    provider = Provider.__new__(Provider)
    provider.config = {'endpoint': endpoint, 'model': model, 'api_key': key, 'sampling_parameters': params, 'protocol': 'chat-completions-json'}
    provider.calls = []
    provider.opener = build_opener(NoRedirect())
    return provider


def run_request(primary, execute, *, allow_failover=False, fallback_factory=configured_fallback):
    """execute(provider) must use fresh input/state; persist only returned success."""
    provider = primary
    attempts = []
    for index in range(2 if allow_failover else 1):
        transport = TrackedTransport(provider.opener, provider.config['api_key'])
        provider.opener = transport
        try:
            result = execute(provider)
            result['transport_attempts'] = transport.attempts
            result['provider_routing'] = {'policy': 'failover_trial' if allow_failover else 'pinned', 'failover_used': index > 0, 'provider_identity': provider.identity(), 'prior_failures': attempts}
            return result
        except MentorError as error:
            # Last HTTP status must be transient. A successful call clears it.
            transient = error.code == 'PROVIDER_FAILURE' and transport.status in (502,503,504)
            if not transient: raise
            attempts.append({'model': provider.identity()['model'], 'http_status': transport.status, 'transport_attempts': transport.attempts})
            if allow_failover and index == 0:
                alternate = fallback_factory()
                if alternate is not None:
                    provider = alternate
                    continue
            raise MentorError('PROVIDER_UNAVAILABLE', 'Inference temporarily unavailable after bounded server retries. Resume later; configuration is already verified.', 503)
    raise MentorError('PROVIDER_UNAVAILABLE', 'Authorized providers unavailable.', 503)
