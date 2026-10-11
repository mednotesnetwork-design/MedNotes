"""MedNote Shared Intelligence API; isolated from existing AI engines."""
import json
import os
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from server.shared_learning import (LibraryError, lookup_lecture, media_for_concept,
                                    candidate_plans, publish_lecture, publish_media)

class handler(BaseHTTPRequestHandler):
    def reply(self, status, body):
        data=json.dumps(body,ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type","application/json; charset=utf-8")
        self.send_header("Cache-Control","private, no-store")
        self.send_header("X-Content-Type-Options","nosniff")
        self.end_headers()
        self.wfile.write(data)

    def allowed(self):
        origin=self.headers.get("Origin")
        if origin and urlparse(origin).netloc!=self.headers.get("Host"):
            raise LibraryError(403,"FORBIDDEN")
        if self.headers.get("Sec-Fetch-Site")=="cross-site":
            raise LibraryError(403,"FORBIDDEN")
        # Mirrors existing MedNote private preview restriction. Public student
        # access needs real account auth/tenant authorisation before rollout.
        # Vercel's protected preview enforces SSO before the function.
        # Browsers cannot prove identity via their own OIDC headers.
        # Shared access stays opt-in and disabled in production.
        if os.environ.get("VERCEL_ENV")!="preview" or os.environ.get("MEDNOTE_SHARED_LIBRARY_ACCESS")!="on":
            raise LibraryError(503,"SHARED_LIBRARY_PREVIEW_DISABLED")

    def execute(self, method):
        try:
            self.allowed()
            args=parse_qs(urlparse(self.path).query)
            action=(args.get("action") or [""])[0]
            if method=="GET":
                if action=="lecture":
                    return self.reply(200,lookup_lecture((args.get("digest_kind") or [""])[0],
                      (args.get("digest") or [""])[0],(args.get("scope") or ["uqu"])[0]))
                if action=="media":
                    return self.reply(200,media_for_concept((args.get("concept") or [""])[0]))
                if action=="plans":
                    return self.reply(200,candidate_plans())
                raise LibraryError(400,"INVALID_ACTION")
            if method!="POST":
                raise LibraryError(405,"METHOD_NOT_ALLOWED")
            if self.headers.get("Content-Type","").split(";")[0]!="application/json":
                raise LibraryError(400,"INVALID_REQUEST")
            n=int(self.headers.get("Content-Length","0"))
            if not 1<=n<=2_800_000:
                raise LibraryError(413,"REQUEST_TOO_LARGE")
            data=json.loads(self.rfile.read(n))
            if not isinstance(data,dict):
                raise LibraryError(400,"INVALID_REQUEST")
            if action=="publish_lecture":
                return self.reply(200,publish_lecture(data,self.headers.get("X-MedNote-Curator-Key","")))
            if action=="publish_media":
                return self.reply(200,publish_media(data,self.headers.get("X-MedNote-Curator-Key","")))
            raise LibraryError(400,"INVALID_ACTION")
        except LibraryError as error:
            return self.reply(error.status,{"error":error.code})
        except (ValueError,TypeError,KeyError):
            return self.reply(400,{"error":"INVALID_REQUEST"})
        except Exception as error:
            print(json.dumps({"event":"shared_library_error","type":type(error).__name__}),flush=True)
            return self.reply(503,{"error":"SHARED_LIBRARY_UNAVAILABLE"})

    def do_GET(self):self.execute("GET")
    def do_POST(self):self.execute("POST")
    def log_message(self,*args):pass
