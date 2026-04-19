# path: gold/backend/test_printer.py

from escpos.printer import Network, Usb
import time

# =======================================================
# 📌 CONFIG: แก้ไขส่วนนี้ให้ตรงกับเครื่องพิมพ์ของคุณ
# =======================================================

# --- A. สำหรับเครื่องพิมพ์ LAN/Network ---
PRINTER_TYPE = "NETWORK"
PRINTER_NETWORK_IP = "192.168.1.100"  # 👈 แก้เป็น IP เครื่องพิมพ์ของคุณ
PRINTER_NETWORK_PORT = 9100

# --- B. สำหรับเครื่องพิมพ์ USB ---
PRINTER_TYPE = "USB"
PRINTER_USB_VENDOR = 0x04b8  # ตัวอย่าง idVendor
PRINTER_USB_PRODUCT = 0x0202 # ตัวอย่าง idProduct

# =======================================================


def run_test_print():
    """ฟังก์ชันทดสอบการเชื่อมต่อและสั่งพิมพ์"""
    p = None
    try:
        if PRINTER_TYPE == "NETWORK":
            print(f"กำลังเชื่อมต่อ Network: {PRINTER_NETWORK_IP}:{PRINTER_NETWORK_PORT}...")
            p = Network(PRINTER_NETWORK_IP, port=PRINTER_NETWORK_PORT)
        elif PRINTER_TYPE == "USB":
            print(f"กำลังเชื่อมต่อ USB: Vendor={PRINTER_USB_VENDOR}, Product={PRINTER_USB_PRODUCT}...")
            p = Usb(PRINTER_USB_VENDOR, PRINTER_USB_PRODUCT)
        else:
            print("❌ กรุณากำหนด PRINTER_TYPE ให้เป็น 'NETWORK' หรือ 'USB'")
            return

        time.sleep(1) # รอการเชื่อมต่อ

        # ------------------- สั่งพิมพ์ -------------------
        p.set(align='center', double_height=True, double_width=True, bold=True)
        p.text("--- ทดสอบการพิมพ์ใบเสร็จ ---\n")
        p.set(align='left', double_height=False, double_width=False, bold=False)
        p.text("--------------------------------\n")
        p.text("การเชื่อมต่อสำเร็จ!\n")
        p.text("Backend Python สั่งพิมพ์ได้แล้ว\n")
        p.text("--------------------------------\n\n")
        p.cut()
        # ------------------------------------------------

        p.close()
        print("✅ สั่งพิมพ์สำเร็จ! (ตรวจสอบเครื่องพิมพ์)")

    except Exception as e:
        print(f"❌ เกิดข้อผิดพลาดในการเชื่อมต่อ/สั่งพิมพ์: {e}")
        print("--- คำแนะนำ ---")
        print("1. ตรวจสอบ IP/Port หรือ Vendor/Product ID ว่าถูกต้องหรือไม่")
        print("2. ตรวจสอบว่าเครื่องพิมพ์เปิดอยู่และเชื่อมต่อกับ Network/USB แล้ว")
        if p:
            p.close() # ปิดการเชื่อมต่อหากมีการเปิดไว้
        

if __name__ == "__main__":
    run_test_print()