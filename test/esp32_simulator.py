import socket
import time

# Configuration
BROADCAST_IP = "255.255.255.255"  # Local network broadcast address
PORT = 4444                       # Must match the port your app listens on
MESSAGE = b"ESP32_ALERT"

# Create a UDP socket
sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)

print(f"[*] ESP32 Simulator started. Broadcasting to port {PORT} every 3 seconds...")
print("[*] Press Ctrl+C to stop.")

try:
    while True:
        sock.sendto(MESSAGE, (BROADCAST_IP, PORT))
        print(f"[>] Sent broadcast packet: {MESSAGE.decode()}")
        time.sleep(3.0)
except KeyboardInterrupt:
    print("\n[!] Simulator stopped.")
    sock.close()