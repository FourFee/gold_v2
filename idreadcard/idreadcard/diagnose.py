from smartcard.System import readers
from smartcard.scard import SCARD_SHARE_SHARED, SCARD_PROTOCOL_T0, SCARD_PROTOCOL_T1

r = readers()
print(f"พบเครื่องอ่าน {len(r)} ตัว: {r}")

if not r:
    print("ไม่มีเครื่องอ่าน")
    exit()

conn = r[0].createConnection()

for protocol_name, protocol in [("T0", SCARD_PROTOCOL_T0), ("T1", SCARD_PROTOCOL_T1)]:
    try:
        conn.connect(protocol)
        print(f"เชื่อมต่อสำเร็จด้วย protocol {protocol_name}")
        conn.disconnect()
        break
    except Exception as e:
        print(f"protocol {protocol_name} ไม่สำเร็จ: {e}")
