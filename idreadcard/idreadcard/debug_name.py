from smartcard.System import readers
from smartcard.scard import SCARD_PROTOCOL_T0

SELECT_APP = [0x00, 0xA4, 0x04, 0x00, 0x08,
              0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01]

r = readers()
conn = r[0].createConnection()
conn.connect(SCARD_PROTOCOL_T0)
conn.transmit(SELECT_APP)

# อ่าน 200 bytes จาก field 0x0011
resp, sw1, sw2 = conn.transmit([0x80, 0xB0, 0x00, 0x11, 0x02, 0x00, 0xC8])
if sw1 == 0x61:
    resp, sw1, sw2 = conn.transmit([0x00, 0xC0, 0x00, 0x00, sw2])

raw = bytes(resp)
print(f"SW: {sw1:02X} {sw2:02X}")
print(f"hex: {raw.hex()}")
print(f"decoded: {raw.decode('tis-620', errors='replace')!r}")

# แสดง byte ที่ไม่ใช่ null ทีละ byte
print("\nbyte-by-byte (non-null):")
for i, b in enumerate(raw):
    if b != 0:
        try:
            ch = bytes([b]).decode('tis-620')
        except Exception:
            ch = '?'
        print(f"  [{i:03d}] 0x{b:02X} = {ch!r}")
