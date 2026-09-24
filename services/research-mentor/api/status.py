"""Deployment readiness only. Never returns or accepts provider credentials."""
import json, os
from http.server import BaseHTTPRequestHandler

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        body = json.dumps({
            'project': 'Research Mentor',
            'secret_configured': bool(os.environ.get('GEMINI_API_KEY', '').strip()),
            'connection_verified': False,
            'scientific_baseline': 'pending',
            'student_service': 'not_activated',
        }).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass
