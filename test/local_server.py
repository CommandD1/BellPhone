from http.server import BaseHTTPRequestHandler, HTTPServer


class SimpleHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        self.send_response(200)
        self.end_headers()
        print("[+] ESP32 / Test Signal Received!")
        self.wfile.write(b"OK")

# Bind to all interfaces on port 5000
server = HTTPServer(('0.0.0.0', 5000), SimpleHandler)
print("Local test server running on port 5000...")
server.serve_forever()