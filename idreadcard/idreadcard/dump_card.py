from smartcard.System import readers
from smartcard.scard import SCARD_PROTOCOL_T0

SELECT_APP = [0x00, 0xA4, 0x04, 0x00, 0x08,
              0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01]

# offset -> (label, length, encoding)
FIELDS = {
    0x0011: ("citizen_id",   13,  "ascii"),
    0x001E: ("th_prefix",    40,  "tis-620"),
    0x0042: ("th_firstname", 100, "tis-620"),
    0x00A6: ("th_lastname",  100, "tis-620"),
    0x010A: ("en_prefix",    40,  "ascii"),
    0x012E: ("en_firstname", 100, "ascii"),
    0x0192: ("en_lastname",  100, "ascii"),
    0x01F6: ("dob",          8,   "ascii"),
    0x01FE: ("gender",       1,   "ascii"),
    0x01FF: ("issue_date",   8,   "ascii"),
    0x0207: ("expire_date",  8,   "ascii"),
    0x0267: ("address",      100, "tis-620"),
}

def get_response(conn, length):
    resp, sw1, sw2 = conn.transmit([0x00, 0xC0, 0x00, 0x00, length])
    return bytes(resp), sw1, sw2

def read_field(conn, offset, length):
    p1 = (offset >> 8) & 0xFF
    p2 = offset & 0xFF
    apdu = [0x80, 0xB0, p1, p2, 0x02, 0x00, length]
    resp, sw1, sw2 = conn.transmit(apdu)
    if sw1 == 0x61:
        return get_response(conn, sw2)
    return bytes(resp), sw1, sw2

r = readers()
conn = r[0].createConnection()
conn.connect(SCARD_PROTOCOL_T0)

_, sw1, _ = conn.transmit(SELECT_APP)
print(f"SELECT APP: {sw1:02X}\n")

for offset, (label, length, enc) in FIELDS.items():
    raw, sw1, sw2 = read_field(conn, offset, length)
    if sw1 == 0x90:
        text = raw.rstrip(b"\x00").decode(enc, errors="replace").strip()
        print(f"[{label}] {text}")
    else:
        print(f"[{label}] ERROR {sw1:02X}{sw2:02X} | raw: {raw.hex()}")
