#!/usr/bin/env python3
"""Локальный сервер, повторяющий поведение .htaccess: gzip, Cache-Control, 404.html.
   python3 tools/serve.py <папка> [порт]"""
import gzip, http.server, mimetypes, os, re, sys
ROOT = os.path.abspath(sys.argv[1]); PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8080
mimetypes.add_type("application/manifest+json", ".webmanifest"); mimetypes.add_type("font/woff2", ".woff2")
mimetypes.add_type("image/webp", ".webp"); mimetypes.add_type("image/avif", ".avif"); mimetypes.add_type("application/epub+zip", ".epub")
GZ = re.compile(r"\.(html|css|js|json|txt|xml|svg|webmanifest)$")
IMM = re.compile(r"-[0-9a-f]{8,12}\.(js|css|json|epub|txt|woff2)$")
CSP = ("default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
       "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; "
       "frame-ancestors 'self' https://vsplanet.net https://*.vsplanet.net")
class H(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"
    def log_message(self, *a): pass
    def do_HEAD(self): self.do_GET(head=True)
    def do_GET(self, head=False):
        path = self.path.split("?")[0].split("#")[0]
        m = re.fullmatch(r"/(.*/)?index\.html", path)
        if m:
            self.send_response(301); self.send_header("Location", "/" + (m.group(1) or "")); self.send_header("Content-Length", "0"); self.end_headers(); return
        fs = os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
        status = 200
        if not fs.startswith(ROOT): fs = ""
        if os.path.isdir(fs):
            if not path.endswith("/"):
                self.send_response(301); self.send_header("Location", path + "/"); self.send_header("Content-Length", "0"); self.end_headers(); return
            fs = os.path.join(fs, "index.html")
        if not os.path.isfile(fs):       # как Cloudflare not_found_handling=404-page: ближайший 404.html выше по пути
            status, d = 404, os.path.join(ROOT, os.path.dirname(path.lstrip("/")))
            while not os.path.isfile(os.path.join(d, "404.html")) and len(d) > len(ROOT): d = os.path.dirname(d)
            fs = os.path.join(d, "404.html")
            if not os.path.isfile(fs):
                self.send_response(404); self.send_header("Content-Length", "0"); self.end_headers(); return
        data = open(fs, "rb").read(); name = os.path.basename(fs)
        self.send_response(status)
        ctype = mimetypes.guess_type(fs)[0] or "application/octet-stream"
        if ctype.startswith("text/") or ctype in ("application/javascript", "application/json", "application/manifest+json"): ctype += "; charset=utf-8"
        self.send_header("Content-Type", ctype)
        if GZ.search(name) and "gzip" in self.headers.get("Accept-Encoding", ""):
            data = gzip.compress(data, 6); self.send_header("Content-Encoding", "gzip")
        cc = "no-cache"
        if IMM.search(name): cc = "public, max-age=31536000, immutable"
        elif re.search(r"\.(webp|avif|jpg|jpeg|png|svg)$", name): cc = "public, max-age=2592000"
        self.send_header("Cache-Control", cc); self.send_header("X-Content-Type-Options", "nosniff")
        if os.path.exists(os.path.join(ROOT, ".htaccess")) and "Content-Security-Policy" in open(os.path.join(ROOT, ".htaccess"), encoding="utf-8").read(): self.send_header("Content-Security-Policy", CSP)
        self.send_header("Content-Length", str(len(data))); self.end_headers()
        if not head: self.wfile.write(data)
http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()
