from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import socket

router = APIRouter(prefix="/print", tags=["print"])

PRINTER_IP   = "192.168.1.100"
PRINTER_PORT = 9100

TYPE_LABEL = {
    "pawn":     "ใบรับจำนำ",
    "bar":      "ใบซื้อขายทองแท่ง",
    "ornament": "ใบซื้อขายทองรูปพรรณ",
    "redeem":   "ใบไถ่จำนำ",
}

# ESC/POS constants
INIT        = b"\x1b\x40"
LF          = b"\x0a"
CENTER      = b"\x1b\x61\x01"
LEFT        = b"\x1b\x61\x00"
BOLD_ON     = b"\x1b\x45\x01"
BOLD_OFF    = b"\x1b\x45\x00"
SIZE_2X     = b"\x1d\x21\x11"   # double width + height
SIZE_NORM   = b"\x1d\x21\x00"
CUT         = b"\x1d\x56\x41\x10"
TH_CODEPAGE = b"\x1b\x74\x15"   # TIS-620 (code page 21)

SEP = b"--------------------------------" + LF


def th(text: str) -> bytes:
    return text.encode("tis-620", errors="replace")


def fmt_money(n: float) -> str:
    return f"{n:,.2f}"


class PrintData(BaseModel):
    type: str
    shopName:  Optional[str]   = "ห้างทองจินดา"
    firstname: Optional[str]   = ""
    lastname:  Optional[str]   = ""
    idcard:    Optional[str]   = ""
    phone:     Optional[str]   = ""
    address:   Optional[str]   = ""
    weight:    Optional[float] = None
    amount:    Optional[float] = None
    goldType:  Optional[str]   = None
    purity:    Optional[str]   = None
    interest:  Optional[float] = None
    dueDate:   Optional[str]   = None
    remark:    Optional[str]   = ""


def build_escpos(data: PrintData) -> bytes:
    shop      = data.shopName or "ห้างทองจินดา"
    fullname  = f"{data.firstname or ''} {data.lastname or ''}".strip() or "-"
    type_lbl  = TYPE_LABEL.get(data.type, "ใบเสร็จ")

    buf = INIT + TH_CODEPAGE

    # ── ชื่อร้าน ──────────────────────────────
    buf += CENTER + BOLD_ON + SIZE_2X
    buf += th(shop) + LF
    buf += SIZE_NORM + BOLD_OFF
    buf += th(f"โทร 0x-xxxx-xxxx") + LF

    buf += SEP

    # ── ประเภทใบเสร็จ + วันที่ ─────────────────
    buf += CENTER + BOLD_ON
    buf += th(type_lbl) + LF
    buf += BOLD_OFF

    from datetime import datetime
    now = datetime.now().strftime("%d/%m/%Y %H:%M")
    buf += th(f"วันที่: {now}") + LF

    buf += SEP

    # ── ข้อมูลลูกค้า ───────────────────────────
    buf += LEFT
    buf += th(f"ชื่อ: {fullname}") + LF
    if data.idcard:
        buf += th(f"เลขบัตร: {data.idcard}") + LF
    if data.phone:
        buf += th(f"โทร: {data.phone}") + LF

    buf += SEP

    # ── รายการ ────────────────────────────────
    if data.goldType:
        buf += th(f"ประเภท: {data.goldType}") + LF
    if data.purity:
        buf += th(f"ความบริสุทธิ์: {data.purity}") + LF
    if data.weight is not None:
        buf += th(f"น้ำหนัก: {fmt_money(data.weight)} กรัม") + LF
    if data.amount is not None:
        buf += BOLD_ON
        buf += th(f"ยอดรวม: {fmt_money(data.amount)} บาท") + LF
        buf += BOLD_OFF
    if data.interest is not None:
        buf += th(f"ดอกเบี้ย/เดือน: {fmt_money(data.interest)} บาท") + LF
    if data.dueDate:
        buf += th(f"วันครบกำหนด: {data.dueDate}") + LF
    if data.remark:
        buf += th(f"หมายเหตุ: {data.remark}") + LF

    buf += SEP

    # ── ลายเซ็น ───────────────────────────────
    buf += LF
    buf += th("ลายเซ็นพนักงาน ............") + LF
    buf += LF
    buf += th("ลายเซ็นลูกค้า  ............") + LF

    buf += SEP

    # ── Footer ────────────────────────────────
    buf += CENTER
    buf += th("ขอบคุณที่ใช้บริการ") + LF
    buf += th(shop) + LF

    buf += LF + LF + LF
    buf += CUT

    return buf


@router.get("/check")
def check_printer():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(2)
            s.connect((PRINTER_IP, PRINTER_PORT))
        return {"online": True}
    except Exception:
        return {"online": False}


@router.post("/receipt")
def print_receipt(data: PrintData):
    try:
        raw = build_escpos(data)
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(5)
            s.connect((PRINTER_IP, PRINTER_PORT))
            s.sendall(raw)
        return {"ok": True}
    except Exception as e:
        return {"ok": False, "error": str(e)}
