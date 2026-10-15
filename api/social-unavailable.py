import json
from http.server import BaseHTTPRequestHandler
class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(503);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(json.dumps({'error':'ORIGINAL_SOCIAL_BACKEND_NOT_INCLUDED_IN_EXPORT'}).encode())
    do_POST=do_GET
    do_PATCH=do_GET
    do_DELETE=do_GET
