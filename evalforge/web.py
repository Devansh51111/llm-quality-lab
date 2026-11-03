"""Read-only localhost dashboard. No mutations or remote resources."""
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from .store import list_runs


def serve(db, port):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path == '/api/runs':
                content = json.dumps(list_runs(db), ensure_ascii=False).encode()
                mime = 'application/json; charset=utf-8'
            elif self.path == '/':
                content = Path(__file__).with_name('dashboard.html').read_bytes()
                mime = 'text/html; charset=utf-8'
            else:
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'")
            self.end_headers()
            self.wfile.write(content)
    print(f'LLM QualityLab dashboard: http://127.0.0.1:{port} (Ctrl+C to stop)', flush=True)
    ThreadingHTTPServer(('127.0.0.1', port), Handler).serve_forever()
