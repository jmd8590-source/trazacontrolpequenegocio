import http.server
import socketserver

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

import os
import functools

if __name__ == '__main__':
    PORT = 8000
    web_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'public')
    handler = functools.partial(NoCacheHTTPRequestHandler, directory=web_dir)
    with socketserver.TCPServer(("", PORT), handler) as httpd:
        print(f"Serving '{web_dir}' at http://localhost:{PORT} with zero cache")
        httpd.serve_forever()
