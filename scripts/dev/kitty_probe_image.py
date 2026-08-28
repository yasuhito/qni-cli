import zlib, struct, base64, sys
w, h = 120, 40
raw = b"".join(b"\x00" + bytes([220, 40, 40, 255]) * w for _ in range(h))
def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw)) + chunk(b"IEND", b"")
b64 = base64.b64encode(png).decode()
sys.stdout.write("\x1b_Ga=T,f=100,q=2;" + b64 + "\x1b\\")
sys.stdout.write("\n<- ここに赤い長方形が見えていれば herdr は Kitty 画像を通しています\n")
