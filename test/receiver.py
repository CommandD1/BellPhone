import socket

sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
sock.bind(('', 4444))

print("Listening for UDP broadcast...")
while True:
    data, addr = sock.recvfrom(1024)
    print(f"Got packet from {addr}: {data.decode()}")