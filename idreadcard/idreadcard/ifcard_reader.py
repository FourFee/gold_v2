from smartcard.System import readers
from smartcard.CardType import AnyCardType
from smartcard.CardRequest import CardRequest
from smartcard.scard import SCARD_PROTOCOL_T0
from pathlib import Path
import requests
import logging
import re
import time

BASE_DIR = Path(__file__).parent

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(BASE_DIR / "idcard.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger(__name__)

API_URL    = "http://178.128.80.147/api"
EP_SUBMIT  = "/idcard"
EP_CLEAR   = "/idcard/clear"

SELECT_APP = [0x00, 0xA4, 0x04, 0x00, 0x08,
              0xA0, 0x00, 0x00, 0x00, 0x54, 0x48, 0x00, 0x01]

TH_PREFIXES = [
    'พล.ต.อ.', 'พล.ต.ท.', 'พล.ต.ต.',
    'พ.ต.อ.(พิเศษ)', 'พ.ต.อ.', 'พ.ต.ท.', 'พ.ต.ต.',
    'ร.ต.อ.', 'ร.ต.ท.', 'ร.ต.ต.',
    'ส.ต.อ.', 'ส.ต.ท.', 'ส.ต.ต.', 'ด.ต.',
    'พล.อ.อ.', 'พล.อ.ท.', 'พล.อ.ต.',
    'พล.ร.อ.', 'พล.ร.ท.', 'พล.ร.ต.',
    'พล.อ.(พิเศษ)', 'พล.อ.', 'พล.ท.', 'พล.ต.',
    'พ.อ.(พิเศษ)', 'พ.อ.', 'พ.ท.', 'พ.ต.',
    'ร.อ.', 'ร.ท.', 'ร.ต.',
    'จ.ส.อ.', 'จ.ส.ท.', 'จ.ส.ต.',
    'จ.อ.', 'จ.ท.', 'จ.ต.',
    'ส.อ.', 'ส.ท.', 'ส.ต.',
    'น.อ.', 'น.ท.', 'น.ต.',
    'น.พ.', 'พ.ญ.', 'ม.ร.ว.', 'ม.ล.',
    'นางสาว', 'เด็กชาย', 'เด็กหญิง', 'น.ส.',
    'นาย', 'นาง',
]

_session = requests.Session()


def clean(text: str) -> str:
    text = text.replace('\x00', '').replace('\xff', '').replace('�', '')
    text = text.replace('#', ' ')
    return re.sub(r'\s+', ' ', text).strip()


def read_raw(conn, offset, length):
    p1 = (offset >> 8) & 0xFF
    p2 = offset & 0xFF
    resp, sw1, sw2 = conn.transmit([0x80, 0xB0, p1, p2, 0x02, 0x00, length])
    if sw1 == 0x61:
        resp, sw1, sw2 = conn.transmit([0x00, 0xC0, 0x00, 0x00, sw2])
    if sw1 != 0x90:
        log.warning(f"read_raw offset=0x{offset:04X} ล้มเหลว SW={sw1:02X}{sw2:02X}")
        return b""
    return bytes(resp)


def decode_field(raw: bytes, encoding="tis-620") -> str:
    return raw.decode(encoding, errors="replace")


def parse_name(raw: str) -> tuple[str, str]:
    parts = raw.split('#')
    parts = [p.strip() for p in parts]
    while len(parts) < 4:
        parts.append('')
    first_name = clean(parts[1])
    last_name  = clean(parts[3])
    if not first_name:
        full = clean(parts[0])
        for prefix in TH_PREFIXES:
            if full.startswith(prefix):
                first_name = full[len(prefix):].strip()
                break
    return first_name, last_name


def read_card(conn):
    _, sw1, sw2 = conn.transmit(SELECT_APP)
    if sw1 not in (0x90, 0x61):
        raise Exception(f"SELECT APP ไม่สำเร็จ: {sw1:02X}{sw2:02X}")

    cid_raw  = read_raw(conn, 0x0004, 13)
    name_raw = read_raw(conn, 0x0011, 200)

    addr_raw = b""
    for attempt in range(3):
        addr_raw = read_raw(conn, 0x1579, 100)
        if addr_raw:
            break
        log.warning(f"อ่านที่อยู่ไม่ได้ ลองใหม่ ({attempt + 1}/3)")
        if attempt < 2:
            time.sleep(0.3)

    citizen_id = decode_field(cid_raw, "ascii").strip()
    if len(citizen_id) != 13 or not citizen_id.isdigit():
        raise Exception(f"เลขบัตรไม่ถูกต้อง: {citizen_id!r}")

    first_name, last_name = parse_name(decode_field(name_raw[:100]))
    name_th  = f"{first_name} {last_name}".strip()
    address  = clean(decode_field(addr_raw))

    data = {"citizen_id": citizen_id, "name_th": name_th, "address": address}
    data.update(read_issue_info(conn))
    return data


def read_issue_info(conn) -> dict:
    """วันออกบัตร/วันหมดอายุ (YYYYMMDD พ.ศ., "99999999" = ตลอดชีพ) + หน่วยงานที่ออกบัตร — ใช้ในแบบ ปปง.
    อ่านไม่ได้ก็คืนค่าว่าง ไม่ให้กระทบการอ่านบัตรหลัก"""
    info = {"issue_date": "", "expire_date": "", "issuer": ""}
    try:
        dates_raw = read_raw(conn, 0x0167, 0x12)
        digits = re.sub(r"\D", "", decode_field(dates_raw[:16], "ascii"))
        if len(digits) == 16:
            info["issue_date"], info["expire_date"] = digits[:8], digits[8:]
        else:
            log.warning(f"วันออก/หมดอายุบัตรอ่านได้ไม่ครบ: {dates_raw.hex()}")
    except Exception as e:
        log.warning(f"อ่านวันออก/หมดอายุบัตรไม่ได้: {e}")
    try:
        info["issuer"] = clean(decode_field(read_raw(conn, 0x00F6, 0x64)))
    except Exception as e:
        log.warning(f"อ่านหน่วยงานที่ออกบัตรไม่ได้: {e}")
    return info


def send_to_api(endpoint: str, data: dict = None):
    for attempt in range(3):
        try:
            resp = _session.post(f"{API_URL}{endpoint}", json=data or {}, timeout=8)
            resp.raise_for_status()
            return
        except Exception as e:
            log.warning(f"ส่งไม่สำเร็จ ลองใหม่ ({attempt + 1}/3): {e}")
            if attempt == 2:
                raise
            time.sleep(1.5)


def monitor_loop():
    log.info("เริ่มระบบ — รอเสียบบัตร...")
    last_cid     = None
    card_request = CardRequest(timeout=1, cardType=AnyCardType())

    while True:
        try:
            if not readers():
                log.info("ไม่พบเครื่องอ่านบัตร — จบการทำงาน")
                break

            try:
                card_service = card_request.waitforcard()
            except Exception:
                if last_cid:
                    log.info("บัตรถูกถอด — ล้างข้อมูล")
                    try:
                        send_to_api(EP_CLEAR)
                    except Exception as e:
                        log.error(f"ล้างข้อมูลไม่สำเร็จ: {e}")
                    last_cid = None
                continue

            conn = card_service.connection
            conn.connect(SCARD_PROTOCOL_T0)
            try:
                data = read_card(conn)
            finally:
                conn.disconnect()

            if data["citizen_id"] == last_cid:
                continue

            last_cid = data["citizen_id"]
            log.info(f"อ่านบัตรสำเร็จ: {data}")
            send_to_api(EP_SUBMIT, data)
            log.info("ส่ง API สำเร็จ")

        except KeyboardInterrupt:
            log.info("หยุดระบบ")
            break
        except Exception as e:
            log.error(f"ผิดพลาด: {e}")
            time.sleep(2)


if __name__ == "__main__":
    monitor_loop()
