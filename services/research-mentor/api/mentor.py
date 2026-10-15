"""Authenticated hosted evaluation adapter. Reuses the untouched research engine.

Student project persistence remains in the original backend; this route is an
isolated evaluation surface and does not pretend to persist student projects.
"""
import hashlib, hmac, json, re, time, random
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request
from access_policy import TOKEN_SHA256, EXPIRES_AT
from server.provider import Provider
from server.engine import Engine
from server.resilience import TrackedTransport
from server.provider_routing import run_request
from copy import deepcopy
from server.contracts import MentorError, empty_state, validate_patch, require, string

class handler(BaseHTTPRequestHandler):
    def reply(self, code, data):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        auth = self.headers.get('Authorization', '')
        if not auth.startswith('Bearer ') or not hmac.compare_digest(hashlib.sha256(auth[7:].encode()).hexdigest(), TOKEN_SHA256):
            return self.reply(401, {'error': 'UNAUTHORIZED'})
        if datetime.now(timezone.utc) >= datetime.fromisoformat(EXPIRES_AT):
            return self.reply(410, {'error': 'PROGRAM_CLOSED'})
        transport = None
        try:
            length = int(self.headers.get('Content-Length', '0'))
            require(0 < length <= 100000, 'Invalid request size')
            require(self.headers.get('Content-Type', '').split(';')[0] == 'application/json', 'JSON required')
            data = json.loads(self.rfile.read(length))
            require(isinstance(data, dict) and data.get('evaluation') is True, 'Evaluation-only endpoint')
            provider = Provider(Path('/nonexistent-research-mentor-config/inference.json'))
            require(provider.available, 'Server key unavailable', 'INFERENCE_NOT_CONFIGURED', 503)
            if data.get('action') == 'diagnose':
                transport = TrackedTransport(provider.opener, provider.config['api_key'])
                url = 'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'
                try:
                    with transport.open(Request(url, headers={'x-goog-api-key': provider.config['api_key']}), timeout=50) as result:
                        models = json.load(result).get('models', [])
                    return self.reply(200, {'configured_model': provider.config['model'], 'models': [m.get('name') for m in models if 'generateContent' in m.get('supportedGenerationMethods', [])]})
                except HTTPError:
                    return self.reply(502, {'provider_http_status': transport.status, 'provider_diagnostic': transport.diagnostic})
            text = string(data.get('input'), 'input')
            mode = data.get('mode', 'mentor')
            require(mode in ('mentor', 'translate', 'appraise', 'coach', 'claim'), 'Invalid mode')
            state = empty_state()
            state.update(validate_patch(data.get('research_state', {})))
            level = data.get('student_level', 'medical_student')
            require(level in ('beginner', 'medical_student', 'advanced_student', 'researcher'), 'Invalid student level')
            state['student_level'] = level
            require(data.get('conversation', []) == [], 'Each evaluation starts fresh')
            policy = data.get('provider_policy', 'pinned')
            require(policy in ('pinned', 'failover_trial'), 'Invalid provider policy')
            response = run_request(provider, lambda p: Engine(p).answer(text, deepcopy(state), [], mode=mode, papers=[]), allow_failover=policy == 'failover_trial')
            response['execution_environment'] = 'vercel-server-python'
            response['connection_verified'] = True
            response['project_persistence'] = 'evaluation_isolated'
            self.reply(200, response)
        except MentorError as error:
            self.reply(error.status, {'error': error.code, 'message': error.message,
                                     'provider_http_status': transport.status if transport else None,
                                     'provider_diagnostic': transport.diagnostic if transport else None})
        except (ValueError, TypeError, json.JSONDecodeError):
            self.reply(400, {'error': 'INVALID_REQUEST'})
        except Exception:
            self.reply(500, {'error': 'INTERNAL_ERROR'})

    def do_GET(self):
        self.reply(405, {'error': 'METHOD_NOT_ALLOWED'})

    def log_message(self, *args):
        pass
